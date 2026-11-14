import { useState } from 'react';
import { CalendarPlus, Menu } from 'lucide-react';
import { AppointmentsView } from './components/AppointmentsView';
import { BillingView } from './components/BillingView';
import { DashboardView } from './components/DashboardView';
import { DoctorsView } from './components/DoctorsView';
import { LoginScreen } from './components/LoginScreen';
import { MedicalRecordsView } from './components/MedicalRecordsView';
import { PatientsView } from './components/PatientsView';
import { Sidebar } from './components/Sidebar';
import { ToastBanner } from './components/ToastBanner';
import { HospitalProvider, NavSection, useHospital } from './context/HospitalContext';

const SECTION_META: Record<NavSection, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Hospital Dashboard',
    subtitle: 'Overview of doctors, registered patients, daily schedule, and revenue.',
  },
  doctors: {
    title: 'Doctors Directory',
    subtitle: 'Manage General Physicians, Specialists, and Surgeons with polymorphic fee tiers.',
  },
  patients: {
    title: 'Patients Registry',
    subtitle: 'Register, search, and inspect complete patient demographics and clinical histories.',
  },
  appointments: {
    title: 'Appointments Schedule',
    subtitle: 'Book conflict-free slots, reschedule, complete, or cancel patient consultations.',
  },
  records: {
    title: 'Medical Records',
    subtitle: 'Diagnoses, prescriptions, and clinical follow-up documentation.',
  },
  billing: {
    title: 'Billing Summary',
    subtitle: 'Revenue aggregation per patient and per doctor.',
  },
};

function HospitalShell() {
  const { user, activeSection, setActiveSection } = useHospital();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) {
    return (
      <>
        <LoginScreen />
        <ToastBanner />
      </>
    );
  }

  const meta = SECTION_META[activeSection];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900 truncate">
                  {meta.title}
                </h1>
                <p className="text-xs text-slate-500 truncate hidden sm:block">
                  {meta.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="hidden md:inline-block text-xs text-slate-600 whitespace-nowrap">
                {user.displayName}
              </span>
              {activeSection !== 'appointments' && (
                <button
                  type="button"
                  onClick={() => setActiveSection('appointments')}
                  aria-label="Book Appointment"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 sm:px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="sm:hidden">Book</span>
                  <span className="hidden sm:inline">Book Appointment</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeSection === 'dashboard' && <DashboardView />}
          {activeSection === 'doctors' && <DoctorsView />}
          {activeSection === 'patients' && <PatientsView />}
          {activeSection === 'appointments' && <AppointmentsView />}
          {activeSection === 'records' && <MedicalRecordsView />}
          {activeSection === 'billing' && <BillingView />}
        </main>
      </div>

      <ToastBanner />
    </div>
  );
}

export default function App() {
  return (
    <HospitalProvider>
      <HospitalShell />
    </HospitalProvider>
  );
}
