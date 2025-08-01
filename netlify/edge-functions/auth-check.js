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

  // Check if user is authenticated via Auth0
  const authHeader = request.headers.get("authorization") || "";
  const cookies = request.headers.get("cookie") || "";

  // Look for Auth0 session cookies or JWT token
  const hasAuth0Session =
    cookies.includes("auth0") || authHeader.includes("Bearer");

  if (!hasAuth0Session) {
    // Redirect to login if not authenticated
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/auth/login.html",
      },
    });
  }

  // User appears to be authenticated, continue to the requested page
  return await context.next();
};
