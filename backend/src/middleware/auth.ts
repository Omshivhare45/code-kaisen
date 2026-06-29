import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { user_role } from '../types/db';

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  department_id: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_key_123';

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = decoded as TokenPayload;
    next();
  });
}
