'use client';

import React, { useEffect, useState } from 'react';
import type { SubjectAttributes } from '@u-abac/types';

interface ResourceItem {
  id: string;
  title: string;
  type: string;
  department: string;
  classification: string;
  permissions?: {
    canRead: boolean;
    readReason?: string;
    canUpdate: boolean;
    updateReason?: string;
    canDelete: boolean;
    deleteReason?: string;
  };
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  clearanceLevel: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function HomePage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<SubjectAttributes | null>(null);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModalData, setActiveModalData] = useState<any>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Load available users for switching
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/users`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          setUsers(data.data);
          // Default to student
          const student = data.data.find((u: UserRecord) => u.role === 'STUDENT') || data.data[0];
          setSelectedUserId(student.id);
        }
      })
      .catch((err) => console.error('Failed to load users:', err));
  }, []);

  // Fetch current user and resources when selectedUserId changes
  useEffect(() => {
    if (!selectedUserId) return;
    setLoading(true);

    const headers: Record<string, string> = { 'x-user-id': selectedUserId };

    Promise.all([
      fetch(`${BACKEND_URL}/api/me`, { headers }).then((res) => res.json()),
      fetch(`${BACKEND_URL}/api/resources`, { headers }).then((res) => res.json()),
    ])
      .then(([meData, resData]) => {
        if (meData.success) setCurrentUser(meData.data);
        if (resData.success) setResources(resData.data);
      })
      .catch((err) => console.error('Error fetching data:', err))
      .finally(() => setLoading(false));
  }, [selectedUserId]);

  const handleInspectResource = async (resourceId: string) => {
    setModalError(null);
    setActiveModalData(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/resources/${resourceId}`, {
        headers: { 'x-user-id': selectedUserId },
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setModalError(data.reason || data.error || 'Access Denied by PEP Engine');
      } else {
        setActiveModalData(data.data);
      }
    } catch (e: any) {
      setModalError(e.message || 'Network error');
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 font-sans">
      {/* Header Banner */}
      <header className="mb-8 border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
              Next.js 16 Client Portal
            </span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
              Port 3000
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mt-2">
            U-ABAC Access Portal
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Real-time Attribute-Based Access Control Evaluation & Authorization
          </p>
        </div>

        {/* Identity Switcher */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm min-w-[280px]">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            🎭 Simulate User Identity
          </label>
          <select
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role} - {u.department})
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* User Attributes Card */}
      {currentUser && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4 border-b pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              Subject Attributes (Evaluated in PDP Engine)
            </h2>
            <span className="text-xs font-mono text-slate-400">ID: {currentUser.id}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-xs font-medium">Full Name</span>
              <span className="font-semibold text-slate-900">
                {users.find((u) => u.id === currentUser.id)?.name || currentUser.email}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-xs font-medium">Role</span>
              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs inline-block mt-0.5">
                {currentUser.role}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-xs font-medium">Department</span>
              <span className="font-semibold text-slate-800">{currentUser.department}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-xs font-medium">Clearance Level</span>
              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs inline-block mt-0.5">
                {currentUser.clearanceLevel}
              </span>
            </div>
          </div>

          {currentUser.attributes && Object.keys(currentUser.attributes).length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Custom User Attributes:</span>
              {Object.entries(currentUser.attributes).map(([k, v]) => (
                <span key={k} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono">
                  {k}: {String(v)}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Protected Resources Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Protected Resources</h2>
            <p className="text-sm text-slate-500">
              Access permissions are dynamically computed per user according to active ABAC policies.
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
            {resources.length} Protected Items
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Evaluating access policies...</div>
        ) : (
          <div className="grid gap-4">
            {resources.map((item) => {
              const canRead = item.permissions?.canRead;
              return (
                <div
                  key={item.id}
                  className={`bg-white border rounded-xl p-5 shadow-sm transition hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    canRead ? 'border-slate-200' : 'border-rose-200 bg-rose-50/20'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base">{item.title}</h3>
                      <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-slate-100 text-slate-700">
                        {item.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>
                        Dept: <strong>{item.department}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Classification:{' '}
                        <strong
                          className={
                            item.classification === 'TOP_SECRET'
                              ? 'text-rose-600 font-bold'
                              : item.classification === 'CONFIDENTIAL'
                              ? 'text-amber-600 font-bold'
                              : 'text-slate-700'
                          }
                        >
                          {item.classification}
                        </strong>
                      </span>
                    </div>

                    {item.permissions?.readReason && (
                      <p className="text-xs text-slate-500 italic pt-1">
                        PDP Reason: {item.permissions.readReason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        canRead
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {canRead ? '✓ PERMITTED' : '✕ DENIED'}
                    </span>

                    <button
                      onClick={() => handleInspectResource(item.id)}
                      className={`text-xs font-semibold px-4 py-2 rounded-lg transition shadow-sm ${
                        canRead
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      }`}
                    >
                      Test PEP Access
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Response Modal / Drawer */}
      {(activeModalData || modalError) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-slate-900 text-lg">
                {modalError ? '🚨 PEP Authorization Blocked' : '✅ PEP Access Granted'}
              </h3>
              <button
                onClick={() => {
                  setActiveModalData(null);
                  setModalError(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              {modalError ? (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-sm">
                  <p className="font-semibold">HTTP 403 Forbidden</p>
                  <p className="mt-1">{modalError}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-sm">
                    <p className="font-semibold">HTTP 200 OK — Policy Verified</p>
                    <p className="mt-1">
                      Resource: <strong>{activeModalData.title}</strong>
                    </p>
                    <p className="text-xs text-slate-600 mt-2 font-mono">
                      {JSON.stringify(activeModalData.metadata)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setActiveModalData(null);
                  setModalError(null);
                }}
                className="bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
