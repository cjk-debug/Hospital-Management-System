/**
 * Billable Interface / Contract
 * Implemented by both Doctor (consultation fee calculation) and Appointment (session billing).
 * Demonstrates interface-based polymorphism in TypeScript.
 */
export interface BillingLineItem {
  label: string;
  amount: number;
}

export interface Billable {
  /** Returns the total billable fee in INR */
  calculateFee(): number;
  /** Returns a concise human-readable description of the charge */
  getBillingDescription(): string;
  /** Returns itemized fee components for transparent invoicing */
  getBillingBreakdown(): BillingLineItem[];
}
