/**
 * U-ABAC Shared Type Definitions
 * Attribute-Based Access Control (ABAC) Core Models & DTOs
 */

// 1. Core ABAC Attributes
export type Role = 'ADMIN' | 'MANAGER' | 'STAFF' | 'STUDENT' | 'GUEST';

export type ClearanceLevel = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'TOP_SECRET';

export type ActionType = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'APPROVE';

export interface SubjectAttributes {
  id: string;
  email: string;
  role: Role;
  department: string;
  clearanceLevel: ClearanceLevel;
  isActive: boolean;
  attributes?: Record<string, unknown>;
}

export interface ResourceAttributes {
  id: string;
  type: string; // e.g., 'document', 'course', 'grade', 'financial_record'
  department: string;
  classification: ClearanceLevel;
  ownerId?: string;
  attributes?: Record<string, unknown>;
}

export interface EnvironmentAttributes {
  currentTime: string; // ISO String
  ipAddress?: string;
  isWorkHours?: boolean;
}

// 2. Policy & Rule Definitions
export type PolicyEffect = 'PERMIT' | 'DENY';

export interface ABACCondition {
  field: string; // e.g. "subject.department" or "subject.clearanceLevel"
  operator: 'EQUALS' | 'NOT_EQUALS' | 'IN' | 'CONTAINS' | 'GTE' | 'LTE';
  value: unknown;
}

export interface ABACPolicyRule {
  id: string;
  name: string;
  description?: string;
  effect: PolicyEffect;
  actions: ActionType[];
  conditions: ABACCondition[];
}

export interface ABACPolicy {
  id: string;
  name: string;
  description?: string;
  resourceType: string;
  rules: ABACPolicyRule[];
  priority: number;
  isEnabled: boolean;
}

// 3. Authorization Decision Request & Response
export interface AccessDecisionRequest {
  subject: SubjectAttributes;
  action: ActionType;
  resource: ResourceAttributes;
  environment?: EnvironmentAttributes;
}

export interface AccessDecisionResponse {
  allowed: boolean;
  reason?: string;
  matchedPolicyId?: string;
  timestamp: string;
}

// 4. API Response Generic Wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  clearanceLevel: ClearanceLevel;
  createdAt: string;
}

