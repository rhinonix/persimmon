export default async (request, context) => {
  const url = new URL(request.url);
  
  // Allow auth pages and assets to load without authentication
  const allowedPaths = [
    '/auth/',
    '/assets/',
    '/favicon.ico'
  ];
  
  const isAllowedPath = allowedPaths.some(path => url.pathname.startsWith(path));
  
  if (isAllowedPath) {
    return await context.next();
  }
  
  // Check if user is authenticated via Netlify Identity
  const authHeader = request.headers.get('authorization') || '';
  const user = context.cookies.get('nf_jwt');
  
  if (!user && !authHeader.includes('Bearer')) {
    // Redirect to login if not authenticated
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/auth/login.html'
      }
    });
  }
  
  // User is authenticated, continue to the requested page
  return await context.next();
};
