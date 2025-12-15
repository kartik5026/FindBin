import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { SECRET_KEY } from '../config/env';

export type AuthUser = {
  id: string;
  email?: string;
  role?: string;
  userName?: string;
};

type AuthedRequest = Request & { user?: AuthUser };

function getBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header) return undefined;
  const [type, token] = header.split(' ');
  if (type !== 'Bearer') return undefined;
  return token;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ status: 'failure', message: 'Missing token' });
    }
    if (!SECRET_KEY) {
      return res
        .status(500)
        .json({ status: 'failure', message: 'Server misconfigured (missing secret)' });
    }

    const decoded = jwt.verify(token, SECRET_KEY) as { payload?: AuthUser };
    const user = decoded?.payload;
    if (!user?.id) {
      return res.status(401).json({ status: 'failure', message: 'Invalid token' });
    }

    (req as AuthedRequest).user = user;
    return next();
  } catch {
    return res.status(401).json({ status: 'failure', message: 'Invalid token' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  return requireAuth(req, res, () => {
    const user = (req as AuthedRequest).user;
    if (user?.role !== 'admin') {
      return res.status(403).json({ status: 'failure', message: 'Admin only' });
    }
    return next();
  });
}


