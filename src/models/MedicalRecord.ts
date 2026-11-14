import { sanitizeInput, validateIdFormat } from '../utils/validation';
import { Doctor } from './Doctor';
import { Patient } from './Patient';

export interface MedicalRecordProps {
  id: string;
  patient: Patient;
  doctor: Doctor;
  diagnosis: string;
  prescription: string;
  notes?: string;
  date: string;
  appointmentId?: string;
}

export interface SerializedMedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  prescription: string;
  notes: string;
  date: string;
  appointmentId?: string;
}

/**
 * MedicalRecord class demonstrating Composition (composes Patient and Doctor instances).
 */
export class MedicalRecord {
  private _id: string;
  private _patient: Patient;
  private _doctor: Doctor;
  private _diagnosis: string;
  private _prescription: string;
  private _notes: string;
  private _date: string;
  private _appointmentId?: string;

  constructor(props: MedicalRecordProps) {
    const cleanId = sanitizeInput(props.id);
    if (!validateIdFormat(cleanId)) {
      throw new Error('Invalid medical record ID format.');
    }
    this._id = cleanId;
    this._patient = props.patient;
    this._doctor = props.doctor;
    this._diagnosis = '';
    this._prescription = '';
    this._notes = sanitizeInput(props.notes ?? '');
    this._date = sanitizeInput(props.date);
    this._appointmentId = props.appointmentId ? sanitizeInput(props.appointmentId) : undefined;

    this.diagnosis = props.diagnosis;
    this.prescription = props.prescription;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this._date)) {
      throw new Error('Invalid medical record date (expected YYYY-MM-DD).');
    }
  }

  public get id(): string {
    return this._id;
  }

  public get patient(): Patient {
    return this._patient;
  }

  public get doctor(): Doctor {
    return this._doctor;
  }

  public get diagnosis(): string {
    return this._diagnosis;
  }

  public set diagnosis(value: string) {
    const cleaned = sanitizeInput(value);
    if (cleaned.length < 3) {
      throw new Error('Diagnosis must be at least 3 characters.');
    }
    this._diagnosis = cleaned;
  }

  public get prescription(): string {
    return this._prescription;
  }

  public set prescription(value: string) {
    const cleaned = sanitizeInput(value);
    if (cleaned.length < 3) {
      throw new Error('Prescription must be at least 3 characters.');
    }
    this._prescription = cleaned;
  }

  public get notes(): string {
    return this._notes;
  }

  public set notes(value: string) {
    this._notes = sanitizeInput(value);
  }

  public get date(): string {
    return this._date;
  }

  public get appointmentId(): string | undefined {
    return this._appointmentId;
  }

  public toJSON(): SerializedMedicalRecord {
    return {
      id: this._id,
      patientId: this._patient.id,
      doctorId: this._doctor.id,
      diagnosis: this._diagnosis,
      prescription: this._prescription,
      notes: this._notes,
      date: this._date,
      appointmentId: this._appointmentId,
    };
  }
}
