import React, { useMemo, useState } from 'react';
import { Edit2, Eye, Plus, Search, Trash2, X } from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import { Patient } from '../models/Patient';
import { BloodGroup, formatINR, Gender } from '../utils/validation';
import { AppointmentStatusBadge } from './StatusBadge';

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface PatientFormState {
  id: string;
  name: string;
  age: string;
  gender: Gender;
  phone: string;
  email: string;
  bloodGroup: BloodGroup;
  address: string;
  medicalHistoryText: string;
}

export function PatientsView() {
  const { manager, refresh, notify, canDeleteEntities } = useHospital();

  const [searchQuery, setSearchQuery] = useState('');
  const [bloodFilter, setBloodFilter] = useState<'All' | BloodGroup>('All');
  const [sortBy, setSortBy] = useState<'name' | 'age-desc' | 'id'>('name');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [formError, setFormError] = useState('');
  const [historyPatient, setHistoryPatient] = useState<Patient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);

  const [form, setForm] = useState<PatientFormState>({
    id: '',
    name: '',
    age: '30',
    gender: 'Male',
    phone: '',
    email: '',
    bloodGroup: 'O+',
    address: '',
    medicalHistoryText: '',
  });

  const filteredPatients = useMemo(() => {
    let list = manager.search('patient', searchQuery);
    if (bloodFilter !== 'All') {
      list = list.filter((p) => p.bloodGroup === bloodFilter);
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'age-desc') return b.age - a.age;
      if (sortBy === 'id') return a.id.localeCompare(b.id);
      return a.name.localeCompare(b.name);
    });
  }, [manager, searchQuery, bloodFilter, sortBy, manager.patients.length]);

  const openRegisterModal = () => {
    setEditingPatient(null);
    setFormError('');
    setForm({
      id: manager.generateNextId('PAT'),
      name: '',
      age: '30',
      gender: 'Female',
      phone: '',
      email: '',
      bloodGroup: 'O+',
      address: '',
      medicalHistoryText: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (patient: Patient) => {
    setEditingPatient(patient);
    setFormError('');
    setForm({
      id: patient.id,
      name: patient.name,
      age: String(patient.age),
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      bloodGroup: patient.bloodGroup,
      address: patient.address,
      medicalHistoryText: patient.medicalHistory.join('\n'),
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const historyList = form.medicalHistoryText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      if (editingPatient) {
        manager.updatePatient(editingPatient.id, {
          name: form.name,
          age: Number(form.age),
          gender: form.gender,
          phone: form.phone,
          email: form.email,
          bloodGroup: form.bloodGroup,
          address: form.address,
          medicalHistory: historyList,
        });
        refresh();
        notify('success', `Updated patient record for ${form.name}.`);
      } else {
        const patient = new Patient({
          id: form.id,
          name: form.name,
          age: Number(form.age),
          gender: form.gender,
          phone: form.phone,
          email: form.email,
          bloodGroup: form.bloodGroup,
          address: form.address,
          medicalHistory: historyList,
        });
        manager.registerPatient(patient);
        refresh();
        notify('success', `Registered patient ${patient.name} (${patient.id}).`);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save patient.');
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (!canDeleteEntities) {
      notify('error', 'Only Admin users can delete patient records.');
      setDeleteTarget(null);
      return;
    }
    try {
      manager.deletePatient(deleteTarget.id);
      refresh();
      notify('success', `Deleted patient ${deleteTarget.name}.`);
      setDeleteTarget(null);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Unable to delete patient.');
      setDeleteTarget(null);
    }
  };

  const historyAppointments = useMemo(() => {
    if (!historyPatient) return [];
    return manager.appointments
      .filter((a) => a.patient.id === historyPatient.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [historyPatient, manager.appointments.length]);

  const historyRecords = useMemo(() => {
    if (!historyPatient) return [];
    return manager.getRecordsByPatient(historyPatient.id);
  }, [historyPatient, manager.medicalRecords.length]);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patients by name, ID, or phone..."
              aria-label="Search patients"
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <select
            aria-label="Filter by blood group"
            value={bloodFilter}
            onChange={(e) => setBloodFilter(e.target.value as 'All' | BloodGroup)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none"
          >
            <option value="All">All Blood Groups</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                Blood Group {bg}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort patients"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none"
          >
            <option value="name">Sort: Name (A–Z)</option>
            <option value="id">Sort: Patient ID</option>
            <option value="age-desc">Sort: Age (High–Low)</option>
          </select>
        </div>

        <button
          type="button"
          onClick={openRegisterModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Register Patient
        </button>
      </div>

      {/* Patients Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredPatients.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-700">No patients found.</p>
            <button
              type="button"
              onClick={openRegisterModal}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
            >
              Register First Patient
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Patient ID</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Blood Group</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {patient.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{patient.name}</p>
                      <p className="text-xs text-slate-500">
                        {patient.age} yrs · {patient.gender}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-red-700 whitespace-nowrap">
                      {patient.bloodGroup}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-slate-800 font-mono text-xs">{patient.phone}</p>
                      <p className="text-xs text-slate-500">{patient.email}</p>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                      {patient.address}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setHistoryPatient(patient)}
                          aria-label={`View history for ${patient.name}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          History
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(patient)}
                          aria-label={`Edit ${patient.name}`}
                          className="p-2 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {canDeleteEntities && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(patient)}
                            aria-label={`Delete ${patient.name}`}
                            className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Register / Edit Patient Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="patient-modal-title"
            className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-8"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 id="patient-modal-title" className="font-display text-lg font-bold text-slate-900">
                {editingPatient ? `Edit Patient (${editingPatient.id})` : 'Register New Patient'}
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

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto" noValidate>
              {formError && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pat-id" className="block text-xs font-semibold text-slate-700 mb-1">
                    Patient ID
                  </label>
                  <input
                    id="pat-id"
                    type="text"
                    value={form.id}
                    disabled={Boolean(editingPatient)}
                    onChange={(e) => setForm({ ...form, id: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="pat-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    id="pat-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Anjali Subramanian"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="pat-age" className="block text-xs font-semibold text-slate-700 mb-1">
                    Age (0–120)
                  </label>
                  <input
                    id="pat-age"
                    type="number"
                    min={0}
                    max={120}
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="pat-gender" className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender
                  </label>
                  <select
                    id="pat-gender"
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="pat-blood" className="block text-xs font-semibold text-slate-700 mb-1">
                    Blood Group
                  </label>
                  <select
                    id="pat-blood"
                    value={form.bloodGroup}
                    onChange={(e) => setForm({ ...form, bloodGroup: e.target.value as BloodGroup })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="pat-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="pat-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98112 55667"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="pat-email" className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="pat-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="patient@example.in"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="pat-address" className="block text-xs font-semibold text-slate-700 mb-1">
                    Residential Address
                  </label>
                  <input
                    id="pat-address"
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="24 MG Road, Kochi, Kerala"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="pat-history" className="block text-xs font-semibold text-slate-700 mb-1">
                    Prior Medical History (one entry per line, optional)
                  </label>
                  <textarea
                    id="pat-history"
                    rows={3}
                    value={form.medicalHistoryText}
                    onChange={(e) => setForm({ ...form, medicalHistoryText: e.target.value })}
                    placeholder="Penicillin Allergy&#10;Appendectomy (2019)"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
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
                  {editingPatient ? 'Save Changes' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Full History Modal */}
      {historyPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-modal-title"
            className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-8"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 id="history-modal-title" className="font-display text-lg font-bold text-slate-900">
                  {historyPatient.name} — Clinical History
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {historyPatient.id} · {historyPatient.age} yrs · {historyPatient.gender} · Blood Group {historyPatient.bloodGroup}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryPatient(null)}
                aria-label="Close patient history"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
              {/* Contact & Baseline History */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pb-5 border-b border-slate-200">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Contact</p>
                  <p className="text-slate-900 mt-1">{historyPatient.phone} · {historyPatient.email}</p>
                  <p className="text-xs text-slate-500 mt-1">{historyPatient.address}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Medical History Notes</p>
                  {historyPatient.medicalHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 mt-1">No prior history recorded.</p>
                  ) : (
                    <ul className="mt-1 space-y-1 text-xs text-slate-700 list-disc pl-4">
                      {historyPatient.medicalHistory.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Appointments */}
              <div>
                <h3 className="font-display text-sm font-semibold text-slate-900 mb-3">
                  Appointments ({historyAppointments.length})
                </h3>
                {historyAppointments.length === 0 ? (
                  <p className="text-xs text-slate-500">No appointments booked for this patient.</p>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                          <th className="py-2.5 px-3">Date & Slot</th>
                          <th className="py-2.5 px-3">Doctor</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Fee</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {historyAppointments.map((a) => (
                          <tr key={a.id}>
                            <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                              {a.date} · {a.timeSlot}
                            </td>
                            <td className="py-2.5 px-3">
                              {a.doctor.name} ({a.doctor.specialization})
                            </td>
                            <td className="py-2.5 px-3">
                              <AppointmentStatusBadge status={a.status} />
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                              {formatINR(a.calculateFee())}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Medical Records */}
              <div>
                <h3 className="font-display text-sm font-semibold text-slate-900 mb-3">
                  Medical Records ({historyRecords.length})
                </h3>
                {historyRecords.length === 0 ? (
                  <p className="text-xs text-slate-500">No medical records logged yet.</p>
                ) : (
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
                    {historyRecords.map((rec) => (
                      <div key={rec.id} className="p-4 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">{rec.diagnosis}</p>
                          <span className="font-mono text-xs text-slate-500">{rec.date}</span>
                        </div>
                        <p className="text-xs text-blue-700 mt-1">Rx: {rec.prescription}</p>
                        {rec.notes && <p className="text-xs text-slate-600 mt-1">{rec.notes}</p>}
                        <p className="text-xs text-slate-400 mt-1.5">Recorded by {rec.doctor.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold text-slate-900">Delete Patient</h3>
            <p className="mt-2 text-sm text-slate-600">
              Confirm deletion of <span className="font-semibold text-slate-900">{deleteTarget.name}</span> ({deleteTarget.id})?
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete Patient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
