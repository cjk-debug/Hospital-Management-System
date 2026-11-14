import { Appointment, AppointmentStatus, SerializedAppointment } from '../models/Appointment';
import {
  createDoctorByCategory,
  Doctor,
  DoctorCategory,
  GeneralPhysician,
  SerializedDoctor,
  Specialist,
  Surgeon,
  TIME_SLOTS,
} from '../models/Doctor';
import { MedicalRecord, SerializedMedicalRecord } from '../models/MedicalRecord';
import { Patient, SerializedPatient } from '../models/Patient';
import { BloodGroup, Gender, getTodayIsoDate, isTodayOrFutureDate, sanitizeInput } from '../utils/validation';

export interface SerializedHospitalState {
  version: number;
  doctors: SerializedDoctor[];
  patients: SerializedPatient[];
  appointments: SerializedAppointment[];
  medicalRecords: SerializedMedicalRecord[];
}

export interface PatientBillingSummary {
  patient: Patient;
  appointmentCount: number;
  completedCount: number;
  scheduledCount: number;
  totalBilled: number;
  collectedAmount: number;
  pendingAmount: number;
}

export interface DoctorBillingSummary {
  doctor: Doctor;
  consultationFee: number;
  appointmentCount: number;
  completedCount: number;
  scheduledCount: number;
  totalRevenue: number;
}

export const STORAGE_KEY = 'hapms_hospital_state_v1';

/**
 * HospitalManager Service Class
 * Encapsulates all collections (#doctors, #patients, #appointments, #medicalRecords)
 * behind validated getters, setters, and domain operations.
 */
export class HospitalManager {
  #doctors: Doctor[] = [];
  #patients: Patient[] = [];
  #appointments: Appointment[] = [];
  #medicalRecords: MedicalRecord[] = [];
  #hospitalName: string = 'MedCore Clinical Center';

  constructor(hospitalName = 'MedCore Clinical Center') {
    this.#hospitalName = sanitizeInput(hospitalName) || 'MedCore Clinical Center';
  }

  public get hospitalName(): string {
    return this.#hospitalName;
  }

  public set hospitalName(value: string) {
    const cleaned = sanitizeInput(value);
    if (cleaned.length < 3) {
      throw new Error('Hospital name must be at least 3 characters.');
    }
    this.#hospitalName = cleaned;
  }

  // Encapsulated getters returning defensive copies
  public get doctors(): Doctor[] {
    return [...this.#doctors];
  }

  public get patients(): Patient[] {
    return [...this.#patients];
  }

  public get appointments(): Appointment[] {
    return [...this.#appointments];
  }

  public get medicalRecords(): MedicalRecord[] {
    return [...this.#medicalRecords];
  }

  // --- Lookup helpers ---

  public getDoctorById(id: string): Doctor | undefined {
    const cleanId = sanitizeInput(id);
    return this.#doctors.find((d) => d.id.toLowerCase() === cleanId.toLowerCase());
  }

  public getPatientById(id: string): Patient | undefined {
    const cleanId = sanitizeInput(id);
    return this.#patients.find((p) => p.id.toLowerCase() === cleanId.toLowerCase());
  }

  public getAppointmentById(id: string): Appointment | undefined {
    const cleanId = sanitizeInput(id);
    return this.#appointments.find((a) => a.id.toLowerCase() === cleanId.toLowerCase());
  }

  // --- Doctor CRUD ---

  public addDoctor(doctor: Doctor): Doctor {
    if (this.getDoctorById(doctor.id)) {
      throw new Error(`Doctor with ID "${doctor.id}" already exists.`);
    }
    this.#doctors.push(doctor);
    return doctor;
  }

  public updateDoctor(
    id: string,
    updates: {
      name?: string;
      age?: number;
      gender?: Gender;
      phone?: string;
      email?: string;
      specialization?: string;
      experience?: number;
      availability?: string[];
      category?: DoctorCategory;
      surgicalBaseFee?: number;
    }
  ): Doctor {
    const idx = this.#doctors.findIndex((d) => d.id === id);
    if (idx === -1) {
      throw new Error(`Doctor "${id}" not found.`);
    }
    const existing = this.#doctors[idx];
    const targetCategory = updates.category ?? existing.getDoctorCategory();

    // If category changed, instantiate the appropriate Doctor subclass preserving the ID
    if (targetCategory !== existing.getDoctorCategory() || updates.surgicalBaseFee !== undefined) {
      const rebuilt = createDoctorByCategory({
        id: existing.id,
        name: updates.name ?? existing.name,
        age: updates.age ?? existing.age,
        gender: updates.gender ?? existing.gender,
        phone: updates.phone ?? existing.phone,
        email: updates.email ?? existing.email,
        specialization: updates.specialization ?? existing.specialization,
        experience: updates.experience ?? existing.experience,
        availability: updates.availability ?? existing.availability,
        category: targetCategory,
        surgicalBaseFee: updates.surgicalBaseFee,
      });
      this.#doctors[idx] = rebuilt;
      return rebuilt;
    }

    if (updates.name !== undefined) existing.name = updates.name;
    if (updates.age !== undefined) existing.age = updates.age;
    if (updates.gender !== undefined) existing.gender = updates.gender;
    if (updates.phone !== undefined) existing.phone = updates.phone;
    if (updates.email !== undefined) existing.email = updates.email;
    if (updates.specialization !== undefined) existing.specialization = updates.specialization;
    if (updates.experience !== undefined) existing.experience = updates.experience;
    if (updates.availability !== undefined) existing.availability = updates.availability;

    return existing;
  }

  public deleteDoctor(id: string): void {
    const idx = this.#doctors.findIndex((d) => d.id === id);
    if (idx === -1) {
      throw new Error(`Doctor "${id}" not found.`);
    }
    const hasScheduled = this.#appointments.some(
      (a) => a.doctor.id === id && a.status === 'Scheduled'
    );
    if (hasScheduled) {
      throw new Error('Cannot delete a doctor with active scheduled appointments. Cancel or reschedule them first.');
    }
    this.#doctors.splice(idx, 1);
  }

  // --- Patient CRUD ---

  public registerPatient(patient: Patient): Patient {
    if (this.getPatientById(patient.id)) {
      throw new Error(`Patient with ID "${patient.id}" already exists.`);
    }
    this.#patients.push(patient);
    return patient;
  }

  public updatePatient(
    id: string,
    updates: {
      name?: string;
      age?: number;
      gender?: Gender;
      phone?: string;
      email?: string;
      bloodGroup?: BloodGroup;
      address?: string;
      medicalHistory?: string[];
    }
  ): Patient {
    const patient = this.getPatientById(id);
    if (!patient) {
      throw new Error(`Patient "${id}" not found.`);
    }
    if (updates.name !== undefined) patient.name = updates.name;
    if (updates.age !== undefined) patient.age = updates.age;
    if (updates.gender !== undefined) patient.gender = updates.gender;
    if (updates.phone !== undefined) patient.phone = updates.phone;
    if (updates.email !== undefined) patient.email = updates.email;
    if (updates.bloodGroup !== undefined) patient.bloodGroup = updates.bloodGroup;
    if (updates.address !== undefined) patient.address = updates.address;
    if (updates.medicalHistory !== undefined) patient.medicalHistory = updates.medicalHistory;

    return patient;
  }

  public deletePatient(id: string): void {
    const idx = this.#patients.findIndex((p) => p.id === id);
    if (idx === -1) {
      throw new Error(`Patient "${id}" not found.`);
    }
    const hasScheduled = this.#appointments.some(
      (a) => a.patient.id === id && a.status === 'Scheduled'
    );
    if (hasScheduled) {
      throw new Error('Cannot delete a patient with active scheduled appointments. Cancel them first.');
    }
    this.#patients.splice(idx, 1);
  }

  // --- Appointment Operations ---

  public isSlotBooked(
    doctorId: string,
    date: string,
    timeSlot: string,
    excludeAppointmentId?: string
  ): boolean {
    const cleanDate = sanitizeInput(date);
    const cleanSlot = sanitizeInput(timeSlot);
    return this.#appointments.some(
      (appt) =>
        appt.id !== excludeAppointmentId &&
        appt.doctor.id === doctorId &&
        appt.date === cleanDate &&
        appt.timeSlot === cleanSlot &&
        appt.status !== 'Cancelled'
    );
  }

  public bookAppointment(params: {
    id: string;
    patientId: string;
    doctorId: string;
    date: string;
    timeSlot: string;
    reason?: string;
    status?: AppointmentStatus;
    skipPastDateCheck?: boolean;
  }): Appointment {
    const cleanId = sanitizeInput(params.id);
    if (this.getAppointmentById(cleanId)) {
      throw new Error(`Appointment with ID "${cleanId}" already exists.`);
    }

    const patient = this.getPatientById(params.patientId);
    if (!patient) {
      throw new Error('Selected patient does not exist.');
    }

    const doctor = this.getDoctorById(params.doctorId);
    if (!doctor) {
      throw new Error('Selected doctor does not exist.');
    }

    if (!params.skipPastDateCheck && !isTodayOrFutureDate(params.date)) {
      throw new Error('Appointment date cannot be in the past.');
    }

    if (!doctor.isAvailableAt(params.timeSlot)) {
      throw new Error(`${doctor.name} is not available at ${params.timeSlot}. Choose an available slot.`);
    }

    if (this.isSlotBooked(doctor.id, params.date, params.timeSlot)) {
      throw new Error(
        `Double-booking prevented: ${doctor.name} already has an appointment on ${params.date} at ${params.timeSlot}.`
      );
    }

    const appointment = new Appointment({
      id: cleanId,
      patient,
      doctor,
      date: params.date,
      timeSlot: params.timeSlot,
      status: params.status ?? 'Scheduled',
      reason: params.reason,
      skipPastDateCheck: params.skipPastDateCheck,
    });

    this.#appointments.push(appointment);
    return appointment;
  }

  public rescheduleAppointment(id: string, newDate: string, newSlot: string): Appointment {
    const appointment = this.getAppointmentById(id);
    if (!appointment) {
      throw new Error(`Appointment "${id}" not found.`);
    }
    if (!isTodayOrFutureDate(newDate)) {
      throw new Error('Rescheduled date cannot be in the past.');
    }
    if (!appointment.doctor.isAvailableAt(newSlot)) {
      throw new Error(`${appointment.doctor.name} does not offer consultations at ${newSlot}.`);
    }
    if (this.isSlotBooked(appointment.doctor.id, newDate, newSlot, appointment.id)) {
      throw new Error(
        `Double-booking prevented: ${appointment.doctor.name} is already booked on ${newDate} at ${newSlot}.`
      );
    }
    appointment.reschedule(newDate, newSlot);
    return appointment;
  }

  public cancelAppointment(id: string): Appointment {
    const appointment = this.getAppointmentById(id);
    if (!appointment) {
      throw new Error(`Appointment "${id}" not found.`);
    }
    appointment.cancel();
    return appointment;
  }

  public completeAppointment(id: string): Appointment {
    const appointment = this.getAppointmentById(id);
    if (!appointment) {
      throw new Error(`Appointment "${id}" not found.`);
    }
    appointment.markCompleted();
    return appointment;
  }

  // --- Medical Records ---

  public addMedicalRecord(params: {
    id: string;
    patientId: string;
    doctorId: string;
    diagnosis: string;
    prescription: string;
    notes?: string;
    date: string;
    appointmentId?: string;
  }): MedicalRecord {
    const cleanId = sanitizeInput(params.id);
    if (this.#medicalRecords.some((r) => r.id.toLowerCase() === cleanId.toLowerCase())) {
      throw new Error(`Medical record with ID "${cleanId}" already exists.`);
    }
    const patient = this.getPatientById(params.patientId);
    if (!patient) {
      throw new Error('Selected patient does not exist.');
    }
    const doctor = this.getDoctorById(params.doctorId);
    if (!doctor) {
      throw new Error('Selected doctor does not exist.');
    }

    const record = new MedicalRecord({
      id: cleanId,
      patient,
      doctor,
      diagnosis: params.diagnosis,
      prescription: params.prescription,
      notes: params.notes,
      date: params.date,
      appointmentId: params.appointmentId,
    });

    this.#medicalRecords.push(record);
    patient.addMedicalHistoryEntry(`${record.date}: ${record.diagnosis} (${doctor.name})`);

    if (params.appointmentId) {
      const appt = this.getAppointmentById(params.appointmentId);
      if (appt && appt.status === 'Scheduled') {
        appt.markCompleted();
      }
    }

    return record;
  }

  public getRecordsByPatient(patientId: string): MedicalRecord[] {
    return this.#medicalRecords
      .filter((r) => r.patient.id === patientId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  // --- Overloaded Search Method ---

  public search(entity: 'doctor', query: string): Doctor[];
  public search(entity: 'patient', query: string): Patient[];
  public search(entity: 'appointment', query: string): Appointment[];
  public search(
    entity: 'doctor' | 'patient' | 'appointment',
    query: string
  ): Doctor[] | Patient[] | Appointment[] {
    const q = sanitizeInput(query).toLowerCase();
    if (!q) {
      if (entity === 'doctor') return this.doctors;
      if (entity === 'patient') return this.patients;
      return this.appointments;
    }

    if (entity === 'doctor') {
      return this.#doctors.filter(
        (d) =>
          d.id.toLowerCase().includes(q) ||
          d.name.toLowerCase().includes(q) ||
          d.specialization.toLowerCase().includes(q) ||
          d.getDoctorCategory().toLowerCase().includes(q)
      );
    }

    if (entity === 'patient') {
      return this.#patients.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.phone.toLowerCase().includes(q) ||
          p.bloodGroup.toLowerCase().includes(q)
      );
    }

    return this.#appointments.filter(
      (a) =>
        a.id.toLowerCase().includes(q) ||
        a.patient.name.toLowerCase().includes(q) ||
        a.patient.id.toLowerCase().includes(q) ||
        a.doctor.name.toLowerCase().includes(q) ||
        a.doctor.specialization.toLowerCase().includes(q) ||
        a.date.includes(q)
    );
  }

  // --- Billing & Analytics ---

  public getTotalRevenue(): number {
    return this.#appointments
      .filter((a) => a.status !== 'Cancelled')
      .reduce((sum, a) => sum + a.calculateFee(), 0);
  }

  public getCollectedRevenue(): number {
    return this.#appointments
      .filter((a) => a.status === 'Completed')
      .reduce((sum, a) => sum + a.calculateFee(), 0);
  }

  public getTodaysAppointments(todayIso: string = getTodayIsoDate()): Appointment[] {
    return this.#appointments
      .filter((a) => a.date === todayIso)
      .sort((a, b) => TIME_SLOTS.indexOf(a.timeSlot) - TIME_SLOTS.indexOf(b.timeSlot));
  }

  public getPatientBillingSummary(): PatientBillingSummary[] {
    return this.#patients.map((patient) => {
      const patientAppts = this.#appointments.filter(
        (a) => a.patient.id === patient.id && a.status !== 'Cancelled'
      );
      const completed = patientAppts.filter((a) => a.status === 'Completed');
      const scheduled = patientAppts.filter((a) => a.status === 'Scheduled');
      const collectedAmount = completed.reduce((sum, a) => sum + a.calculateFee(), 0);
      const pendingAmount = scheduled.reduce((sum, a) => sum + a.calculateFee(), 0);

      return {
        patient,
        appointmentCount: patientAppts.length,
        completedCount: completed.length,
        scheduledCount: scheduled.length,
        totalBilled: collectedAmount + pendingAmount,
        collectedAmount,
        pendingAmount,
      };
    });
  }

  public getDoctorBillingSummary(): DoctorBillingSummary[] {
    return this.#doctors.map((doctor) => {
      const docAppts = this.#appointments.filter(
        (a) => a.doctor.id === doctor.id && a.status !== 'Cancelled'
      );
      const completed = docAppts.filter((a) => a.status === 'Completed');
      const scheduled = docAppts.filter((a) => a.status === 'Scheduled');
      const totalRevenue = docAppts.reduce((sum, a) => sum + a.calculateFee(), 0);

      return {
        doctor,
        consultationFee: doctor.calculateConsultationFee(),
        appointmentCount: docAppts.length,
        completedCount: completed.length,
        scheduledCount: scheduled.length,
        totalRevenue,
      };
    });
  }

  // --- ID Generators ---

  public generateNextId(prefix: 'DOC' | 'PAT' | 'APT' | 'REC'): string {
    const existingIds = new Set<string>([
      ...this.#doctors.map((d) => d.id),
      ...this.#patients.map((p) => p.id),
      ...this.#appointments.map((a) => a.id),
      ...this.#medicalRecords.map((r) => r.id),
    ]);
    let counter = 101;
    while (existingIds.has(`${prefix}-${counter}`)) {
      counter += 1;
    }
    return `${prefix}-${counter}`;
  }

  // --- Serialization & LocalStorage Persistence ---

  public serialize(): SerializedHospitalState {
    return {
      version: 1,
      doctors: this.#doctors.map((d) => d.toJSON()),
      patients: this.#patients.map((p) => p.toJSON()),
      appointments: this.#appointments.map((a) => a.toJSON()),
      medicalRecords: this.#medicalRecords.map((r) => r.toJSON()),
    };
  }

  public static deserialize(state: SerializedHospitalState): HospitalManager {
    const manager = new HospitalManager();

    for (const docData of state.doctors) {
      manager.addDoctor(createDoctorByCategory(docData));
    }

    for (const patData of state.patients) {
      manager.registerPatient(Patient.fromJSON(patData));
    }

    for (const apptData of state.appointments) {
      const patient = manager.getPatientById(apptData.patientId);
      const doctor = manager.getDoctorById(apptData.doctorId);
      if (patient && doctor) {
        const appt = new Appointment({
          id: apptData.id,
          patient,
          doctor,
          date: apptData.date,
          timeSlot: apptData.timeSlot,
          status: apptData.status,
          fee: apptData.fee,
          reason: apptData.reason,
          skipPastDateCheck: true,
        });
        manager.#appointments.push(appt);
      }
    }

    for (const recData of state.medicalRecords) {
      const patient = manager.getPatientById(recData.patientId);
      const doctor = manager.getDoctorById(recData.doctorId);
      if (patient && doctor) {
        const record = new MedicalRecord({
          id: recData.id,
          patient,
          doctor,
          diagnosis: recData.diagnosis,
          prescription: recData.prescription,
          notes: recData.notes,
          date: recData.date,
          appointmentId: recData.appointmentId,
        });
        manager.#medicalRecords.push(record);
      }
    }

    return manager;
  }

  public saveToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.serialize()));
  }

  public static loadFromStorage(): HospitalManager {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as SerializedHospitalState;
          if (parsed && Array.isArray(parsed.doctors) && Array.isArray(parsed.patients)) {
            return HospitalManager.deserialize(parsed);
          }
        }
      } catch {
        // Fall through to seed data if storage is corrupted
      }
    }
    const seeded = HospitalManager.createSeeded();
    seeded.saveToStorage();
    return seeded;
  }

  public static resetToSeedData(): HospitalManager {
    const seeded = HospitalManager.createSeeded();
    seeded.saveToStorage();
    return seeded;
  }

  /**
   * Generates realistic hospital seed data relative to today's date.
   */
  public static createSeeded(referenceDate: Date = new Date()): HospitalManager {
    const manager = new HospitalManager();
    const today = getTodayIsoDate(referenceDate);

    const tomorrowDate = new Date(referenceDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = getTodayIsoDate(tomorrowDate);

    const yesterdayDate = new Date(referenceDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = getTodayIsoDate(yesterdayDate);

    const morningSlots = TIME_SLOTS.slice(0, 6);
    const fullDaySlots = TIME_SLOTS.slice(0, 10);

    // 1. Seed Doctors across all 3 concrete Doctor subclasses
    const doc1 = new GeneralPhysician({
      id: 'DOC-101',
      name: 'Dr. Aarav Mehta',
      age: 38,
      gender: 'Male',
      phone: '+91 98401 22101',
      email: 'aarav.mehta@medcore.in',
      specialization: 'General Medicine',
      experience: 9,
      availability: fullDaySlots,
    });

    const doc2 = new Specialist({
      id: 'DOC-102',
      name: 'Dr. Priya Nair',
      age: 44,
      gender: 'Female',
      phone: '+91 98401 22102',
      email: 'priya.nair@medcore.in',
      specialization: 'Cardiologist',
      experience: 14,
      availability: ['09:00 AM', '09:30 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM'],
    });

    const doc3 = new Specialist({
      id: 'DOC-103',
      name: 'Dr. Rohan Kulkarni',
      age: 41,
      gender: 'Male',
      phone: '+91 98401 22103',
      email: 'rohan.kulkarni@medcore.in',
      specialization: 'Neurologist',
      experience: 11,
      availability: morningSlots,
    });

    const doc4 = new Specialist({
      id: 'DOC-104',
      name: 'Dr. Ananya Iyer',
      age: 35,
      gender: 'Female',
      phone: '+91 98401 22104',
      email: 'ananya.iyer@medcore.in',
      specialization: 'Pediatrician',
      experience: 7,
      availability: fullDaySlots,
    });

    const doc5 = new Surgeon({
      id: 'DOC-105',
      name: 'Dr. Vikramaditya Rao',
      age: 52,
      gender: 'Male',
      phone: '+91 98401 22105',
      email: 'vikram.rao@medcore.in',
      specialization: 'Cardiothoracic Surgery',
      experience: 20,
      availability: ['09:00 AM', '10:30 AM', '02:00 PM', '04:00 PM'],
      surgicalBaseFee: 2000,
    });

    const doc6 = new Specialist({
      id: 'DOC-106',
      name: 'Dr. Kavya Deshmukh',
      age: 37,
      gender: 'Female',
      phone: '+91 98401 22106',
      email: 'kavya.deshmukh@medcore.in',
      specialization: 'Dermatologist',
      experience: 6,
      availability: ['10:00 AM', '11:30 AM', '02:30 PM', '04:30 PM', '05:00 PM'],
    });

    [doc1, doc2, doc3, doc4, doc5, doc6].forEach((d) => manager.addDoctor(d));

    // 2. Seed Patients
    const pat1 = new Patient({
      id: 'PAT-101',
      name: 'Siddharth Menon',
      age: 48,
      gender: 'Male',
      phone: '+91 98112 44001',
      email: 'siddharth.menon@example.in',
      bloodGroup: 'B+',
      address: '14 Indiranagar 2nd Stage, Bengaluru',
      medicalHistory: ['Mild Hypertension (2024)'],
    });

    const pat2 = new Patient({
      id: 'PAT-102',
      name: 'Meenakshi Sundaram',
      age: 32,
      gender: 'Female',
      phone: '+91 98112 44002',
      email: 'meenakshi.s@example.in',
      bloodGroup: 'O+',
      address: '42 Besant Nagar Avenue, Chennai',
      medicalHistory: ['Seasonal Allergic Rhinitis'],
    });

    const pat3 = new Patient({
      id: 'PAT-103',
      name: 'Kabir Malhotra',
      age: 9,
      gender: 'Male',
      phone: '+91 98112 44003',
      email: 'malhotra.family@example.in',
      bloodGroup: 'A+',
      address: '88 Vasant Vihar, New Delhi',
      medicalHistory: ['Routine Childhood Immunizations Up-to-Date'],
    });

    const pat4 = new Patient({
      id: 'PAT-104',
      name: 'Lakshmi Venkataraman',
      age: 63,
      gender: 'Female',
      phone: '+91 98112 44004',
      email: 'lakshmi.v@example.in',
      bloodGroup: 'AB+',
      address: '19 Anna Nagar East, Madurai',
      medicalHistory: ['Type 2 Diabetes Mellitus', 'Post-CABG Follow-up'],
    });

    const pat5 = new Patient({
      id: 'PAT-105',
      name: 'Arjun Chatterjee',
      age: 29,
      gender: 'Male',
      phone: '+91 98112 44005',
      email: 'arjun.chatterjee@example.in',
      bloodGroup: 'O-',
      address: '71 Salt Lake Sector III, Kolkata',
      medicalHistory: ['No Known Drug Allergies'],
    });

    [pat1, pat2, pat3, pat4, pat5].forEach((p) => manager.registerPatient(p));

    // 3. Seed Appointments
    manager.bookAppointment({
      id: 'APT-101',
      patientId: 'PAT-101',
      doctorId: 'DOC-102',
      date: today,
      timeSlot: '09:30 AM',
      reason: 'Blood pressure & ECG follow-up',
      status: 'Completed',
    });

    manager.bookAppointment({
      id: 'APT-102',
      patientId: 'PAT-102',
      doctorId: 'DOC-101',
      date: today,
      timeSlot: '10:00 AM',
      reason: 'Persistent seasonal cough & fever',
      status: 'Scheduled',
    });

    manager.bookAppointment({
      id: 'APT-103',
      patientId: 'PAT-104',
      doctorId: 'DOC-105',
      date: today,
      timeSlot: '02:00 PM',
      reason: 'Post-operative sternal wound evaluation',
      status: 'Scheduled',
    });

    manager.bookAppointment({
      id: 'APT-104',
      patientId: 'PAT-103',
      doctorId: 'DOC-104',
      date: tomorrow,
      timeSlot: '11:00 AM',
      reason: 'Annual pediatric wellness check',
      status: 'Scheduled',
    });

    manager.bookAppointment({
      id: 'APT-105',
      patientId: 'PAT-105',
      doctorId: 'DOC-103',
      date: yesterday,
      timeSlot: '09:00 AM',
      reason: 'Recurrent migraine consultation',
      status: 'Completed',
      skipPastDateCheck: true,
    });

    // 4. Seed Medical Records
    manager.addMedicalRecord({
      id: 'REC-101',
      patientId: 'PAT-101',
      doctorId: 'DOC-102',
      diagnosis: 'Essential Hypertension (Stage 1, Controlled)',
      prescription: 'Telmisartan 40mg OD, Low-sodium DASH diet',
      notes: 'BP 128/82 mmHg. ECG normal sinus rhythm. Repeat lipid profile in 3 months.',
      date: today,
      appointmentId: 'APT-101',
    });

    manager.addMedicalRecord({
      id: 'REC-102',
      patientId: 'PAT-105',
      doctorId: 'DOC-103',
      diagnosis: 'Episodic Migraine without Aura',
      prescription: 'Sumatriptan 50mg PRN, Magnesium Glycinate 400mg HS',
      notes: 'Advise sleep hygiene, hydration, and headache trigger diary.',
      date: yesterday,
      appointmentId: 'APT-105',
    });

    return manager;
  }
}
