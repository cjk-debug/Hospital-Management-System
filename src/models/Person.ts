import { Gender, isValidAge, isValidEmail, isValidPhone, sanitizeInput, validateIdFormat } from '../utils/validation';

export interface PersonProps {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  phone: string;
  email: string;
}

/**
 * Abstract base class Person.
 * Demonstrates Abstraction, Encapsulation (protected backing fields + validated getters/setters),
 * and Polymorphism via the abstract getRole() method.
 */
export abstract class Person {
  private _id: string;
  private _name: string;
  private _age: number;
  private _gender: Gender;
  private _phone: string;
  private _email: string;

  constructor(props: PersonProps) {
    const cleanId = sanitizeInput(props.id);
    if (!validateIdFormat(cleanId)) {
      throw new Error(`Invalid ID format "${props.id}". Use 3-24 alphanumeric, hyphen, or underscore characters.`);
    }
    this._id = cleanId;
    this._name = '';
    this._age = 0;
    this._gender = props.gender;
    this._phone = '';
    this._email = '';

    // Route through setters to enforce invariants on construction
    this.name = props.name;
    this.age = props.age;
    this.gender = props.gender;
    this.phone = props.phone;
    this.email = props.email;
  }

  public get id(): string {
    return this._id;
  }

  public get name(): string {
    return this._name;
  }

  public set name(value: string) {
    const cleaned = sanitizeInput(value);
    if (cleaned.length < 2) {
      throw new Error('Name must be at least 2 characters long.');
    }
    this._name = cleaned;
  }

  public get age(): number {
    return this._age;
  }

  public set age(value: number) {
    if (!isValidAge(value, 0, 120)) {
      throw new Error('Age must be an integer between 0 and 120.');
    }
    this._age = value;
  }

  public get gender(): Gender {
    return this._gender;
  }

  public set gender(value: Gender) {
    if (!['Male', 'Female', 'Other'].includes(value)) {
      throw new Error('Gender must be Male, Female, or Other.');
    }
    this._gender = value;
  }

  public get phone(): string {
    return this._phone;
  }

  public set phone(value: string) {
    const cleaned = sanitizeInput(value);
    if (!isValidPhone(cleaned)) {
      throw new Error('Please enter a valid 10 to 15 digit phone number.');
    }
    this._phone = cleaned;
  }

  public get email(): string {
    return this._email;
  }

  public set email(value: string) {
    const cleaned = sanitizeInput(value).toLowerCase();
    if (!isValidEmail(cleaned)) {
      throw new Error('Please enter a valid email address.');
    }
    this._email = cleaned;
  }

  /**
   * Abstract method forcing all subclasses to identify their domain role.
   */
  public abstract getRole(): string;

  /**
   * Polymorphic summary string reusing the subclass's getRole() implementation.
   */
  public getSummary(): string {
    return `${this.name} (${this.getRole()}) · ${this.age} yrs · ${this.phone}`;
  }
}
