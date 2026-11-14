import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { HospitalManager } from '../services/HospitalManager';
import { sanitizeInput, UserRole } from '../utils/validation';

export interface AuthUser {
  username: string;
  displayName: string;
  role: UserRole;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

export type NavSection =
  | 'dashboard'
  | 'doctors'
  | 'patients'
  | 'appointments'
  | 'records'
  | 'billing';

const AUTH_STORAGE_KEY = 'hapms_auth_user_v1';

interface HospitalContextValue {
  manager: HospitalManager;
  version: number;
  refresh: () => void;
  resetSeedData: () => void;
  user: AuthUser | null;
  login: (username: string, password: string, role: UserRole) => { ok: boolean; error?: string };
  logout: () => void;
  activeSection: NavSection;
  setActiveSection: (section: NavSection) => void;
  toasts: ToastMessage[];
  notify: (type: ToastMessage['type'], text: string) => void;
  dismissToast: (id: string) => void;
  canManageDoctors: boolean;
  canDeleteEntities: boolean;
  canCreateMedicalRecords: boolean;
}

const HospitalContext = createContext<HospitalContextValue | null>(null);

function getInitialUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get('autostart') === '1') {
    return {
      username: 'admin',
      displayName: 'Dr. Kavita Rao (Admin)',
      role: 'Admin',
    };
  }
  try {
    const raw = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AuthUser;
      if (parsed && (parsed.role === 'Admin' || parsed.role === 'Receptionist')) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export const DEMO_CREDENTIALS: Record<UserRole, { username: string; password: string; displayName: string }> = {
  Admin: {
    username: 'admin',
    password: 'admin123',
    displayName: 'Dr. Kavita Rao (Admin)',
  },
  Receptionist: {
    username: 'reception',
    password: 'desk123',
    displayName: 'Neha Verma (Front Desk)',
  },
};

export function HospitalProvider({ children }: { children: React.ReactNode }) {
  const [manager, setManager] = useState<HospitalManager>(() => HospitalManager.loadFromStorage());
  const [version, setVersion] = useState(0);
  const [user, setUser] = useState<AuthUser | null>(getInitialUser);
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (type: ToastMessage['type'], text: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, text }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const refresh = useCallback(() => {
    manager.saveToStorage();
    setVersion((v) => v + 1);
  }, [manager]);

  const resetSeedData = useCallback(() => {
    const fresh = HospitalManager.resetToSeedData();
    setManager(fresh);
    setVersion((v) => v + 1);
    notify('info', 'Hospital records restored to realistic sample dataset.');
  }, [notify]);

  const login = useCallback(
    (username: string, password: string, role: UserRole): { ok: boolean; error?: string } => {
      const cleanUser = sanitizeInput(username).toLowerCase();
      const cleanPass = sanitizeInput(password);

      if (!cleanUser || !cleanPass) {
        return { ok: false, error: 'Username and password are required.' };
      }

      const expected = DEMO_CREDENTIALS[role];
      if (cleanUser !== expected.username || cleanPass !== expected.password) {
        return {
          ok: false,
          error: `Invalid credentials for ${role}. Try "${expected.username}" / "${expected.password}".`,
        };
      }

      const authUser: AuthUser = {
        username: expected.username,
        displayName: expected.displayName,
        role,
      };
      setUser(authUser);
      try {
        window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      } catch {
        // ignore storage errors
      }
      setActiveSection('dashboard');
      notify('success', `Signed in as ${authUser.displayName}`);
      return { ok: true };
    },
    [notify]
  );

  const logout = useCallback(() => {
    setUser(null);
    try {
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }, []);

  const value = useMemo<HospitalContextValue>(() => {
    const isAdmin = user?.role === 'Admin';
    return {
      manager,
      version,
      refresh,
      resetSeedData,
      user,
      login,
      logout,
      activeSection,
      setActiveSection,
      toasts,
      notify,
      dismissToast,
      canManageDoctors: isAdmin,
      canDeleteEntities: isAdmin,
      canCreateMedicalRecords: isAdmin,
    };
  }, [
    manager,
    version,
    refresh,
    resetSeedData,
    user,
    login,
    logout,
    activeSection,
    toasts,
    notify,
    dismissToast,
  ]);

  return <HospitalContext.Provider value={value}>{children}</HospitalContext.Provider>;
}

export function useHospital(): HospitalContextValue {
  const ctx = useContext(HospitalContext);
  if (!ctx) {
    throw new Error('useHospital must be used inside HospitalProvider');
  }
  return ctx;
}
