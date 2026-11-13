/**
 * Return the canonical destination for the legacy home.html URL.
 * Keep the original origin and query string, matching the previous
 * NextRequest.nextUrl.clone() behaviour.
 */
export function homeRedirectUrl(requestUrl: string): URL | null {
  const destination = new URL(requestUrl);
  if (destination.pathname !== "/home.html") return null;
  destination.pathname = "/";
  return destination;
}
