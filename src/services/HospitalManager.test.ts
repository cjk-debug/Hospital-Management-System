import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Doctor,
  GeneralPhysician,
  Specialist,
  Surgeon,
} from '../models/Doctor';
import { Patient } from '../models/Patient';
import { Person } from '../models/Person';
import { HospitalManager } from './HospitalManager';
import { getTodayIsoDate, sanitizeInput } from '../utils/validation';

test('OOP Polymorphism: calculateConsultationFee and getRole across Doctor & Patient hierarchy', () => {
  const gp = new GeneralPhysician({
    id: 'DOC-201',
    name: 'Dr. GP',
    age: 32,
    gender: 'Male',
    phone: '+91 90000 00001',
    email: 'gp@hospital.in',
    experience: 5,
    availability: ['09:00 AM'],
  });

  const cardiologist = new Specialist({
    id: 'DOC-202',
    name: 'Dr. Cardio',
    age: 45,
    gender: 'Female',
    phone: '+91 90000 00002',
    email: 'cardio@hospital.in',
    specialization: 'Cardiologist',
    experience: 10, // +500 seniority allowance
    availability: ['10:00 AM'],
  });

  const surgeon = new Surgeon({
    id: 'DOC-203',
    name: 'Dr. Surgeon',
    age: 50,
    gender: 'Male',
    phone: '+91 90000 00003',
    email: 'surgeon@hospital.in',
    specialization: 'Neurosurgery',
    experience: 12, // 2000 + 12*150 = 3800
    availability: ['11:00 AM'],
  });

  const patient = new Patient({
    id: 'PAT-201',
    name: 'Test Patient',
    age: 28,
    gender: 'Female',
    phone: '+91 90000 00004',
    email: 'pat@example.in',
    bloodGroup: 'O+',
    address: '12 Main Street, Kochi',
  });

  // Polymorphic Doctor[] array
  const doctors: Doctor[] = [gp, cardiologist, surgeon];
  assert.deepEqual(
    doctors.map((d) => d.calculateConsultationFee()),
    [300, 1700, 3800]
  );

  // Polymorphic Person[] array
  const people: Person[] = [gp, cardiologist, surgeon, patient];
  assert.deepEqual(
    people.map((p) => p.getRole()),
    ['General Physician', 'Specialist (Cardiologist)', 'Surgeon (Neurosurgery)', 'Patient']
  );

  // Overloaded-style getFeeQuote
  assert.equal(gp.getFeeQuote(), 300);
  assert.equal(gp.getFeeQuote(true), 375);
  assert.equal(cardiologist.getFeeQuote(10), 1530);
});

test('Double-booking prevention and past-date validation in HospitalManager', () => {
  const manager = HospitalManager.createSeeded();
  const today = getTodayIsoDate();

  // DOC-101 is available at 10:00 AM and already has APT-102 today at 10:00 AM
  assert.throws(
    () =>
      manager.bookAppointment({
        id: 'APT-999',
        patientId: 'PAT-101',
        doctorId: 'DOC-101',
        date: today,
        timeSlot: '10:00 AM',
      }),
    /Double-booking prevented/
  );

  // Past date should be rejected
  assert.throws(
    () =>
      manager.bookAppointment({
        id: 'APT-998',
        patientId: 'PAT-101',
        doctorId: 'DOC-101',
        date: '2020-01-01',
        timeSlot: '09:00 AM',
      }),
    /cannot be in the past/
  );

  // Booking a free slot works and auto-calculates fee polymorphically
  const booked = manager.bookAppointment({
    id: 'APT-997',
    patientId: 'PAT-101',
    doctorId: 'DOC-101',
    date: today,
    timeSlot: '09:00 AM',
  });
  assert.equal(booked.fee, 300);
  assert.equal(booked.calculateFee(), 300);

  // Cancelling frees the slot and waives Billable fee
  manager.cancelAppointment('APT-997');
  assert.equal(booked.calculateFee(), 0);
  const rebooked = manager.bookAppointment({
    id: 'APT-996',
    patientId: 'PAT-103',
    doctorId: 'DOC-101',
    date: today,
    timeSlot: '09:00 AM',
  });
  assert.equal(rebooked.status, 'Scheduled');
});

test('Sanitization, duplicate ID guard, medical record composition, and serialization round-trip', () => {
  assert.equal(sanitizeInput('  <script>alert(1)</script>Dr. Clean  '), 'alert(1)Dr. Clean');

  const manager = HospitalManager.createSeeded();
  assert.throws(
    () =>
      manager.registerPatient(
        new Patient({
          id: 'PAT-101',
          name: 'Duplicate',
          age: 30,
          gender: 'Male',
          phone: '+91 98112 44001',
          email: 'dup@example.in',
          bloodGroup: 'A+',
          address: '100 Test Road',
        })
      ),
    /already exists/
  );

  const today = getTodayIsoDate();
  const record = manager.addMedicalRecord({
    id: 'REC-901',
    patientId: 'PAT-102',
    doctorId: 'DOC-101',
    diagnosis: 'Acute Viral Upper Respiratory Infection',
    prescription: 'Paracetamol 500mg TID, Warm Saline Gargle',
    notes: 'Hydration & rest for 3 days',
    date: today,
    appointmentId: 'APT-102',
  });

  assert.equal(record.patient.name, 'Meenakshi Sundaram');
  assert.equal(manager.getAppointmentById('APT-102')?.status, 'Completed');

  // Serialization round-trip preserves subclass types and polymorphic fees
  const serialized = manager.serialize();
  const restored = HospitalManager.deserialize(serialized);
  assert.equal(restored.doctors.length, manager.doctors.length);
  assert.equal(restored.getDoctorById('DOC-105')?.calculateConsultationFee(), 5000);
  assert.equal(restored.getRecordsByPatient('PAT-102').length, 1);
});
