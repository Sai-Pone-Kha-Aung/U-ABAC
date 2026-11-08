import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from '@u-abac/database';
import { authorizeABAC } from './middleware/abac.js';
import { evaluateAccessPDP } from './services/pdp.js';
import type { ActionType, Role, ClearanceLevel, SubjectAttributes } from '@u-abac/types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

/**
 * Dynamic User Context Middleware
 * Resolves user from `x-user-id` or defaults to the first student user
 */
app.use(async (req, _res, next) => {
  const userIdHeader = req.headers['x-user-id'] as string | undefined;

  let dbUser = null;
  if (userIdHeader) {
    dbUser = await prisma.user.findUnique({
      where: { id: userIdHeader },
      include: { userAttributes: true },
    });
  }

  // Fallback to demo user if not specified
  if (!dbUser) {
    dbUser = await prisma.user.findFirst({
      where: { role: 'STUDENT' },
      include: { userAttributes: true },
    });
  }

  if (dbUser) {
    const attributeMap: Record<string, unknown> = {};
    for (const attr of dbUser.userAttributes) {
      attributeMap[attr.key] = attr.value;
    }

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role as Role,
      department: dbUser.department,
      clearanceLevel: dbUser.clearanceLevel as ClearanceLevel,
      isActive: dbUser.isActive,
      attributes: attributeMap,
    };
  }

  next();
});

// 1. Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'u-abac-backend',
    timestamp: new Date().toISOString(),
  });
});

// 2. List all available identities for interactive demo / switcher
app.get('/api/users', async (_req, res) => {
  const users = await prisma.user.findMany({
    include: { userAttributes: true },
    orderBy: { role: 'asc' },
  });
  res.json({ success: true, data: users });
});

// 3. Current active subject attributes
app.get('/api/me', (req, res) => {
  res.json({
    success: true,
    data: req.user,
  });
});

// 4. List resources with real-time access evaluation for current user
app.get('/api/resources', async (req, res) => {
  const resources = await prisma.resource.findMany({
    include: { owner: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const subject = req.user;
  if (!subject) {
    res.json({ success: true, data: resources });
    return;
  }

  // Evaluate access rights for each resource for this user
  const evaluatedResources = await Promise.all(
    resources.map(async (resItem) => {
      let meta: Record<string, unknown> = {};
      try {
        if (resItem.metadata) meta = JSON.parse(resItem.metadata);
      } catch {}

      const resourceAttr = {
        id: resItem.id,
        type: resItem.type,
        department: resItem.department,
        classification: resItem.classification as ClearanceLevel,
        ownerId: resItem.ownerId ?? undefined,
        attributes: meta,
      };

      const [readDecision, updateDecision, deleteDecision] = await Promise.all([
        evaluateAccessPDP(subject, 'READ', resourceAttr),
        evaluateAccessPDP(subject, 'UPDATE', resourceAttr),
        evaluateAccessPDP(subject, 'DELETE', resourceAttr),
      ]);

      return {
        ...resItem,
        permissions: {
          canRead: readDecision.allowed,
          readReason: readDecision.reason,
          canUpdate: updateDecision.allowed,
          updateReason: updateDecision.reason,
          canDelete: deleteDecision.allowed,
          deleteReason: deleteDecision.reason,
        },
      };
    })
  );

  res.json({ success: true, data: evaluatedResources });
});

// 5. Access specific protected resource via ABAC PEP middleware
app.get(
  '/api/resources/:id',
  authorizeABAC('READ', async (req) => {
    const resource = await prisma.resource.findUniqueOrThrow({
      where: { id: String(req.params.id) },
    });
    return {
      id: resource.id,
      type: resource.type,
      department: resource.department,
      classification: resource.classification as ClearanceLevel,
      ownerId: resource.ownerId ?? undefined,
    };
  }),
  async (req, res) => {
    const resource = await prisma.resource.findUnique({
      where: { id: String(req.params.id) },
      include: { owner: true },
    });
    res.json({ success: true, data: resource });
  }
);

// 6. PDP Simulator / Direct Evaluation Endpoint
app.post('/api/evaluate', async (req, res) => {
  const { subject, action, resource } = req.body;
  if (!subject || !action || !resource) {
    res.status(400).json({
      success: false,
      error: 'Missing required parameters: subject, action, resource',
    });
    return;
  }

  const decision = await evaluateAccessPDP(subject, action as ActionType, resource);
  res.json({ success: true, data: decision });
});

// 7. Policy Management Endpoints (for Admin App)
app.get('/api/policies', async (_req, res) => {
  const policies = await prisma.policy.findMany({
    include: { rules: true },
    orderBy: { priority: 'desc' },
  });

  const parsedPolicies = policies.map((pol) => ({
    ...pol,
    rules: pol.rules.map((rule) => {
      let conditions = [];
      try {
        conditions = JSON.parse(rule.conditions);
      } catch {}
      return {
        ...rule,
        actions: rule.actions.split(','),
        conditions,
      };
    }),
  }));

  res.json({ success: true, data: parsedPolicies });
});

app.patch('/api/policies/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const current = await prisma.policy.findUnique({ where: { id: String(id) } });
  if (!current) {
    res.status(404).json({ success: false, error: 'Policy not found' });
    return;
  }

  const updated = await prisma.policy.update({
    where: { id: String(id) },
    data: { isEnabled: !current.isEnabled },
    include: { rules: true },
  });

  res.json({ success: true, data: updated });
});

app.post('/api/policies', async (req, res) => {
  const { name, description, resourceType, priority, rules } = req.body;

  if (!name || !resourceType || !Array.isArray(rules)) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: name, resourceType, rules',
    });
    return;
  }

  try {
    const newPolicy = await prisma.policy.create({
      data: {
        name,
        description: description || null,
        resourceType,
        priority: Number(priority) || 0,
        isEnabled: true,
        rules: {
          create: rules.map((r: any) => ({
            name: r.name || 'Unnamed Rule',
            effect: r.effect === 'DENY' ? 'DENY' : 'PERMIT',
            actions: Array.isArray(r.actions) ? r.actions.join(',') : String(r.actions || 'READ'),
            conditions: JSON.stringify(r.conditions || []),
          })),
        },
      },
      include: { rules: true },
    });

    res.status(201).json({ success: true, data: newPolicy });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/policies/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.policy.delete({
      where: { id: String(id) },
    });
    res.json({ success: true, message: 'Policy deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Access Audit Logs (for Admin App)
app.get('/api/audit-logs', async (_req, res) => {
  const logs = await prisma.accessAuditLog.findMany({
    include: { user: { select: { email: true, name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ success: true, data: logs });
});

app.listen(PORT, () => {
  console.log(`[backend] 🚀 U-ABAC Server running at http://localhost:${PORT}`);
});
