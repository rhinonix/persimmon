export default async (request, context) => {
  const url = new URL(request.url);

  // Allow auth pages and assets to load without authentication
  const allowedPaths = ["/auth/", "/assets/", "/favicon.ico", "/_netlify/"];

  const isAllowedPath = allowedPaths.some((path) =>
    url.pathname.startsWith(path)
  );

  if (isAllowedPath) {
    return await context.next();
  }

  // Check if user is authenticated via Supabase
  const cookies = request.headers.get("cookie") || "";

  // Look for the Supabase auth token cookie.
  // The cookie name is typically `sb-<project-ref>-auth-token`.
  // A simple check for a cookie starting with "sb-" is sufficient here.
  const hasSupabaseSession = cookies.includes("sb-");

  if (!hasSupabaseSession) {
    // Redirect to login if not authenticated
    return Response.redirect(new URL("/auth/login.html", request.url));
  }

  // User appears to be authenticated, continue to the requested page
  return await context.next();
};
