import { useMemo, useState } from 'react';
import { Receipt, Search, X } from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { Appointment } from '../models/Appointment';
import { formatINR } from '../utils/validation';

export function BillingView() {
  const { manager } = useHospital();
  const [activeTab, setActiveTab] = useState<'patients' | 'doctors'>('patients');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'amount-desc' | 'name'>('amount-desc');
  const [inspectedAppointment, setInspectedAppointment] = useState<Appointment | null>(null);

  const totalRevenue = manager.getTotalRevenue();
  const collectedRevenue = manager.getCollectedRevenue();
  const pendingRevenue = totalRevenue - collectedRevenue;

  const patientBilling = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = manager
      .getPatientBillingSummary()
      .filter(
        (item) =>
          !q ||
          item.patient.name.toLowerCase().includes(q) ||
          item.patient.id.toLowerCase().includes(q)
      );
    return [...list].sort((a, b) =>
      sortOrder === 'amount-desc'
        ? b.totalBilled - a.totalBilled
        : a.patient.name.localeCompare(b.patient.name)
    );
  }, [manager, searchQuery, sortOrder, manager.appointments.length, manager.patients.length]);

  const doctorBilling = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = manager
      .getDoctorBillingSummary()
      .filter(
        (item) =>
          !q ||
          item.doctor.name.toLowerCase().includes(q) ||
          item.doctor.specialization.toLowerCase().includes(q)
      );
    return [...list].sort((a, b) =>
      sortOrder === 'amount-desc'
        ? b.totalRevenue - a.totalRevenue
        : a.doctor.name.localeCompare(b.doctor.name)
    );
  }, [manager, searchQuery, sortOrder, manager.appointments.length, manager.doctors.length]);

  const billableAppointments = useMemo(
    () => manager.appointments.filter((a) => a.status !== 'Cancelled'),
    [manager.appointments, manager.appointments.length]
  );

  return (
    <div className="space-y-5">
      {/* Top Revenue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-500">Total Billed Revenue</p>
          <p className="mt-2 text-2xl font-display font-bold text-slate-900 tabular-nums">
            {formatINR(totalRevenue)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Across all scheduled and completed appointments
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-500">Collected (Completed)</p>
          <p className="mt-2 text-2xl font-display font-bold text-emerald-700 tabular-nums">
            {formatINR(collectedRevenue)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Settled from completed consultations</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-500">Scheduled Receivables</p>
          <p className="mt-2 text-2xl font-display font-bold text-blue-700 tabular-nums">
            {formatINR(pendingRevenue)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Pending upcoming scheduled visits</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start" role="tablist" aria-label="Billing summary views">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'patients'}
            onClick={() => setActiveTab('patients')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'patients'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Per-Patient Billing
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'doctors'}
            onClick={() => setActiveTab('doctors')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'doctors'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Per-Doctor Revenue
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[210px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter billing ledger..."
              aria-label="Filter billing ledger"
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <select
            aria-label="Sort billing rows"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="amount-desc">Sort: Amount (High–Low)</option>
            <option value="name">Sort: Name (A–Z)</option>
          </select>
        </div>
      </div>

      {/* Patient or Doctor Ledger */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {activeTab === 'patients' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Patient ID</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4 text-right">Appointments</th>
                  <th className="py-3 px-4 text-right">Collected</th>
                  <th className="py-3 px-4 text-right">Pending</th>
                  <th className="py-3 px-4 text-right">Total Billed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {patientBilling.map((row) => (
                  <tr key={row.patient.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{row.patient.id}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{row.patient.name}</td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-slate-700">
                      {row.appointmentCount} ({row.completedCount} done)
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-700 tabular-nums">
                      {formatINR(row.collectedAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600 tabular-nums">
                      {formatINR(row.pendingAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatINR(row.totalBilled)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Doctor ID</th>
                  <th className="py-3 px-4">Doctor & Specialization</th>
                  <th className="py-3 px-4 text-right">Unit Fee</th>
                  <th className="py-3 px-4 text-right">Visits</th>
                  <th className="py-3 px-4 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {doctorBilling.map((row) => (
                  <tr key={row.doctor.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{row.doctor.id}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{row.doctor.name}</p>
                      <p className="text-xs text-slate-500">
                        {row.doctor.getDoctorCategory()} · {row.doctor.specialization}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700 tabular-nums">
                      {formatINR(row.consultationFee)}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-slate-700">
                      {row.appointmentCount} ({row.completedCount} completed)
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-700 tabular-nums">
                      {formatINR(row.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Itemized Billable Breakdown Section */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Itemized Appointment Invoices
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspect detailed consultation fee line items for each appointment
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Invoice / Appt</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {billableAppointments.map((appt) => (
                <tr key={appt.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono text-xs text-slate-700">{appt.id}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">{appt.patient.name}</td>
                  <td className="py-3 px-4 text-xs text-slate-600">{appt.getBillingDescription()}</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                    {formatINR(appt.calculateFee())}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setInspectedAppointment(appt)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800"
                    >
                      <Receipt className="w-3.5 h-3.5" aria-hidden="true" />
                      View Items
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {inspectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-display text-base font-bold text-slate-900">
                Invoice Breakdown · {inspectedAppointment.id}
              </h3>
              <button
                type="button"
                onClick={() => setInspectedAppointment(null)}
                aria-label="Close invoice breakdown"
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-2.5 text-sm">
              <p className="text-xs text-slate-500">
                Patient: <span className="font-semibold text-slate-900">{inspectedAppointment.patient.name}</span>
              </p>
              {inspectedAppointment.getBillingBreakdown().map((line, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-700">{line.label}</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {formatINR(line.amount)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 font-bold">
                <span className="text-slate-900">Total Billable Fee</span>
                <span className="font-mono text-blue-700 tabular-nums">
                  {formatINR(inspectedAppointment.calculateFee())}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
