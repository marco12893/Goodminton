import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

function isProtectedRoute(pathname) {
  return (
    pathname === "/" ||
    pathname.startsWith("/clubs") ||
    pathname.startsWith("/join-club") ||
    pathname.startsWith("/profile")
  );
}

function isAuthRoute(pathname) {
  return pathname === "/login" || pathname === "/register";
}

export async function middleware(request) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedRoute(pathname) && !isAuthRoute(pathname)) {
    return NextResponse.next({
      request,
    });
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedRoute(pathname) && !user) {
    const loginUrl = new URL("/login", request.url);
    const nextPath = `${pathname}${search || ""}`;
    if (nextPath && nextPath !== "/") {
      loginUrl.searchParams.set("next", nextPath);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute(pathname) && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/clubs/:path*",
    "/join-club/:path*",
    "/profile/:path*",
    "/login",
    "/register",
  ],
};
