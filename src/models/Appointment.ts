import { isTodayOrFutureDate, sanitizeInput, validateIdFormat } from '../utils/validation';
import { Billable, BillingLineItem } from './Billable';
import { Doctor } from './Doctor';
import { Patient } from './Patient';

export type AppointmentStatus = 'Scheduled' | 'Completed' | 'Cancelled';

export interface AppointmentProps {
  id: string;
  patient: Patient;
  doctor: Doctor;
  date: string;
  timeSlot: string;
  status?: AppointmentStatus;
  fee?: number;
  reason?: string;
  skipPastDateCheck?: boolean;
}

export interface SerializedAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  timeSlot: string;
  status: AppointmentStatus;
  fee: number;
  reason: string;
}

/**
 * Appointment class demonstrating Composition (composes Patient and Doctor objects)
 * and Interface Implementation (implements Billable).
 */
export class Appointment implements Billable {
  private _id: string;
  private _patient: Patient;
  private _doctor: Doctor;
  private _date: string;
  private _timeSlot: string;
  private _status: AppointmentStatus;
  private _fee: number;
  private _reason: string;

  constructor(props: AppointmentProps) {
    const cleanId = sanitizeInput(props.id);
    if (!validateIdFormat(cleanId)) {
      throw new Error('Invalid appointment ID format.');
    }
    this._id = cleanId;
    this._patient = props.patient;
    this._doctor = props.doctor;
    this._date = '';
    this._timeSlot = '';
    this._status = props.status ?? 'Scheduled';
    this._reason = sanitizeInput(props.reason ?? 'Routine Clinical Consultation') || 'Routine Clinical Consultation';

    if (props.skipPastDateCheck) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(sanitizeInput(props.date))) {
        throw new Error('Invalid appointment date format (expected YYYY-MM-DD).');
      }
      this._date = sanitizeInput(props.date);
    } else {
      this.setDate(props.date);
    }

    this.timeSlot = props.timeSlot;
    // Auto-calculate fee polymorphically from the composed Doctor instance unless explicitly persisted
    this._fee = typeof props.fee === 'number' && props.fee >= 0
      ? props.fee
      : props.doctor.calculateConsultationFee();
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

  public get date(): string {
    return this._date;
  }

  public setDate(value: string): void {
    const cleaned = sanitizeInput(value);
    if (!isTodayOrFutureDate(cleaned)) {
      throw new Error('Appointment date cannot be in the past.');
    }
    this._date = cleaned;
  }

  public get timeSlot(): string {
    return this._timeSlot;
  }

  public set timeSlot(value: string) {
    const cleaned = sanitizeInput(value);
    if (!cleaned) {
      throw new Error('Please choose a valid time slot.');
    }
    this._timeSlot = cleaned;
  }

  public get status(): AppointmentStatus {
    return this._status;
  }

  public get fee(): number {
    return this._fee;
  }

  public get reason(): string {
    return this._reason;
  }

  public set reason(value: string) {
    this._reason = sanitizeInput(value) || 'Routine Clinical Consultation';
  }

  public reschedule(newDate: string, newSlot: string): void {
    if (this._status !== 'Scheduled') {
      throw new Error(`Cannot reschedule a ${this._status.toLowerCase()} appointment.`);
    }
    this.setDate(newDate);
    this.timeSlot = newSlot;
  }

  public cancel(): void {
    if (this._status === 'Completed') {
      throw new Error('Completed appointments cannot be cancelled.');
    }
    this._status = 'Cancelled';
  }

  public markCompleted(): void {
    if (this._status === 'Cancelled') {
      throw new Error('Cancelled appointments cannot be marked completed.');
    }
    this._status = 'Completed';
  }

  // Billable interface methods
  public calculateFee(): number {
    return this._status === 'Cancelled' ? 0 : this._fee;
  }

  public getBillingDescription(): string {
    return `${this._doctor.name} (${this._doctor.specialization}) · ${this._date} ${this._timeSlot}`;
  }

  public getBillingBreakdown(): BillingLineItem[] {
    if (this._status === 'Cancelled') {
      return [{ label: 'Cancelled Appointment (Waived)', amount: 0 }];
    }
    return this._doctor.getBillingBreakdown();
  }

  public toJSON(): SerializedAppointment {
    return {
      id: this._id,
      patientId: this._patient.id,
      doctorId: this._doctor.id,
      date: this._date,
      timeSlot: this._timeSlot,
      status: this._status,
      fee: this._fee,
      reason: this._reason,
    };
  }
}
