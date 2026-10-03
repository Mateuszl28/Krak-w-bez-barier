// Zapytania do Overpass API z listą zapasowych serwerów (publiczne instancje bywają przeciążone).
export const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

export async function overpass<T>(query: string, timeoutMs = 200_000): Promise<{ data: T; endpoint: string }> {
  let last: unknown;
  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          accept: "application/json",
          "user-agent": "dostepnik/0.1 (hackathon prototype)",
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!text.trimStart().startsWith("{")) throw new Error("odpowiedź nie jest JSON-em");
      const data = JSON.parse(text) as T & { remark?: string };
      if (data.remark?.includes("error")) throw new Error(data.remark);
      return { data, endpoint: url };
    } catch (err) {
      console.warn(`  ${url}: ${(err as Error).message}`);
      last = err;
    }
  }
  throw last instanceof Error ? last : new Error("Overpass niedostępny");
}
