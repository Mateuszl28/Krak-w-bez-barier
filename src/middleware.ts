import { NextResponse, type NextRequest } from "next/server";

// 1) Panel moderacji chroniony hasłem (Basic Auth); bez ADMIN_PASSWORD wyłączony.
// 2) Limit zapytań do publicznego API (ochrona przed zalewaniem), bez zapisywania adresów IP.

const API_LIMIT_PER_MIN = 300;
const hits = new Map<string, { count: number; reset: number }>();

/** Porównanie w stałym czasie — nie zdradza długości zgodnego prefiksu hasła. */
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function rateLimited(req: NextRequest): boolean {
  const who = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const entry = hits.get(who);
  if (!entry || entry.reset < now) {
    hits.set(who, { count: 1, reset: now + 60_000 });
    if (hits.size > 10_000) hits.clear();
    return false;
  }
  entry.count++;
  return entry.count > API_LIMIT_PER_MIN;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/v1/")) {
    if (rateLimited(req)) {
      return NextResponse.json(
        { error: "Zbyt wiele zapytań. Spróbuj za minutę." },
        { status: 429, headers: { "retry-after": "60" } },
      );
    }
    return NextResponse.next();
  }

  const password = process.env.ADMIN_PASSWORD;
  if (!password) return new NextResponse("Not found", { status: 404 });
  const [scheme, encoded] = (req.headers.get("authorization") ?? "").split(" ");
  if (scheme === "Basic" && encoded) {
    let pass = "";
    try {
      pass = atob(encoded).split(":").slice(1).join(":");
    } catch {
      // niepoprawne kodowanie — traktujemy jak złe hasło
    }
    if (safeEqual(pass, password)) return NextResponse.next();
  }
  return new NextResponse("Wymagane logowanie", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Moderacja", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/moderacja/:path*", "/api/moderacja/:path*", "/api/v1/:path*"] };
