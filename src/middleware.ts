import { NextResponse, type NextRequest } from "next/server";

// Panel moderacji chroniony hasłem (Basic Auth). Bez ADMIN_PASSWORD panel jest wyłączony.
export function middleware(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return new NextResponse("Not found", { status: 404 });
  const auth = req.headers.get("authorization") ?? "";
  const [scheme, encoded] = auth.split(" ");
  if (scheme === "Basic" && encoded) {
    const [, pass] = atob(encoded).split(":");
    if (pass === password) return NextResponse.next();
  }
  return new NextResponse("Wymagane logowanie", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Moderacja", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/moderacja/:path*", "/api/moderacja/:path*"] };
