export function isAuthenticated(req, res, next) {
  const sub = req.get('x-mock-user-id') || req.session?.userId;
  if (!sub) return res.status(401).json({ message: 'Auth required' });
  req.user = { sub };
  next();
}
export function requireAdmin(req, res, next) {
  if (!req.session?.adminUser) return res.status(401).json({ message: 'Admin authentication required' });
  next();
}
