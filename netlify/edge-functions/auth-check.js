import { createServerClient } from "npm:@supabase/ssr";

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
    if (publicPath.endsWith("/") && pathname.startsWith(publicPath)) {
      return true;
    }
    if (
      pathname === publicPath ||
      pathname === publicPath.replace(/\.html$/, "")
    ) {
      return true;
    }
    return false;
  });

  if (isPublicPath) {
    return await context.next();
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL or Anon Key not set in environment variables.");
    return new Response("Server configuration error.", { status: 500 });
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(key) {
          const cookies = context.cookies.getAll();
          const cookie = cookies.find((c) => c.name === key);
          return cookie ? cookie.value : undefined;
        },
        set(key, value, options) {
          context.cookies.set({ name: key, value, ...options });
        },
        remove(key, options) {
          context.cookies.set({ name: key, value: "", ...options });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // User is authenticated, allow the request to proceed.
      return await context.next();
    }
  } catch (error) {
    console.error("Error in Supabase auth check:", error);
    // Fall through to redirect on any error.
  }

  // If no user or an error occurs, redirect to the login page.
  const redirectUrl = new URL("/auth/login.html", request.url);
  return Response.redirect(redirectUrl);
};
