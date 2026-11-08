import { prisma } from '@u-abac/database';
import type {
  ActionType,
  ResourceAttributes,
  SubjectAttributes,
  AccessDecisionResponse,
  ABACCondition,
} from '@u-abac/types';

const CLEARANCE_RANKS: Record<string, number> = {
  PUBLIC: 1,
  INTERNAL: 2,
  CONFIDENTIAL: 3,
  TOP_SECRET: 4,
};

/**
 * Extracts a nested value from an object path like "subject.department" or "resource.classification"
 */
function getValueByPath(
  path: string,
  subject: SubjectAttributes,
  resource: ResourceAttributes
): unknown {
  const parts = path.split('.');
  const root = parts[0];
  const field = parts.slice(1).join('.');

  if (root === 'subject') {
    if (field in subject) {
      return (subject as any)[field];
    }
    return subject.attributes?.[field];
  }

  if (root === 'resource') {
    if (field in resource) {
      return (resource as any)[field];
    }
    return resource.attributes?.[field];
  }

  return undefined;
}

/**
 * Evaluates a single ABAC condition
 */
function evaluateCondition(
  condition: ABACCondition,
  subject: SubjectAttributes,
  resource: ResourceAttributes
): boolean {
  const actualValue = getValueByPath(condition.field, subject, resource);
  let expectedValue = condition.value;

  // Support dynamic field comparison (e.g., condition.value === "resource.department")
  if (typeof expectedValue === 'string' && (expectedValue.startsWith('subject.') || expectedValue.startsWith('resource.'))) {
    expectedValue = getValueByPath(expectedValue, subject, resource);
  }

  switch (condition.operator) {
    case 'EQUALS':
      return actualValue === expectedValue;

    case 'NOT_EQUALS':
      return actualValue !== expectedValue;

    case 'IN':
      return Array.isArray(expectedValue) && expectedValue.includes(actualValue);

    case 'CONTAINS':
      if (typeof actualValue === 'string') {
        return actualValue.includes(String(expectedValue));
      }
      if (Array.isArray(actualValue)) {
        return actualValue.includes(expectedValue);
      }
      return false;

    case 'GTE': {
      // If comparing clearance levels
      if (condition.field.includes('clearance') || condition.field.includes('classification')) {
        const actualRank = CLEARANCE_RANKS[String(actualValue)] ?? 0;
        const expectedRank = CLEARANCE_RANKS[String(expectedValue)] ?? 0;
        return actualRank >= expectedRank;
      }
      return Number(actualValue) >= Number(expectedValue);
    }

    case 'LTE': {
      if (condition.field.includes('clearance') || condition.field.includes('classification')) {
        const actualRank = CLEARANCE_RANKS[String(actualValue)] ?? 0;
        const expectedRank = CLEARANCE_RANKS[String(expectedValue)] ?? 0;
        return actualRank <= expectedRank;
      }
      return Number(actualValue) <= Number(expectedValue);
    }

    default:
      return false;
  }
}

/**
 * Policy Decision Point (PDP)
 * Queries DB policies, evaluates rules, and records an AccessAuditLog.
 */
export async function evaluateAccessPDP(
  subject: SubjectAttributes,
  action: ActionType,
  resource: ResourceAttributes,
  ipAddress?: string
): Promise<AccessDecisionResponse> {
  const timestamp = new Date().toISOString();

  // 1. Fetch enabled policies matching the resource type or wildcard '*'
  const policies = await prisma.policy.findMany({
    where: {
      isEnabled: true,
      OR: [{ resourceType: resource.type }, { resourceType: '*' }],
    },
    include: {
      rules: true,
    },
    orderBy: {
      priority: 'desc',
    },
  });

  let permitted = false;
  let decisionReason = 'No applicable policy permitted access (Default Deny)';
  let matchedPolicyId: string | undefined;

  for (const policy of policies) {
    for (const rule of policy.rules) {
      const ruleActions = rule.actions.split(',').map((a) => a.trim());
      if (!ruleActions.includes(action) && !ruleActions.includes('*')) {
        continue;
      }

      let conditions: ABACCondition[] = [];
      try {
        conditions = JSON.parse(rule.conditions);
      } catch {
        conditions = [];
      }

      // Check all conditions in this rule
      const conditionsPassed = conditions.every((cond) =>
        evaluateCondition(cond, subject, resource)
      );

      if (conditionsPassed) {
        matchedPolicyId = policy.id;

        // Explicit Deny takes immediate precedence
        if (rule.effect === 'DENY') {
          permitted = false;
          decisionReason = `Explicitly denied by policy "${policy.name}" (rule: ${rule.name})`;
          break;
        }

        if (rule.effect === 'PERMIT') {
          permitted = true;
          decisionReason = `Permitted by policy "${policy.name}" (rule: ${rule.name})`;
          break;
        }
      }
    }

    // Stop at highest priority matched policy
    if (matchedPolicyId) {
      break;
    }
  }

  // 2. Log audit trail asynchronously
  try {
    await prisma.accessAuditLog.create({
      data: {
        userId: subject.id,
        resourceType: resource.type,
        resourceId: resource.id,
        action,
        decision: permitted ? 'PERMIT' : 'DENY',
        reason: decisionReason,
        ipAddress: ipAddress ?? '127.0.0.1',
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }

  return {
    allowed: permitted,
    reason: decisionReason,
    matchedPolicyId,
    timestamp,
  };
}

