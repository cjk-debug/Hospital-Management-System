import React, { useMemo, useState } from 'react';
import { CalendarPlus, Check, FilePlus2, RefreshCw, Search, X, XCircle } from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { Appointment, AppointmentStatus } from '../models/Appointment';
import { formatINR, getTodayIsoDate } from '../utils/validation';
import { AppointmentStatusBadge } from './StatusBadge';

export function AppointmentsView() {
  const { manager, refresh, notify, canCreateMedicalRecords, setActiveSection } = useHospital();
  const today = getTodayIsoDate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | AppointmentStatus>('All');
  const [dateFilter, setDateFilter] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'fee-desc'>('date-desc');

  // Book / Reschedule modal state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [formError, setFormError] = useState('');
  const [apptId, setApptId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState(today);
  const [timeSlot, setTimeSlot] = useState('');
  const [reason, setReason] = useState('');

  // Quick Medical Record Modal linked to Completed appointment
  const [recordTarget, setRecordTarget] = useState<Appointment | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [notes, setNotes] = useState('');
  const [recordError, setRecordError] = useState('');

  const filteredAppointments = useMemo(() => {
    let list = manager.search('appointment', searchQuery);
    if (statusFilter !== 'All') {
      list = list.filter((a) => a.status === statusFilter);
    }
    if (dateFilter) {
      list = list.filter((a) => a.date === dateFilter);
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'date-asc') return `${a.date} ${a.timeSlot}`.localeCompare(`${b.date} ${b.timeSlot}`);
      if (sortBy === 'fee-desc') return b.calculateFee() - a.calculateFee();
      return `${b.date} ${b.timeSlot}`.localeCompare(`${a.date} ${a.timeSlot}`);
    });
  }, [manager, searchQuery, statusFilter, dateFilter, sortBy, manager.appointments.length]);

  const selectedDoctor = useMemo(
    () => manager.getDoctorById(doctorId),
    [manager, doctorId, manager.doctors.length]
  );

  const openBookModal = () => {
    const firstPatient = manager.patients[0]?.id ?? '';
    const firstDoc = manager.doctors[0];
    setRescheduleTarget(null);
    setFormError('');
    setApptId(manager.generateNextId('APT'));
    setPatientId(firstPatient);
    setDoctorId(firstDoc?.id ?? '');
    setDate(today);
    setTimeSlot(firstDoc?.availability[0] ?? '');
    setReason('');
    setBookingModalOpen(true);
  };

  const openRescheduleModal = (appt: Appointment) => {
    setRescheduleTarget(appt);
    setFormError('');
    setApptId(appt.id);
    setPatientId(appt.patient.id);
    setDoctorId(appt.doctor.id);
    setDate(appt.date >= today ? appt.date : today);
    setTimeSlot(appt.timeSlot);
    setReason(appt.reason);
    setBookingModalOpen(true);
  };

  const handleDoctorChange = (nextDocId: string) => {
    setDoctorId(nextDocId);
    const doc = manager.getDoctorById(nextDocId);
    if (doc && !doc.isAvailableAt(timeSlot)) {
      setTimeSlot(doc.availability[0] ?? '');
    }
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      if (rescheduleTarget) {
        manager.rescheduleAppointment(rescheduleTarget.id, date, timeSlot);
        refresh();
        notify('success', `Rescheduled appointment ${rescheduleTarget.id} to ${date} at ${timeSlot}.`);
      } else {
        const created = manager.bookAppointment({
          id: apptId,
          patientId,
          doctorId,
          date,
          timeSlot,
          reason,
        });
        refresh();
        notify(
          'success',
          `Booked ${created.id} for ${created.patient.name} with ${created.doctor.name} (${formatINR(created.fee)}).`
        );
      }
      setBookingModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save appointment.');
    }
  };

  const handleComplete = (appt: Appointment) => {
    try {
      manager.completeAppointment(appt.id);
      refresh();
      notify('success', `Marked ${appt.id} as Completed.`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to complete appointment.');
    }
  };

  const handleCancel = (appt: Appointment) => {
    try {
      manager.cancelAppointment(appt.id);
      refresh();
      notify('info', `Cancelled appointment ${appt.id}. Time slot is now open.`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to cancel appointment.');
    }
  };

  const openAddRecordForAppointment = (appt: Appointment) => {
    if (!canCreateMedicalRecords) {
      notify('error', 'Only Admin / Clinical staff can write diagnosis & prescription records.');
      return;
    }
    setRecordTarget(appt);
    setDiagnosis('');
    setPrescription('');
    setNotes('');
    setRecordError('');
  };

  const handleRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordTarget) return;
    setRecordError('');
    try {
      const rec = manager.addMedicalRecord({
        id: manager.generateNextId('REC'),
        patientId: recordTarget.patient.id,
        doctorId: recordTarget.doctor.id,
        diagnosis,
        prescription,
        notes,
        date: recordTarget.date,
        appointmentId: recordTarget.id,
      });
      refresh();
      notify('success', `Saved medical record ${rec.id} for ${recordTarget.patient.name}.`);
      setRecordTarget(null);
      setActiveSection('records');
    } catch (err) {
      setRecordError(err instanceof Error ? err.message : 'Unable to save medical record.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col xl:flex-row xl:items-center gap-3 justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient, doctor, ID, or specialization..."
              aria-label="Search appointments"
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg" role="group" aria-label="Filter appointments by status">
            {(['All', 'Scheduled', 'Completed', 'Cancelled'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <input
            type="date"
            aria-label="Filter by date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none"
          />

          <select
            aria-label="Sort appointments"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none"
          >
            <option value="date-desc">Sort: Newest Date</option>
            <option value="date-asc">Sort: Earliest Date</option>
            <option value="fee-desc">Sort: Fee (High–Low)</option>
          </select>
        </div>

        <button
          type="button"
          onClick={openBookModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
        >
          <CalendarPlus className="w-4 h-4" aria-hidden="true" />
          Book Appointment
        </button>
      </div>

      {/* Appointments Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredAppointments.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-700">No appointments match your current filter.</p>
            <button
              type="button"
              onClick={openBookModal}
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
                  <th className="py-3 px-4">Appt ID</th>
                  <th className="py-3 px-4">Schedule</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Fee</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAppointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {appt.id}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="font-mono text-xs font-semibold text-slate-900">{appt.date}</p>
                      <p className="font-mono text-xs text-slate-500">{appt.timeSlot}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{appt.patient.name}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">{appt.reason}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-900">{appt.doctor.name}</p>
                      <p className="text-xs text-slate-500">{appt.doctor.specialization}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <AppointmentStatusBadge status={appt.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatINR(appt.calculateFee())}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {appt.status === 'Scheduled' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openRescheduleModal(appt)}
                              aria-label={`Reschedule ${appt.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                              Reschedule
                            </button>
                            <button
                              type="button"
                              onClick={() => handleComplete(appt)}
                              aria-label={`Complete ${appt.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                            >
                              <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              Complete
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancel(appt)}
                              aria-label={`Cancel ${appt.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                              Cancel
                            </button>
                          </>
                        )}
                        {appt.status === 'Completed' && canCreateMedicalRecords && (
                          <button
                            type="button"
                            onClick={() => openAddRecordForAppointment(appt)}
                            aria-label={`Add medical record for ${appt.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-700 hover:bg-blue-50"
                          >
                            <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Add Record
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Book / Reschedule Modal */}
      {bookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="appt-modal-title"
            className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-8"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 id="appt-modal-title" className="font-display text-lg font-bold text-slate-900">
                {rescheduleTarget ? `Reschedule Appointment (${rescheduleTarget.id})` : 'Book Appointment'}
              </h2>
              <button
                type="button"
                onClick={() => setBookingModalOpen(false)}
                aria-label="Close modal"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="p-6 space-y-4" noValidate>
              {formError && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                  {formError}
                </div>
              )}

              {!rescheduleTarget && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="appt-id" className="block text-xs font-semibold text-slate-700 mb-1">
                      Appointment ID
                    </label>
                    <input
                      id="appt-id"
                      type="text"
                      value={apptId}
                      onChange={(e) => setApptId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="appt-patient" className="block text-xs font-semibold text-slate-700 mb-1">
                      Patient
                    </label>
                    <select
                      id="appt-patient"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                    >
                      {manager.patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="appt-doctor" className="block text-xs font-semibold text-slate-700 mb-1">
                    Doctor
                  </label>
                  <select
                    id="appt-doctor"
                    value={doctorId}
                    disabled={Boolean(rescheduleTarget)}
                    onChange={(e) => handleDoctorChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white disabled:bg-slate-100"
                  >
                    {manager.doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} · {d.specialization} ({formatINR(d.calculateConsultationFee())})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="appt-date" className="block text-xs font-semibold text-slate-700 mb-1">
                    Appointment Date
                  </label>
                  <input
                    id="appt-date"
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="appt-slot" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Time Slot (booked slots marked to prevent double-booking)
                </label>
                <select
                  id="appt-slot"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono bg-white"
                >
                  {(selectedDoctor?.availability ?? []).map((slot) => {
                    const booked = manager.isSlotBooked(
                      doctorId,
                      date,
                      slot,
                      rescheduleTarget?.id
                    );
                    return (
                      <option key={slot} value={slot}>
                        {slot} {booked ? '— Already Booked' : '— Available'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {!rescheduleTarget && (
                <div>
                  <label htmlFor="appt-reason" className="block text-xs font-semibold text-slate-700 mb-1">
                    Visit Reason
                  </label>
                  <input
                    id="appt-reason"
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Routine Clinical Consultation"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              )}

              {selectedDoctor && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Auto-Calculated Consultation Fee</p>
                    <p className="text-xs text-slate-500">
                      {selectedDoctor.getRole()} · {selectedDoctor.experience} yrs exp
                    </p>
                  </div>
                  <span className="font-mono text-lg font-bold text-blue-700 tabular-nums">
                    {formatINR(selectedDoctor.calculateConsultationFee())}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setBookingModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  {rescheduleTarget ? 'Save New Schedule' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Medical Record from Completed Appointment */}
      {recordTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-rec-title"
            className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 id="quick-rec-title" className="font-display text-lg font-bold text-slate-900">
                  Add Medical Record
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {recordTarget.patient.name} · {recordTarget.doctor.name} ({recordTarget.date})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRecordTarget(null)}
                aria-label="Close modal"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecordSubmit} className="p-6 space-y-4" noValidate>
              {recordError && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                  {recordError}
                </div>
              )}
              <div>
                <label htmlFor="qrec-diag" className="block text-xs font-semibold text-slate-700 mb-1">
                  Diagnosis
                </label>
                <input
                  id="qrec-diag"
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g., Acute Bronchitis"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="qrec-rx" className="block text-xs font-semibold text-slate-700 mb-1">
                  Prescription
                </label>
                <textarea
                  id="qrec-rx"
                  rows={2}
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                  placeholder="Medications, dosage, and duration"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="qrec-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                  Clinical Notes
                </label>
                <textarea
                  id="qrec-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Follow-up instructions"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setRecordTarget(null)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Save Medical Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
