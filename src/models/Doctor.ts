import { isValidAge, sanitizeInput } from '../utils/validation';
import { Billable, BillingLineItem } from './Billable';
import { Person, PersonProps } from './Person';

export type DoctorCategory = 'GeneralPhysician' | 'Specialist' | 'Surgeon';

export type SpecialistDiscipline =
  | 'Cardiologist'
  | 'Neurologist'
  | 'Orthopedic'
  | 'Pediatrician'
  | 'Dermatologist';

export const SPECIALIST_DISCIPLINES: SpecialistDiscipline[] = [
  'Cardiologist',
  'Neurologist',
  'Orthopedic',
  'Pediatrician',
  'Dermatologist',
];

export const SPECIALIST_BASE_FEES: Record<SpecialistDiscipline, number> = {
  Cardiologist: 1200,
  Neurologist: 1400,
  Orthopedic: 1000,
  Pediatrician: 800,
  Dermatologist: 900,
};

export const TIME_SLOTS: string[] = [
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '04:00 PM',
  '04:30 PM',
  '05:00 PM',
];

export interface DoctorProps extends PersonProps {
  specialization: string;
  experience: number;
  availability: string[];
}

export interface SerializedDoctor extends DoctorProps {
  category: DoctorCategory;
  surgicalBaseFee?: number;
}

/**
 * Abstract class Doctor extending Person and implementing Billable.
 * Demonstrates multi-level Inheritance, Interface Implementation, Abstraction,
 * and Polymorphism (overridden calculateConsultationFee + method overloading).
 */
export abstract class Doctor extends Person implements Billable {
  private _specialization: string;
  private _experience: number;
  private _availability: string[];

  constructor(props: DoctorProps) {
    super(props);
    // Validate realistic doctor age range
    if (!isValidAge(props.age, 23, 85)) {
      throw new Error('Doctor age must be an integer between 23 and 85.');
    }
    this._specialization = '';
    this._experience = 0;
    this._availability = [];

    this.specialization = props.specialization;
    this.experience = props.experience;
    this.availability = props.availability;
  }

  public get specialization(): string {
    return this._specialization;
  }

  public set specialization(value: string) {
    const cleaned = sanitizeInput(value);
    if (cleaned.length < 2) {
      throw new Error('Specialization must be at least 2 characters.');
    }
    this._specialization = cleaned;
  }

  public get experience(): number {
    return this._experience;
  }

  public set experience(value: number) {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0 || value > 60) {
      throw new Error('Experience must be an integer between 0 and 60 years.');
    }
    this._experience = value;
  }

  public get availability(): string[] {
    return [...this._availability];
  }

  public set availability(slots: string[]) {
    const cleaned = slots
      .map((slot) => sanitizeInput(slot))
      .filter((slot) => slot.length > 0);
    if (cleaned.length === 0) {
      throw new Error('Select at least one availability slot.');
    }
    this._availability = Array.from(new Set(cleaned));
  }

  public isAvailableAt(slot: string): boolean {
    return this._availability.includes(slot);
  }

  /**
   * Abstract polymorphic fee calculation overridden by each Doctor subclass.
   */
  public abstract calculateConsultationFee(): number;

  /**
   * Abstract category identifier for factory reconstruction & filtering.
   */
  public abstract getDoctorCategory(): DoctorCategory;

  /**
   * Method overloading-style signatures in TypeScript:
   * - getFeeQuote() -> standard consultation fee
   * - getFeeQuote(isUrgent: boolean) -> adds priority surcharge if urgent
   * - getFeeQuote(discountPercent: number) -> applies percentage concession
   */
  public getFeeQuote(): number;
  public getFeeQuote(isUrgent: boolean): number;
  public getFeeQuote(discountPercent: number): number;
  public getFeeQuote(modifier?: boolean | number): number {
    const base = this.calculateConsultationFee();
    if (typeof modifier === 'boolean') {
      return modifier ? Math.round(base * 1.25) : base;
    }
    if (typeof modifier === 'number') {
      const clamped = Math.min(Math.max(modifier, 0), 50);
      return Math.round(base * (1 - clamped / 100));
    }
    return base;
  }

  // Billable contract implementation
  public calculateFee(): number {
    return this.calculateConsultationFee();
  }

  public getBillingDescription(): string {
    return `${this.getRole()} Consultation · ${this.name} (${this.specialization})`;
  }

  public abstract getBillingBreakdown(): BillingLineItem[];

  public override getRole(): string {
    return 'Doctor';
  }

  public toJSON(): SerializedDoctor {
    return {
      id: this.id,
      name: this.name,
      age: this.age,
      gender: this.gender,
      phone: this.phone,
      email: this.email,
      specialization: this._specialization,
      experience: this._experience,
      availability: [...this._availability],
      category: this.getDoctorCategory(),
    };
  }
}

/**
 * GeneralPhysician subclass — flat ₹300 base consultation fee.
 */
export class GeneralPhysician extends Doctor {
  public static readonly BASE_FEE = 300;

  constructor(props: Omit<DoctorProps, 'specialization'> & { specialization?: string }) {
    super({
      ...props,
      specialization: props.specialization ? sanitizeInput(props.specialization) : 'General Medicine',
    });
  }

  public override getDoctorCategory(): DoctorCategory {
    return 'GeneralPhysician';
  }

  public override getRole(): string {
    return 'General Physician';
  }

  public override calculateConsultationFee(): number {
    return GeneralPhysician.BASE_FEE;
  }

  public override getBillingBreakdown(): BillingLineItem[] {
    return [{ label: 'General Physician Consultation', amount: GeneralPhysician.BASE_FEE }];
  }
}

/**
 * Specialist subclass — Cardiologist, Neurologist, Orthopedic, Pediatrician, Dermatologist.
 * Combines discipline-specific tier fee with modest experience increment (₹50/yr capped at ₹500).
 */
export class Specialist extends Doctor {
  constructor(props: DoctorProps) {
    super(props);
  }

  public override getDoctorCategory(): DoctorCategory {
    return 'Specialist';
  }

  public override getRole(): string {
    return `Specialist (${this.specialization})`;
  }

  public getBaseDisciplineFee(): number {
    const known = SPECIALIST_BASE_FEES[this.specialization as SpecialistDiscipline];
    return known ?? 950;
  }

  public getExperienceAllowance(): number {
    return Math.min(this.experience * 50, 500);
  }

  public override calculateConsultationFee(): number {
    return this.getBaseDisciplineFee() + this.getExperienceAllowance();
  }

  public override getBillingBreakdown(): BillingLineItem[] {
    const items: BillingLineItem[] = [
      { label: `${this.specialization} Specialist Base Fee`, amount: this.getBaseDisciplineFee() },
    ];
    const expAllowance = this.getExperienceAllowance();
    if (expAllowance > 0) {
      items.push({ label: `Seniority Allowance (${this.experience} yrs)`, amount: expAllowance });
    }
    return items;
  }
}

/**
 * Surgeon subclass — highest consultation fee (₹2,000 base + ₹150 per year of experience).
 */
export class Surgeon extends Doctor {
  public static readonly DEFAULT_BASE_FEE = 2000;
  public static readonly EXPERIENCE_SURCHARGE_PER_YEAR = 150;

  private _surgicalBaseFee: number;

  constructor(props: DoctorProps & { surgicalBaseFee?: number }) {
    super(props);
    this._surgicalBaseFee =
      props.surgicalBaseFee && props.surgicalBaseFee >= 1500
        ? Math.round(props.surgicalBaseFee)
        : Surgeon.DEFAULT_BASE_FEE;
  }

  public get surgicalBaseFee(): number {
    return this._surgicalBaseFee;
  }

  public override getDoctorCategory(): DoctorCategory {
    return 'Surgeon';
  }

  public override getRole(): string {
    return `Surgeon (${this.specialization})`;
  }

  public getExperienceSurcharge(): number {
    return this.experience * Surgeon.EXPERIENCE_SURCHARGE_PER_YEAR;
  }

  public override calculateConsultationFee(): number {
    return this._surgicalBaseFee + this.getExperienceSurcharge();
  }

  public override getBillingBreakdown(): BillingLineItem[] {
    return [
      { label: `Surgical Consultation Base (${this.specialization})`, amount: this._surgicalBaseFee },
      {
        label: `Surgical Experience Surcharge (${this.experience} yrs × ₹${Surgeon.EXPERIENCE_SURCHARGE_PER_YEAR})`,
        amount: this.getExperienceSurcharge(),
      },
    ];
  }

  public override toJSON(): SerializedDoctor {
    return {
      ...super.toJSON(),
      surgicalBaseFee: this._surgicalBaseFee,
    };
  }
}

/**
 * Factory helper to instantiate the right concrete Doctor subclass from serialized data or form input.
 */
export function createDoctorByCategory(data: SerializedDoctor): Doctor {
  switch (data.category) {
    case 'GeneralPhysician':
      return new GeneralPhysician(data);
    case 'Specialist':
      return new Specialist(data);
    case 'Surgeon':
      return new Surgeon(data);
    default:
      throw new Error(`Unsupported doctor category: ${String(data.category)}`);
  }
}
