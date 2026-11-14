import React, { useMemo, useState } from 'react';
import { Edit2, Plus, Search, ShieldAlert, Trash2, X } from 'lucide-react';
import { useHospital } from '../context/HospitalContext';
import {
  createDoctorByCategory,
  Doctor,
  DoctorCategory,
  SPECIALIST_BASE_FEES,
  SPECIALIST_DISCIPLINES,
  TIME_SLOTS,
} from '../models/Doctor';
import { formatINR, Gender } from '../utils/validation';

interface DoctorFormState {
  id: string;
  name: string;
  age: string;
  gender: Gender;
  phone: string;
  email: string;
  category: DoctorCategory;
  specialization: string;
  experience: string;
  surgicalBaseFee: string;
  availability: string[];
}

export function DoctorsView() {
  const { manager, refresh, notify, canManageDoctors } = useHospital();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | DoctorCategory>('All');
  const [specializationFilter, setSpecializationFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'fee-desc' | 'fee-asc' | 'exp-desc'>('name');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Doctor | null>(null);

  const [form, setForm] = useState<DoctorFormState>({
    id: '',
    name: '',
    age: '35',
    gender: 'Male',
    phone: '',
    email: '',
    category: 'GeneralPhysician',
    specialization: 'General Medicine',
    experience: '5',
    surgicalBaseFee: '2000',
    availability: TIME_SLOTS.slice(0, 6),
  });

  const specializationsList = useMemo(() => {
    const set = new Set<string>(manager.doctors.map((d) => d.specialization));
    return ['All', ...Array.from(set).sort()];
  }, [manager, manager.doctors.length]);

  const filteredDoctors = useMemo(() => {
    let list = manager.search('doctor', searchQuery);
    if (categoryFilter !== 'All') {
      list = list.filter((d) => d.getDoctorCategory() === categoryFilter);
    }
    if (specializationFilter !== 'All') {
      list = list.filter((d) => d.specialization === specializationFilter);
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'fee-desc') return b.calculateConsultationFee() - a.calculateConsultationFee();
      if (sortBy === 'fee-asc') return a.calculateConsultationFee() - b.calculateConsultationFee();
      if (sortBy === 'exp-desc') return b.experience - a.experience;
      return a.name.localeCompare(b.name);
    });
  }, [manager, searchQuery, categoryFilter, specializationFilter, sortBy, manager.doctors.length]);

  const openAddModal = () => {
    if (!canManageDoctors) {
      notify('error', 'Only Admin users can add or modify doctor profiles.');
      return;
    }
    setEditingDoctor(null);
    setFormError('');
    setForm({
      id: manager.generateNextId('DOC'),
      name: '',
      age: '36',
      gender: 'Female',
      phone: '',
      email: '',
      category: 'Specialist',
      specialization: 'Cardiologist',
      experience: '8',
      surgicalBaseFee: '2000',
      availability: TIME_SLOTS.slice(0, 6),
    });
    setModalOpen(true);
  };

  const openEditModal = (doc: Doctor) => {
    if (!canManageDoctors) {
      notify('error', 'Only Admin users can edit doctor profiles.');
      return;
    }
    setEditingDoctor(doc);
    setFormError('');
    setForm({
      id: doc.id,
      name: doc.name,
      age: String(doc.age),
      gender: doc.gender,
      phone: doc.phone,
      email: doc.email,
      category: doc.getDoctorCategory(),
      specialization: doc.specialization,
      experience: String(doc.experience),
      surgicalBaseFee: '2000',
      availability: doc.availability,
    });
    setModalOpen(true);
  };

  const handleCategoryChange = (cat: DoctorCategory) => {
    let nextSpec = form.specialization;
    if (cat === 'GeneralPhysician') {
      nextSpec = 'General Medicine';
    } else if (cat === 'Specialist' && !SPECIALIST_DISCIPLINES.includes(form.specialization as never)) {
      nextSpec = 'Cardiologist';
    } else if (cat === 'Surgeon' && form.specialization === 'General Medicine') {
      nextSpec = 'General Surgery';
    }
    setForm((prev) => ({ ...prev, category: cat, specialization: nextSpec }));
  };

  const toggleSlot = (slot: string) => {
    setForm((prev) => {
      const exists = prev.availability.includes(slot);
      const next = exists
        ? prev.availability.filter((s) => s !== slot)
        : [...prev.availability, slot];
      return { ...prev, availability: next };
    });
  };

  const previewFee = useMemo(() => {
    const exp = Number.parseInt(form.experience, 10) || 0;
    if (form.category === 'GeneralPhysician') return 300;
    if (form.category === 'Specialist') {
      const base = SPECIALIST_BASE_FEES[form.specialization as keyof typeof SPECIALIST_BASE_FEES] ?? 950;
      return base + Math.min(Math.max(exp, 0) * 50, 500);
    }
    const surgBase = Math.max(Number.parseInt(form.surgicalBaseFee, 10) || 2000, 1500);
    return surgBase + Math.max(exp, 0) * 150;
  }, [form.category, form.specialization, form.experience, form.surgicalBaseFee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const ageNum = Number(form.age);
      const expNum = Number(form.experience);
      const surgBase = Number(form.surgicalBaseFee);

      if (editingDoctor) {
        manager.updateDoctor(editingDoctor.id, {
          name: form.name,
          age: ageNum,
          gender: form.gender,
          phone: form.phone,
          email: form.email,
          category: form.category,
          specialization: form.specialization,
          experience: expNum,
          availability: form.availability,
          surgicalBaseFee: form.category === 'Surgeon' ? surgBase : undefined,
        });
        refresh();
        notify('success', `Updated profile for ${form.name}.`);
      } else {
        const doc = createDoctorByCategory({
          id: form.id,
          name: form.name,
          age: ageNum,
          gender: form.gender,
          phone: form.phone,
          email: form.email,
          category: form.category,
          specialization: form.specialization,
          experience: expNum,
          availability: form.availability,
          surgicalBaseFee: form.category === 'Surgeon' ? surgBase : undefined,
        });
        manager.addDoctor(doc);
        refresh();
        notify('success', `Added ${doc.name} (${doc.getRole()}) with fee ${formatINR(doc.calculateConsultationFee())}.`);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save doctor.');
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    try {
      manager.deleteDoctor(deleteTarget.id);
      refresh();
      notify('success', `Removed ${deleteTarget.name} from directory.`);
      setDeleteTarget(null);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Unable to delete doctor.');
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Category Fee Overview Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500">GeneralPhysician</p>
          <p className="mt-1 text-lg font-display font-bold text-slate-900 tabular-nums">₹300 flat</p>
          <p className="mt-0.5 text-xs text-slate-500">Primary care & general medicine</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500">Specialist</p>
          <p className="mt-1 text-lg font-display font-bold text-slate-900 tabular-nums">₹800 – ₹1,900</p>
          <p className="mt-0.5 text-xs text-slate-500">Cardiology, Neurology, Ortho, Pediatrics, Derm</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500">Surgeon</p>
          <p className="mt-1 text-lg font-display font-bold text-slate-900 tabular-nums">₹2,000 + ₹150/yr</p>
          <p className="mt-0.5 text-xs text-slate-500">Highest tier with experience-based surcharge</p>
        </div>
      </div>

      {!canManageDoctors && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Receptionist view: Doctor directory is read-only. Sign in as Admin to add, edit, or delete doctors.</span>
        </div>
      )}

      {/* Toolbar: Search, Filter, Sort, Add */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search doctors by name, ID, or specialization..."
              aria-label="Search doctors"
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg" role="group" aria-label="Filter by doctor category">
            {(['All', 'GeneralPhysician', 'Specialist', 'Surgeon'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'GeneralPhysician' ? 'General' : cat}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by specialization"
            value={specializationFilter}
            onChange={(e) => setSpecializationFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none"
          >
            {specializationsList.map((spec) => (
              <option key={spec} value={spec}>
                {spec === 'All' ? 'All Specializations' : spec}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort doctors"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none"
          >
            <option value="name">Sort: Name (A–Z)</option>
            <option value="fee-desc">Sort: Fee (High–Low)</option>
            <option value="fee-asc">Sort: Fee (Low–High)</option>
            <option value="exp-desc">Sort: Experience</option>
          </select>
        </div>

        {canManageDoctors && (
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Doctor
          </button>
        )}
      </div>

      {/* Doctors Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredDoctors.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-700">No doctors match your current filters.</p>
            <p className="text-xs text-slate-500 mt-1">Adjust your search query or category filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Class / Specialization</th>
                  <th className="py-3 px-4">Experience</th>
                  <th className="py-3 px-4">Available Slots</th>
                  <th className="py-3 px-4 text-right">Consultation Fee</th>
                  {canManageDoctors && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredDoctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {doc.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{doc.name}</p>
                      <p className="text-xs text-slate-500">
                        {doc.age} yrs · {doc.gender} · {doc.phone}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-800">{doc.specialization}</p>
                      <p className="text-xs text-slate-500 font-mono">{doc.getDoctorCategory()}</p>
                    </td>
                    <td className="py-3.5 px-4 tabular-nums text-slate-700 whitespace-nowrap">
                      {doc.experience} yrs
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs">
                      {doc.availability.slice(0, 3).join(', ')}
                      {doc.availability.length > 3 ? ` +${doc.availability.length - 3} more` : ''}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-blue-700 tabular-nums whitespace-nowrap">
                      {formatINR(doc.calculateConsultationFee())}
                    </td>
                    {canManageDoctors && (
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(doc)}
                            aria-label={`Edit ${doc.name}`}
                            className="p-2 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(doc)}
                            aria-label={`Delete ${doc.name}`}
                            className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="doctor-modal-title"
            className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-8"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 id="doctor-modal-title" className="font-display text-lg font-bold text-slate-900">
                {editingDoctor ? `Edit Doctor (${editingDoctor.id})` : 'Add New Doctor'}
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
                  <label htmlFor="doc-id" className="block text-xs font-semibold text-slate-700 mb-1">
                    Doctor ID
                  </label>
                  <input
                    id="doc-id"
                    type="text"
                    value={form.id}
                    disabled={Boolean(editingDoctor)}
                    onChange={(e) => setForm({ ...form, id: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="doc-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    id="doc-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Dr. Meera Krishnan"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="doc-category" className="block text-xs font-semibold text-slate-700 mb-1">
                    Doctor Category
                  </label>
                  <select
                    id="doc-category"
                    value={form.category}
                    onChange={(e) => handleCategoryChange(e.target.value as DoctorCategory)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="GeneralPhysician">GeneralPhysician (₹300)</option>
                    <option value="Specialist">Specialist (Cardio/Neuro/etc.)</option>
                    <option value="Surgeon">Surgeon (Base + Exp Surcharge)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="doc-spec" className="block text-xs font-semibold text-slate-700 mb-1">
                    Specialization
                  </label>
                  {form.category === 'Specialist' ? (
                    <select
                      id="doc-spec"
                      value={form.specialization}
                      onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                    >
                      {SPECIALIST_DISCIPLINES.map((d) => (
                        <option key={d} value={d}>
                          {d} (Base ₹{SPECIALIST_BASE_FEES[d]})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="doc-spec"
                      type="text"
                      value={form.specialization}
                      onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  )}
                </div>

                <div>
                  <label htmlFor="doc-age" className="block text-xs font-semibold text-slate-700 mb-1">
                    Age (23–85)
                  </label>
                  <input
                    id="doc-age"
                    type="number"
                    min={23}
                    max={85}
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="doc-gender" className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender
                  </label>
                  <select
                    id="doc-gender"
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
                  <label htmlFor="doc-exp" className="block text-xs font-semibold text-slate-700 mb-1">
                    Experience (Years)
                  </label>
                  <input
                    id="doc-exp"
                    type="number"
                    min={0}
                    max={60}
                    value={form.experience}
                    onChange={(e) => setForm({ ...form, experience: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="doc-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="doc-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98401 11223"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className={form.category === 'Surgeon' ? '' : 'sm:col-span-2'}>
                  <label htmlFor="doc-email" className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="doc-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="doctor@medcore.in"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                {form.category === 'Surgeon' && (
                  <div>
                    <label htmlFor="doc-surg-fee" className="block text-xs font-semibold text-slate-700 mb-1">
                      Surgical Base Fee (INR)
                    </label>
                    <input
                      id="doc-surg-fee"
                      type="number"
                      min={1500}
                      step={100}
                      value={form.surgicalBaseFee}
                      onChange={(e) => setForm({ ...form, surgicalBaseFee: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
                    />
                  </div>
                )}
              </div>

              {/* Availability Slots */}
              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-2">
                  Consultation Availability Slots
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const selected = form.availability.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleSlot(slot)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                          selected
                            ? 'bg-blue-50 border-blue-600 text-blue-700 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Fee Preview */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-700">Consultation Fee</p>
                  <p className="text-xs text-slate-500">Based on doctor category, specialization, and experience</p>
                </div>
                <span className="font-mono text-lg font-bold text-blue-700 tabular-nums">
                  {formatINR(previewFee)}
                </span>
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
                  {editingDoctor ? 'Save Changes' : 'Create Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold text-slate-900">Remove Doctor</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to remove <span className="font-semibold text-slate-900">{deleteTarget.name}</span> ({deleteTarget.id})?
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
                Delete Doctor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
