/**
 * Pure input sanitization and validation utilities.
 * Keeps all security hygiene and form validation decoupled from React UI components.
 */

export type Gender = 'Male' | 'Female' | 'Other';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type UserRole = 'Admin' | 'Receptionist';

/**
 * Strips HTML tags, script payloads, and unsafe control characters while preserving normal text.
 */
export function sanitizeInput(value: string): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>?/gm, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();
}

/**
 * Returns local calendar date in YYYY-MM-DD format.
 */
export function getTodayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validates Indian/international phone numbers (10-15 digits, optional leading + and spaces/hyphens).
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = sanitizeInput(phone);
  const digits = cleaned.replace(/[\s\-()+]/g, '');
  return /^\+?[0-9\s\-()]{10,18}$/.test(cleaned) && digits.length >= 10 && digits.length <= 15;
}

/**
 * Validates standard email format.
 */
export function isValidEmail(email: string): boolean {
  const cleaned = sanitizeInput(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleaned);
}

/**
 * Validates reasonable human age range (0 to 120 for patients, 23 to 85 for doctors).
 */
export function isValidAge(age: number, min = 0, max = 120): boolean {
  return Number.isFinite(age) && Number.isInteger(age) && age >= min && age <= max;
}

/**
 * Checks whether an appointment date string (YYYY-MM-DD) is today or in the future.
 */
export function isTodayOrFutureDate(dateStr: string, referenceDate: Date = new Date()): boolean {
  const cleaned = sanitizeInput(dateStr);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return false;
  const todayStr = getTodayIsoDate(referenceDate);
  return cleaned >= todayStr;
}

/**
 * Formats currency in Indian Rupees using tabular-ready formatting.
 */
export function formatINR(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(safeAmount);
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateIdFormat(id: string): boolean {
  const cleaned = sanitizeInput(id);
  return /^[A-Za-z0-9_-]{3,24}$/.test(cleaned);
}
