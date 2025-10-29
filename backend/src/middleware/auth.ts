import { Request, Response, NextFunction } from 'express';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    username?: string;
    role?: string;
    clientId?: number;
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Require super_admin role (WeTechForU only)
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.session.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};

// Require admin role (Client admin or WeTechForU admin)
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.session.role !== 'super_admin' && req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Require super_admin OR admin (for their own client)
export const requireAdminOrOwnClient = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Super admin can access everything
  if (req.session.role === 'super_admin') {
    return next();
  }
  
  // Admin can only access their own client
  if (req.session.role === 'admin') {
    const clientId = parseInt(req.params.clientId || req.body.clientId || req.query.clientId as string);
    if (req.session.clientId && req.session.clientId === clientId) {
      return next();
    }
    return res.status(403).json({ error: 'You can only manage your own client' });
  }
  
  return res.status(403).json({ error: 'Admin access required' });
};
