import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { homeRedirectUrl } from "./lib/home-redirect";

export function proxy(request: NextRequest) {
  const destination = homeRedirectUrl(request.url);
  if (destination) return NextResponse.redirect(destination, 308);
}

export const config = { matcher: ["/home.html"] };
