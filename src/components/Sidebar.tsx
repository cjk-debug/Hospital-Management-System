import React from 'react';
import {
  Activity,
  CalendarClock,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  RotateCcw,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';
import { NavSection, useHospital } from '../context/HospitalContext';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'doctors', label: 'Doctors', icon: Stethoscope },
  { id: 'patients', label: 'Patients', icon: Users },
  { id: 'appointments', label: 'Appointments', icon: CalendarClock },
  { id: 'records', label: 'Medical Records', icon: FileText },
  { id: 'billing', label: 'Billing Summary', icon: CreditCard },
];

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { activeSection, setActiveSection, user, logout, canManageDoctors, resetSeedData } = useHospital();

  const handleNavigate = (section: NavSection) => {
    setActiveSection(section);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <span className="font-display text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
            MedCore HMS
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Primary navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Account & Actions */}
      <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50/70">
        {user && (
          <div className="px-1">
            <p className="text-sm font-semibold text-slate-900 truncate">{user.displayName}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Role: <span className="font-medium text-blue-700">{user.role}</span>
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          {canManageDoctors && (
            <button
              type="button"
              onClick={resetSeedData}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset Sample Data
            </button>
          )}
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-50">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
