import type { Request, Response, NextFunction } from 'express';
import type { ActionType, ResourceAttributes, SubjectAttributes } from '@u-abac/types';
import { evaluateAccessPDP } from '../services/pdp.js';

declare global {
  namespace Express {
    interface Request {
      user?: SubjectAttributes;
    }
  }
}

/**
 * ABAC Policy Enforcement Point (PEP) Middleware
 * Verifies if the subject attributes satisfy the policy rules stored in the database.
 */
export function authorizeABAC(
  action: ActionType,
  getResource: (req: Request) => Promise<ResourceAttributes> | ResourceAttributes
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const subject = req.user;

    if (!subject) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No subject context provided',
      });
      return;
    }

    try {
      const resource = await getResource(req);
      const ip = req.ip || req.socket.remoteAddress;

      const decision = await evaluateAccessPDP(subject, action, resource, ip);

      if (!decision.allowed) {
        res.status(403).json({
          success: false,
          error: 'Forbidden: Access Denied by ABAC Engine',
          reason: decision.reason,
          decision,
        });
        return;
      }

      next();
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Internal Authorization Evaluation Error',
        details: err?.message,
      });
    }
  };
}
