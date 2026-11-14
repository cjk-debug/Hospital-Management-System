import React, { useState } from 'react';
import { Activity, AlertCircle, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import { DEMO_CREDENTIALS, useHospital } from '../context/HospitalContext';
import { UserRole } from '../utils/validation';

export function LoginScreen() {
  const { login } = useHospital();
  const [role, setRole] = useState<UserRole>('Admin');
  const [username, setUsername] = useState(DEMO_CREDENTIALS.Admin.username);
  const [password, setPassword] = useState(DEMO_CREDENTIALS.Admin.password);
  const [error, setError] = useState('');

  const handleRoleSwitch = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setUsername(DEMO_CREDENTIALS[selectedRole].username);
    setPassword(DEMO_CREDENTIALS[selectedRole].password);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = login(username, password, role);
    if (!result.ok && result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Left Clinical Context Panel */}
        <div className="lg:col-span-5 bg-blue-700 text-white p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <span className="font-display text-lg font-semibold tracking-tight">MedCore HMS</span>
            </div>

            <h1 className="font-display text-2xl font-bold mt-8 leading-tight text-balance">
              Hospital Appointment and Patient Management System
            </h1>
            <p className="mt-3 text-sm text-blue-100 leading-relaxed">
              Manage clinical staff, patient registrations, conflict-free appointment scheduling, medical records, and transparent billing.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-blue-500/50 space-y-3 text-xs text-blue-100">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-200 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-white">Admin Access</p>
                <p className="text-blue-100/90">Full staff CRUD, patient deletion, clinical records, billing & system reset.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <UserCheck className="w-4 h-4 text-blue-200 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-white">Receptionist Access</p>
                <p className="text-blue-100/90">Patient registration, appointment booking & rescheduling, billing view.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Login Form */}
        <div className="lg:col-span-7 p-8 sm:p-10">
          <div className="mb-6">
            <h2 className="font-display text-xl font-bold text-slate-900">Staff Sign In</h2>
            <p className="text-sm text-slate-500 mt-1">
              Select your operational role and enter your hospital credentials.
            </p>
          </div>

          {/* Role Selector Segmented Control */}
          <div className="mb-6">
            <span className="block text-xs font-semibold text-slate-700 mb-2">Role</span>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg" role="group" aria-label="Select user role">
              {(['Admin', 'Receptionist'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleSwitch(r)}
                  className={`py-2 px-4 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                    role === r
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="login-username" className="block text-sm font-medium text-slate-700 mb-1.5">
                Username
              </label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-colors"
            >
              <Lock className="w-4 h-4" aria-hidden="true" />
              Sign In as {role}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <span>Demo credentials pre-filled for selected role</span>
            <span className="font-mono text-slate-700">
              {DEMO_CREDENTIALS[role].username} / {DEMO_CREDENTIALS[role].password}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
