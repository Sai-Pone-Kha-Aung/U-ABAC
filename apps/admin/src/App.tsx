import React, { useEffect, useState } from 'react';
import type { ABACPolicy, ActionType, ClearanceLevel, Role } from '@u-abac/types';

interface AuditLogRecord {
  id: string;
  userId?: string;
  user?: { email: string; name: string; role: string };
  resourceType: string;
  resourceId?: string;
  action: string;
  decision: 'PERMIT' | 'DENY';
  reason?: string;
  ipAddress?: string;
  createdAt: string;
}

const BACKEND_URL = 'http://localhost:4000';

export default function App() {
  const [activeTab, setActiveTab] = useState<'policies' | 'audit' | 'simulator'>('policies');
  const [policies, setPolicies] = useState<ABACPolicy[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulator State
  const [simRole, setSimRole] = useState<Role>('STUDENT');
  const [simDept, setSimDept] = useState('Computer Science');
  const [simClearance, setSimClearance] = useState<ClearanceLevel>('INTERNAL');
  const [simAction, setSimAction] = useState<ActionType>('READ');
  const [simResType, setSimResType] = useState('exam_paper');
  const [simResDept, setSimResDept] = useState('Computer Science');
  const [simResClassification, setSimResClassification] = useState<ClearanceLevel>('CONFIDENTIAL');
  const [simDecision, setSimDecision] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  // Fetch policies
  const loadPolicies = () => {
    fetch(`${BACKEND_URL}/api/policies`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPolicies(data.data);
      })
      .catch((err) => console.error('Failed to load policies:', err))
      .finally(() => setLoading(false));
  };

  // Fetch audit logs
  const loadAuditLogs = () => {
    fetch(`${BACKEND_URL}/api/audit-logs`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAuditLogs(data.data);
      })
      .catch((err) => console.error('Failed to load audit logs:', err));
  };

  useEffect(() => {
    loadPolicies();
    loadAuditLogs();
  }, []);

  const handleTogglePolicy = async (policyId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/policies/${policyId}/toggle`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (data.success) {
        setPolicies((prev) =>
          prev.map((p) => (p.id === policyId ? { ...p, isEnabled: data.data.isEnabled } : p))
        );
      }
    } catch (err) {
      console.error('Error toggling policy:', err);
    }
  };

  const handleRunSimulation = async () => {
    setSimulating(true);
    setSimDecision(null);

    const payload = {
      subject: {
        id: 'sim-user-1',
        email: 'test.sim@university.edu',
        role: simRole,
        department: simDept,
        clearanceLevel: simClearance,
        isActive: true,
      },
      action: simAction,
      resource: {
        id: 'sim-res-1',
        type: simResType,
        department: simResDept,
        classification: simResClassification,
      },
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSimDecision(data.data);
      }
    } catch (e: any) {
      setSimDecision({ allowed: false, reason: e.message });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
            U
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">U-ABAC Admin Console</h1>
            <p className="text-xs text-slate-400">Policy Administration Point (PAP & Audit)</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('policies')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'policies'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Policies ({policies.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('audit');
              loadAuditLogs();
            }}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'audit'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Audit Trail ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'simulator'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            PDP Simulator
          </button>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span className="bg-indigo-950 text-indigo-400 border border-indigo-800 px-3 py-1 rounded-full font-mono">
            React + Vite (Port 3001)
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-8 py-8">
        {/* TAB 1: POLICIES */}
        {activeTab === 'policies' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-100">Access Control Policies</h2>
                <p className="text-sm text-slate-400">
                  Manage live policies, rule conditions, and prioritize attribute rules.
                </p>
              </div>
              <button
                onClick={loadPolicies}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700"
              >
                ↻ Refresh
              </button>
            </div>

            {loading ? (
              <p className="text-slate-500 text-sm">Loading policies from database...</p>
            ) : (
              <div className="space-y-4">
                {policies.map((policy) => (
                  <div
                    key={policy.id}
                    className={`border rounded-xl p-6 transition ${
                      policy.isEnabled
                        ? 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                        : 'bg-slate-900/40 border-slate-800/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-slate-100 text-lg">{policy.name}</h3>
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                            Priority: {policy.priority}
                          </span>
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                            Resource: {policy.resourceType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{policy.description}</p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                            policy.isEnabled
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                              : 'bg-rose-950 text-rose-400 border-rose-800'
                          }`}
                        >
                          {policy.isEnabled ? '● Active' : '○ Disabled'}
                        </span>
                        <button
                          onClick={() => handleTogglePolicy(policy.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                            policy.isEnabled
                              ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {policy.isEnabled ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>

                    {/* Policy Rules */}
                    <div className="mt-4 pt-4 border-t border-slate-700/60">
                      <h4 className="text-xs uppercase font-semibold text-slate-400 mb-2 tracking-wider">
                        Configured Rules ({policy.rules.length})
                      </h4>
                      <div className="space-y-2">
                        {policy.rules.map((rule) => (
                          <div
                            key={rule.id}
                            className="bg-slate-900/80 rounded-lg p-3 border border-slate-800 flex items-center justify-between text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                                    rule.effect === 'PERMIT'
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                                  }`}
                                >
                                  {rule.effect}
                                </span>
                                <span className="font-semibold text-slate-200">{rule.name}</span>
                              </div>
                              <p className="text-slate-400">
                                Actions:{' '}
                                <span className="font-mono text-slate-300">
                                  {Array.isArray(rule.actions)
                                    ? rule.actions.join(', ')
                                    : rule.actions}
                                </span>
                              </p>
                            </div>

                            <div className="text-right">
                              <span className="text-slate-400 block mb-0.5 text-[11px]">
                                Conditions
                              </span>
                              <div className="flex flex-wrap gap-1 justify-end">
                                {rule.conditions.map((c, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-slate-800 px-2 py-0.5 rounded text-indigo-300 font-mono text-[11px]"
                                  >
                                    {c.field} {c.operator} {String(c.value)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-100">Live Access Audit Logs</h2>
                <p className="text-sm text-slate-400">
                  Comprehensive audit trail of every access decision made by the Policy Decision
                  Point.
                </p>
              </div>
              <button
                onClick={loadAuditLogs}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700"
              >
                ↻ Refresh Logs
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-mono">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Decision</th>
                    <th className="px-4 py-3">User / Subject</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Resource Type</th>
                    <th className="px-4 py-3">Reason / Matched Policy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No audit records yet. Test resource access in the Next.js frontend to generate
                        logs!
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/50 transition">
                        <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${
                              log.decision === 'PERMIT'
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                : 'bg-rose-950 text-rose-400 border-rose-800'
                            }`}
                          >
                            {log.decision}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-200 block">
                            {log.user?.name || log.userId || 'Anonymous'}
                          </span>
                          <span className="text-slate-400 text-[11px]">{log.user?.role}</span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-300">{log.action}</td>
                        <td className="px-4 py-3 font-mono text-slate-400">{log.resourceType}</td>
                        <td className="px-4 py-3 text-slate-400 italic max-w-xs truncate">
                          {log.reason || 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PDP SIMULATOR */}
        {activeTab === 'simulator' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-100">ABAC Policy Simulator (PDP Sandbox)</h2>
              <p className="text-sm text-slate-400">
                Test custom Subject, Action, and Resource attribute combinations directly against the
                PDP engine.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Subject Attributes Form */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6 space-y-4">
                <h3 className="font-bold text-slate-100 text-sm border-b border-slate-700 pb-2">
                  1. Subject Attributes
                </h3>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Role</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                    value={simRole}
                    onChange={(e) => setSimRole(e.target.value as Role)}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="STAFF">STAFF</option>
                    <option value="STUDENT">STUDENT</option>
                    <option value="GUEST">GUEST</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Department</label>
                  <input
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                    value={simDept}
                    onChange={(e) => setSimDept(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Clearance Level</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                    value={simClearance}
                    onChange={(e) => setSimClearance(e.target.value as ClearanceLevel)}
                  >
                    <option value="PUBLIC">PUBLIC</option>
                    <option value="INTERNAL">INTERNAL</option>
                    <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                    <option value="TOP_SECRET">TOP_SECRET</option>
                  </select>
                </div>
              </div>

              {/* Resource & Action Form */}
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6 space-y-4">
                <h3 className="font-bold text-slate-100 text-sm border-b border-slate-700 pb-2">
                  2. Resource & Action
                </h3>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Requested Action</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                    value={simAction}
                    onChange={(e) => setSimAction(e.target.value as ActionType)}
                  >
                    <option value="READ">READ</option>
                    <option value="CREATE">CREATE</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                    <option value="EXPORT">EXPORT</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Resource Type</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                    value={simResType}
                    onChange={(e) => setSimResType(e.target.value)}
                  >
                    <option value="syllabus">syllabus</option>
                    <option value="exam_paper">exam_paper</option>
                    <option value="patent">patent</option>
                    <option value="policy_doc">policy_doc</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Resource Department</label>
                  <input
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                    value={simResDept}
                    onChange={(e) => setSimResDept(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Classification</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                    value={simResClassification}
                    onChange={(e) => setSimResClassification(e.target.value as ClearanceLevel)}
                  >
                    <option value="PUBLIC">PUBLIC</option>
                    <option value="INTERNAL">INTERNAL</option>
                    <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                    <option value="TOP_SECRET">TOP_SECRET</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleRunSimulation}
                disabled={simulating}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition shadow-md"
              >
                {simulating ? 'Evaluating...' : '⚡ Run Evaluation'}
              </button>
            </div>

            {/* Decision Result */}
            {simDecision && (
              <div
                className={`mt-6 p-6 rounded-xl border ${
                  simDecision.allowed
                    ? 'bg-emerald-950/30 border-emerald-800 text-emerald-200'
                    : 'bg-rose-950/30 border-rose-800 text-rose-200'
                }`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <span
                    className={`font-mono font-bold text-sm px-3 py-1 rounded-full border ${
                      simDecision.allowed
                        ? 'bg-emerald-900 text-emerald-300 border-emerald-700'
                        : 'bg-rose-900 text-rose-300 border-rose-700'
                    }`}
                  >
                    {simDecision.allowed ? '✓ PERMIT' : '✕ DENY'}
                  </span>
                  <span className="font-semibold text-base">
                    Decision: {simDecision.allowed ? 'Access Allowed' : 'Access Denied'}
                  </span>
                </div>
                <p className="text-sm mt-1">Reason: {simDecision.reason}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
