import { BloodGroup, sanitizeInput } from '../utils/validation';
import { Person, PersonProps } from './Person';

export interface PatientProps extends PersonProps {
  bloodGroup: BloodGroup;
  address: string;
  medicalHistory?: string[];
}

export interface SerializedPatient extends PatientProps {
  medicalHistory: string[];
}

const VALID_BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * Concrete class Patient extending Person.
 * Demonstrates Inheritance and Encapsulation of clinical patient details.
 */
export class Patient extends Person {
  private _bloodGroup: BloodGroup;
  private _address: string;
  private _medicalHistory: string[];

  constructor(props: PatientProps) {
    super(props);
    this._bloodGroup = 'O+';
    this._address = '';
    this._medicalHistory = [];

    this.bloodGroup = props.bloodGroup;
    this.address = props.address;
    if (props.medicalHistory) {
      this._medicalHistory = props.medicalHistory
        .map((entry) => sanitizeInput(entry))
        .filter((entry) => entry.length > 0);
    }
  }

  public get bloodGroup(): BloodGroup {
    return this._bloodGroup;
  }

  public set bloodGroup(value: BloodGroup) {
    if (!VALID_BLOOD_GROUPS.includes(value)) {
      throw new Error('Invalid blood group.');
    }
    this._bloodGroup = value;
  }

  public get address(): string {
    return this._address;
  }

  public set address(value: string) {
    const cleaned = sanitizeInput(value);
    if (cleaned.length < 5) {
      throw new Error('Address must be at least 5 characters long.');
    }
    this._address = cleaned;
  }

  /**
   * Returns a defensive copy to preserve encapsulation of the internal array.
   */
  public get medicalHistory(): string[] {
    return [...this._medicalHistory];
  }

  public set medicalHistory(entries: string[]) {
    this._medicalHistory = entries
      .map((entry) => sanitizeInput(entry))
      .filter((entry) => entry.length > 0);
  }

  public addMedicalHistoryEntry(entry: string): void {
    const cleaned = sanitizeInput(entry);
    if (cleaned.length > 0) {
      this._medicalHistory.push(cleaned);
    }
  }

  public override getRole(): string {
    return 'Patient';
  }

  public toJSON(): SerializedPatient {
    return {
      id: this.id,
      name: this.name,
      age: this.age,
      gender: this.gender,
      phone: this.phone,
      email: this.email,
      bloodGroup: this._bloodGroup,
      address: this._address,
      medicalHistory: [...this._medicalHistory],
    };
  }

  public static fromJSON(data: SerializedPatient): Patient {
    return new Patient(data);
  }
}
