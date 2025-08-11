import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default async (request, context) => {
  const url = new URL(request.url);

  // Define public paths that do not require authentication.
  const publicPaths = [
    "/auth/login.html",
    "/auth/signup.html",
    "/auth/forgot-password.html",
    "/auth/update-password.html",
    "/assets/",
    "/favicon.ico",
  ];

  // Check if the requested path is public.
  const pathname = url.pathname;
  const isPublicPath = publicPaths.some((publicPath) => {
    // Check for directory prefix match (e.g., /assets/)
    if (publicPath.endsWith('/') && pathname.startsWith(publicPath)) {
      return true;
    }
    // Check for exact file match or pretty URL match (e.g., /auth/login or /auth/login.html)
    if (pathname === publicPath || pathname === publicPath.replace(/\.html$/, '')) {
      return true;
    }
    return false;
  });

  // Allow access to public paths.
  if (isPublicPath) {
    return await context.next();
  }

  // Get the Supabase auth token from the cookies.
  const supabaseToken = context.cookies.get("sb-access-token");

  // If there's no token, the user is not logged in. Redirect to the login page.
  if (!supabaseToken) {
    const redirectUrl = new URL("/auth/login.html", request.url);
    return Response.redirect(redirectUrl);
  }

  // If there is a token, we need to verify it with Supabase to ensure it's valid.
  // This requires your Supabase URL and Anon Key.
  // IMPORTANT: Set these as environment variables in your Netlify project.
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL or Anon Key not set in environment variables.");
    // In case of misconfiguration, deny access.
    return new Response("Server configuration error.", { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${supabaseToken}` },
      },
    });

    // Fetch the user from Supabase. If it returns a user, the token is valid.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Token is valid, allow the request to proceed.
      return await context.next();
    }
  } catch (error) {
    console.error("Error verifying Supabase token:", error);
  }

  // If the token is invalid or verification fails, redirect to login.
  const redirectUrl = new URL("/auth/login.html", request.url);
  return Response.redirect(redirectUrl);
};
