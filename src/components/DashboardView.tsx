import { CalendarClock, CreditCard, Stethoscope, Users, ArrowRight } from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { formatINR, getTodayIsoDate } from '../utils/validation';
import { AppointmentStatusBadge } from './StatusBadge';

export function DashboardView() {
  const { manager, setActiveSection } = useHospital();

  const doctors = manager.doctors;
  const patients = manager.patients;
  const today = getTodayIsoDate();
  const todaysAppointments = manager.getTodaysAppointments(today);
  const totalRevenue = manager.getTotalRevenue();
  const collectedRevenue = manager.getCollectedRevenue();

  const categoryBreakdown = [
    {
      label: 'General Physicians',
      docs: doctors.filter((d) => d.getDoctorCategory() === 'GeneralPhysician'),
    },
    {
      label: 'Specialists',
      docs: doctors.filter((d) => d.getDoctorCategory() === 'Specialist'),
    },
    {
      label: 'Surgeons',
      docs: doctors.filter((d) => d.getDoctorCategory() === 'Surgeon'),
    },
  ];

  const recentRecords = [...manager.medicalRecords]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* 4 Summary KPI Cards */}
      <section aria-label="Hospital summary metrics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total Doctors</span>
            <Stethoscope className="w-4 h-4 text-blue-600" aria-hidden="true" />
          </div>
          <p className="mt-3 text-3xl font-display font-bold text-slate-900 tabular-nums">
            {doctors.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {categoryBreakdown[0].docs.length} GP · {categoryBreakdown[1].docs.length}{' '}
            {categoryBreakdown[1].docs.length === 1 ? 'Specialist' : 'Specialists'} ·{' '}
            {categoryBreakdown[2].docs.length}{' '}
            {categoryBreakdown[2].docs.length === 1 ? 'Surgeon' : 'Surgeons'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total Patients</span>
            <Users className="w-4 h-4 text-blue-600" aria-hidden="true" />
          </div>
          <p className="mt-3 text-3xl font-display font-bold text-slate-900 tabular-nums">
            {patients.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {manager.medicalRecords.length} documented clinical records
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Today&apos;s Appointments</span>
            <CalendarClock className="w-4 h-4 text-blue-600" aria-hidden="true" />
          </div>
          <p className="mt-3 text-3xl font-display font-bold text-slate-900 tabular-nums">
            {todaysAppointments.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {todaysAppointments.filter((a) => a.status === 'Scheduled').length} scheduled ·{' '}
            {todaysAppointments.filter((a) => a.status === 'Completed').length} completed
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total Revenue</span>
            <CreditCard className="w-4 h-4 text-blue-600" aria-hidden="true" />
          </div>
          <p className="mt-3 text-3xl font-display font-bold text-slate-900 tabular-nums">
            {formatINR(totalRevenue)}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {formatINR(collectedRevenue)} collected from completed visits
          </p>
        </div>
      </section>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Today's Appointments Table */}
        <section className="xl:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Today&apos;s Clinical Schedule
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">{today}</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('appointments')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
            >
              Manage All
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {todaysAppointments.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-700">No appointments scheduled for today.</p>
              <button
                type="button"
                onClick={() => setActiveSection('appointments')}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
              >
                Book Appointment
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Doctor</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {todaysAppointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                        {appt.timeSlot}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">{appt.patient.name}</p>
                        <p className="text-xs text-slate-500">{appt.patient.id} · {appt.reason}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">{appt.doctor.name}</p>
                        <p className="text-xs text-slate-500">{appt.doctor.specialization}</p>
                      </td>
                      <td className="py-3 px-4">
                        <AppointmentStatusBadge status={appt.status} />
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-900 tabular-nums whitespace-nowrap">
                        {formatINR(appt.calculateFee())}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right Column: Doctor Fee Tiers & Recent Records */}
        <div className="xl:col-span-4 space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Consultation Fee Schedule
              </h2>
              <button
                type="button"
                onClick={() => setActiveSection('doctors')}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap"
              >
                View All
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {doctors.slice(0, 5).map((doc) => (
                <div key={doc.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{doc.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {doc.getDoctorCategory()} · {doc.specialization}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-blue-700 tabular-nums whitespace-nowrap">
                    {formatINR(doc.calculateConsultationFee())}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Recent Medical Records
              </h2>
              <button
                type="button"
                onClick={() => setActiveSection('records')}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap"
              >
                View All
              </button>
            </div>
            {recentRecords.length === 0 ? (
              <p className="text-sm text-slate-500">No medical records logged yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentRecords.map((rec) => (
                  <div key={rec.id} className="py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">{rec.patient.name}</p>
                      <span className="font-mono text-xs text-slate-500 shrink-0">{rec.date}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 truncate">{rec.diagnosis}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">By {rec.doctor.name}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
