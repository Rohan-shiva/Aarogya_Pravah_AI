require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Patient = require('../src/models/Patient');
const { Appointment } = require('../src/models/Appointment');
const { QueueEntry } = require('../src/models/QueueEntry');
const { AIAnalysis } = require('../src/models/AIAnalysis');
const { MedicalImageAnalysis } = require('../src/models/MedicalImageAnalysis');
const Consultation = require('../src/models/Consultation');
const AuditLog = require('../src/models/AuditLog');
const { calculatePriorityScore } = require('../src/services/priorityService');
const { generateTokenNumber } = require('../src/utils/tokenGenerator');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aarogya_pravah_ai';
    console.log(`[Seed] Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Patient.deleteMany({}),
      Appointment.deleteMany({}),
      QueueEntry.deleteMany({}),
      AIAnalysis.deleteMany({}),
      MedicalImageAnalysis.deleteMany({}),
      Consultation.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    console.log('[Seed] Creating Staff & Doctor users...');
    const staff1 = await User.create({
      name: 'Nurse Priya Sharma',
      email: 'staff@aarogyapravah.ai',
      password: 'password123',
      role: 'STAFF',
      department: 'Emergency & Triage',
      phoneNumber: '+91-9876543210',
    });

    const docEmergency = await User.create({
      name: 'Dr. Arjun Mehta, MD',
      email: 'dr.mehta@aarogyapravah.ai',
      password: 'password123',
      role: 'DOCTOR',
      department: 'Emergency',
      specialization: 'Emergency Medicine & Trauma',
      phoneNumber: '+91-9876543211',
    });

    const docGeneral = await User.create({
      name: 'Dr. Ananya Roy, MBBS',
      email: 'dr.roy@aarogyapravah.ai',
      password: 'password123',
      role: 'DOCTOR',
      department: 'General Medicine',
      specialization: 'Internal Medicine',
      phoneNumber: '+91-9876543212',
    });

    const docCardio = await User.create({
      name: 'Dr. Vikram Seth, DM',
      email: 'dr.seth@aarogyapravah.ai',
      password: 'password123',
      role: 'DOCTOR',
      department: 'Cardiology',
      specialization: 'Interventional Cardiology',
      phoneNumber: '+91-9876543213',
    });

    console.log('[Seed] Creating demo patients and appointments...');

    // Patient 1: Acute Emergency Case (Critical)
    const patient1 = await Patient.create({
      name: 'Ramesh Patel',
      age: 58,
      gender: 'Male',
      phoneNumber: '+91-9811223344',
      bloodGroup: 'B+',
      allergies: ['Penicillin'],
    });

    const token1 = generateTokenNumber('Emergency', true);
    const appt1 = await Appointment.create({
      tokenNumber: token1,
      patient: patient1._id,
      department: 'Emergency',
      possibleCondition: 'Severe Road Traffic Accident / Head Trauma',
      symptoms: ['Severe bleeding', 'Head injury', 'Drowsiness', 'Lacerations'],
      symptomsDescription: 'Motorcycle collision 20 minutes ago. Bleeding from forehead laceration.',
      reportedSeverity: 'CRITICAL',
      staffSeverity: 'CRITICAL',
      isAccident: true,
      accidentSeverity: 'HIGH',
      appointmentDate: new Date(),
      status: 'VERIFIED',
      verifiedBy: staff1._id,
      initialEstimatedWaitMinutes: 0,
    });

    const ai1 = await AIAnalysis.create({
      appointment: appt1._id,
      patient: patient1._id,
      urgencyLevel: 'CRITICAL',
      riskLevel: 'CRITICAL',
      riskFactors: ['Active cranial trauma', 'Hypotension risk', 'Altered sensorium'],
      priorityRecommendation: 'CRITICAL',
      reason: 'Severe blunt trauma with potential intracranial pathology. Requires immediate stabilization.',
      suggestedVitalsToCheck: ['GCS Score', 'Blood Pressure', 'Pulse', 'SpO2'],
      modelName: 'groq/llama-3.3-70b-versatile',
      isAiFallback: false,
    });

    const priority1 = calculatePriorityScore({
      staffSeverity: appt1.staffSeverity,
      reportedSeverity: appt1.reportedSeverity,
      isAccident: appt1.isAccident,
      accidentSeverity: appt1.accidentSeverity,
      aiAnalysis: ai1,
      checkInTime: new Date(Date.now() - 5 * 60 * 1000),
    });

    const queue1 = await QueueEntry.create({
      appointment: appt1._id,
      patient: patient1._id,
      department: 'Emergency',
      priorityScore: priority1.priorityScore,
      priorityLevel: priority1.priorityLevel,
      scoreBreakdown: priority1.scoreBreakdown,
      queuePosition: 1,
      estimatedWaitMinutes: 0,
      status: 'WAITING',
      checkInTime: new Date(Date.now() - 5 * 60 * 1000),
    });
    appt1.queueEntry = queue1._id;
    await appt1.save();

    // Patient 2: High Priority Chest Discomfort
    const patient2 = await Patient.create({
      name: 'Sunita Rao',
      age: 64,
      gender: 'Female',
      phoneNumber: '+91-9822334455',
      bloodGroup: 'O+',
    });

    const token2 = generateTokenNumber('Cardiology', false);
    const appt2 = await Appointment.create({
      tokenNumber: token2,
      patient: patient2._id,
      department: 'Cardiology',
      possibleCondition: 'Angina / Suspected ACS',
      symptoms: ['Substernal chest tightness', 'Radiating arm pain', 'Diaphoresis'],
      symptomsDescription: 'Episodes of heavy chest discomfort radiating to left shoulder.',
      reportedSeverity: 'HIGH',
      staffSeverity: 'HIGH',
      isAccident: false,
      appointmentDate: new Date(),
      status: 'VERIFIED',
      verifiedBy: staff1._id,
      initialEstimatedWaitMinutes: 10,
    });

    const ai2 = await AIAnalysis.create({
      appointment: appt2._id,
      patient: patient2._id,
      urgencyLevel: 'HIGH',
      riskLevel: 'HIGH',
      riskFactors: ['Ischemic pattern symptoms', 'Age vulnerability', 'Cardiac risk profile'],
      priorityRecommendation: 'HIGH',
      reason: 'Potential acute coronary syndrome presentation. Priority ECG and troponin screening indicated.',
      suggestedVitalsToCheck: ['12-lead ECG', 'Blood Pressure', 'SpO2'],
    });

    const img2 = await MedicalImageAnalysis.create({
      appointment: appt2._id,
      patient: patient2._id,
      screeningStatus: 'MODERATE_FINDINGS',
      imageScore: 0.72,
      possibleFindings: ['Cardiomegaly', 'Mild pulmonary congestion'],
      modelVersion: 'pytorch-chestxray-screening-v1.4',
      confidenceSignal: 0.88,
    });

    const priority2 = calculatePriorityScore({
      staffSeverity: appt2.staffSeverity,
      reportedSeverity: appt2.reportedSeverity,
      isAccident: appt2.isAccident,
      aiAnalysis: ai2,
      imageAnalysis: img2,
      checkInTime: new Date(Date.now() - 15 * 60 * 1000),
    });

    const queue2 = await QueueEntry.create({
      appointment: appt2._id,
      patient: patient2._id,
      department: 'Cardiology',
      priorityScore: priority2.priorityScore,
      priorityLevel: priority2.priorityLevel,
      scoreBreakdown: priority2.scoreBreakdown,
      queuePosition: 1,
      estimatedWaitMinutes: 0,
      status: 'WAITING',
      checkInTime: new Date(Date.now() - 15 * 60 * 1000),
    });
    appt2.queueEntry = queue2._id;
    await appt2.save();

    // Patient 3: Medium Priority General Medicine Patient
    const patient3 = await Patient.create({
      name: 'Amitabh Sen',
      age: 34,
      gender: 'Male',
      phoneNumber: '+91-9833445566',
      bloodGroup: 'A+',
    });

    const token3 = generateTokenNumber('General Medicine', false);
    const appt3 = await Appointment.create({
      tokenNumber: token3,
      patient: patient3._id,
      department: 'General Medicine',
      possibleCondition: 'High Grade Viral Fever',
      symptoms: ['Fever', 'Body ache', 'Chills', 'Mild cough'],
      symptomsDescription: 'Persistent fever (102 F) for 3 days with intense fatigue.',
      reportedSeverity: 'MEDIUM',
      staffSeverity: 'MEDIUM',
      status: 'VERIFIED',
      verifiedBy: staff1._id,
      initialEstimatedWaitMinutes: 15,
    });

    const ai3 = await AIAnalysis.create({
      appointment: appt3._id,
      patient: patient3._id,
      urgencyLevel: 'MEDIUM',
      riskLevel: 'LOW',
      riskFactors: ['Prolonged pyrexia'],
      priorityRecommendation: 'MEDIUM',
      reason: 'Acute febrile illness without acute red-flag distress markers.',
    });

    const priority3 = calculatePriorityScore({
      staffSeverity: appt3.staffSeverity,
      reportedSeverity: appt3.reportedSeverity,
      aiAnalysis: ai3,
      checkInTime: new Date(Date.now() - 25 * 60 * 1000),
    });

    const queue3 = await QueueEntry.create({
      appointment: appt3._id,
      patient: patient3._id,
      department: 'General Medicine',
      priorityScore: priority3.priorityScore,
      priorityLevel: priority3.priorityLevel,
      scoreBreakdown: priority3.scoreBreakdown,
      queuePosition: 1,
      estimatedWaitMinutes: 0,
      status: 'WAITING',
      checkInTime: new Date(Date.now() - 25 * 60 * 1000),
    });
    appt3.queueEntry = queue3._id;
    await appt3.save();

    // Patient 4: Newly submitted, pending verification
    const patient4 = await Patient.create({
      name: 'Deepika Nair',
      age: 27,
      gender: 'Female',
      phoneNumber: '+91-9844556677',
    });

    const token4 = generateTokenNumber('General Medicine', false);
    await Appointment.create({
      tokenNumber: token4,
      patient: patient4._id,
      department: 'General Medicine',
      possibleCondition: 'Migraine / Tension Headache',
      symptoms: ['Headache', 'Nausea', 'Photophobia'],
      reportedSeverity: 'MEDIUM',
      status: 'PENDING_STAFF_VERIFICATION',
      initialEstimatedWaitMinutes: 30,
    });

    // Patient 5: Patient currently placed on HOLD (PENDING status)
    const patient5 = await Patient.create({
      name: 'Kavita Joshi',
      age: 49,
      gender: 'Female',
      phoneNumber: '+91-9855667788',
    });

    const token5 = generateTokenNumber('General Medicine', false);
    const appt5 = await Appointment.create({
      tokenNumber: token5,
      patient: patient5._id,
      department: 'General Medicine',
      possibleCondition: 'Abdominal pain undergoing ultrasound',
      symptoms: ['Right upper quadrant pain', 'Bloating'],
      reportedSeverity: 'MEDIUM',
      staffSeverity: 'MEDIUM',
      status: 'PENDING',
      initialEstimatedWaitMinutes: 20,
    });

    const queue5 = await QueueEntry.create({
      appointment: appt5._id,
      patient: patient5._id,
      department: 'General Medicine',
      priorityScore: 50,
      priorityLevel: 'MEDIUM',
      status: 'PENDING',
      isPending: true,
      pendingDetails: {
        heldByDoctor: docGeneral._id,
        reason: 'Sent to Radiology for Urgent Abdominal Ultrasound Scan',
        category: 'XRAY_SCAN',
        notes: 'Review report immediately upon return from scan room.',
        heldAt: new Date(Date.now() - 30 * 60 * 1000),
      },
      checkInTime: new Date(Date.now() - 45 * 60 * 1000),
    });
    appt5.queueEntry = queue5._id;
    await appt5.save();

    console.log('====================================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('====================================================');
    console.log('\nDemo User Credentials:');
    console.log('Staff:');
    console.log('  Email:    staff@aarogyapravah.ai');
    console.log('  Password: password123');
    console.log('\nDoctor (Emergency):');
    console.log('  Email:    dr.mehta@aarogyapravah.ai');
    console.log('  Password: password123');
    console.log('\nDoctor (General Medicine):');
    console.log('  Email:    dr.roy@aarogyapravah.ai');
    console.log('  Password: password123');
    console.log('\nDoctor (Cardiology):');
    console.log('  Email:    dr.seth@aarogyapravah.ai');
    console.log('  Password: password123');
    console.log('\nDemo Patient Tokens:');
    console.log(`  Critical Accident:     ${token1}`);
    console.log(`  High Cardiac Risk:     ${token2}`);
    console.log(`  Medium Viral Fever:    ${token3}`);
    console.log(`  Pending Verification:  ${token4}`);
    console.log(`  On Hold (Pending):     ${token5}`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`[Seed Error] ${error.message}`);
    process.exit(1);
  }
};

seedData();
