import React, { useMemo, useState } from 'react';
import { FilePlus2, Search, ShieldAlert, X } from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { getTodayIsoDate } from '../utils/validation';

export function MedicalRecordsView() {
  const { manager, refresh, notify, canCreateMedicalRecords } = useHospital();
  const today = getTodayIsoDate();

  const [searchQuery, setSearchQuery] = useState('');
  const [patientFilter, setPatientFilter] = useState('All');
  const [doctorFilter, setDoctorFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState<'date-desc' | 'date-asc'>('date-desc');

  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [recordId, setRecordId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(today);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = manager.medicalRecords.filter((rec) => {
      if (patientFilter !== 'All' && rec.patient.id !== patientFilter) return false;
      if (doctorFilter !== 'All' && rec.doctor.id !== doctorFilter) return false;
      if (!q) return true;
      return (
        rec.id.toLowerCase().includes(q) ||
        rec.diagnosis.toLowerCase().includes(q) ||
        rec.prescription.toLowerCase().includes(q) ||
        rec.patient.name.toLowerCase().includes(q) ||
        rec.doctor.name.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) =>
      sortOrder === 'date-desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
    );
  }, [manager.medicalRecords, searchQuery, patientFilter, doctorFilter, sortOrder, manager.medicalRecords.length]);

  const openAddModal = () => {
    if (!canCreateMedicalRecords) {
      notify('error', 'Only Admin / Clinical staff can author medical records.');
      return;
    }
    setFormError('');
    setRecordId(manager.generateNextId('REC'));
    setPatientId(manager.patients[0]?.id ?? '');
    setDoctorId(manager.doctors[0]?.id ?? '');
    setAppointmentId('');
    setDiagnosis('');
    setPrescription('');
    setNotes('');
    setDate(today);
    setModalOpen(true);
  };

  const eligibleAppointments = useMemo(
    () =>
      manager.appointments.filter(
        (a) => a.patient.id === patientId && a.status !== 'Cancelled'
      ),
    [manager.appointments, patientId, manager.appointments.length]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const created = manager.addMedicalRecord({
        id: recordId,
        patientId,
        doctorId,
        diagnosis,
        prescription,
        notes,
        date,
        appointmentId: appointmentId || undefined,
      });
      refresh();
      notify('success', `Added medical record ${created.id} for ${created.patient.name}.`);
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save medical record.');
    }
  };

  return (
    <div className="space-y-5">
      {!canCreateMedicalRecords && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Receptionist view: Medical records are read-only. Sign in as Admin to log diagnoses and prescriptions.</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search diagnosis, prescription, patient, or doctor..."
              aria-label="Search medical records"
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <select
            aria-label="Filter records by patient"
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="All">All Patients</option>
            {manager.patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.id})
              </option>
            ))}
          </select>

          <select
            aria-label="Filter records by doctor"
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="All">All Doctors</option>
            {manager.doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort medical records"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="date-desc">Sort: Newest First</option>
            <option value="date-asc">Sort: Oldest First</option>
          </select>
        </div>

        {canCreateMedicalRecords && (
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
          >
            <FilePlus2 className="w-4 h-4" aria-hidden="true" />
            Add Medical Record
          </button>
        )}
      </div>

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm font-medium text-slate-700">No medical records match your filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecords.map((rec) => (
            <article key={rec.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500 font-mono">
                    {rec.id} · {rec.date}
                    {rec.appointmentId ? ` · Appt ${rec.appointmentId}` : ''}
                  </p>
                  <h3 className="font-display text-base font-bold text-slate-900 mt-1">
                    {rec.diagnosis}
                  </h3>
                </div>
              </div>

              <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100">
                <span>
                  Patient: <strong className="text-slate-900">{rec.patient.name}</strong> ({rec.patient.id})
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Doctor: <strong className="text-slate-900">{rec.doctor.name}</strong> ({rec.doctor.specialization})
                </span>
              </div>

              <div className="space-y-1.5 text-sm">
                <p className="text-slate-800">
                  <span className="font-semibold text-blue-700">Prescription: </span>
                  {rec.prescription}
                </p>
                {rec.notes && (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <span className="font-semibold text-slate-700">Clinical Notes: </span>
                    {rec.notes}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Add Medical Record Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rec-modal-title"
            className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-8"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 id="rec-modal-title" className="font-display text-lg font-bold text-slate-900">
                Log Medical Record
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
              {formError && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="rec-id" className="block text-xs font-semibold text-slate-700 mb-1">
                    Record ID
                  </label>
                  <input
                    id="rec-id"
                    type="text"
                    value={recordId}
                    onChange={(e) => setRecordId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="rec-date" className="block text-xs font-semibold text-slate-700 mb-1">
                    Record Date
                  </label>
                  <input
                    id="rec-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="rec-patient" className="block text-xs font-semibold text-slate-700 mb-1">
                    Patient
                  </label>
                  <select
                    id="rec-patient"
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
                <div>
                  <label htmlFor="rec-doctor" className="block text-xs font-semibold text-slate-700 mb-1">
                    Attending Doctor
                  </label>
                  <select
                    id="rec-doctor"
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    {manager.doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.specialization})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="rec-appt" className="block text-xs font-semibold text-slate-700 mb-1">
                  Link to Appointment (optional)
                </label>
                <select
                  id="rec-appt"
                  value={appointmentId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setAppointmentId(selectedId);
                    const matched = manager.getAppointmentById(selectedId);
                    if (matched) {
                      setDoctorId(matched.doctor.id);
                      setDate(matched.date);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">Standalone Clinical Note</option>
                  {eligibleAppointments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id} · {a.date} {a.timeSlot} · {a.doctor.name} ({a.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="rec-diag" className="block text-xs font-semibold text-slate-700 mb-1">
                  Diagnosis
                </label>
                <input
                  id="rec-diag"
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Primary clinical diagnosis"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="rec-rx" className="block text-xs font-semibold text-slate-700 mb-1">
                  Prescription
                </label>
                <textarea
                  id="rec-rx"
                  rows={2}
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                  placeholder="Medication name, dosage, frequency"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="rec-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="rec-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observations & follow-up guidance"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
