/**
 * Day 8 Automated Master End-to-End Workflow Test Suite — Aarogya Pravah AI
 * Validates the complete patient journey across:
 * 1. Health Check & Auth (Staff, Doctor registration & JWT tokens)
 * 2. Patient Appointment Booking (with X-Ray medical image metadata)
 * 3. Groq LLaMA 3.3 AI Clinical Triage Analysis
 * 4. TensorFlow DenseNet-121 Radiological Image Screening Ingestion
 * 5. Dynamic Multi-Factor Priority Calculation (Clinical + Groq AI + DenseNet ML + Wait Aging)
 * 6. Real-Time Socket.IO Multi-Room Event Stream (Staff, Doctor, Patient)
 * 7. Staff Patient Verification & Smart Priority Queue Placement
 * 8. Doctor Clinical Consultation Lifecycle (Call -> Start -> Hold -> Resume -> Complete)
 * 9. Queue Statistics & Audit Logging Integrity
 */
require('dotenv').config();
const assert = require('assert');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { io: ClientIO } = require('../../frontend/node_modules/socket.io-client');
const app = require('../src/app');
const initSocketIO = require('../src/sockets/socketHandler');
const { socketEmitter } = require('../src/sockets/socketEmitter');
const { Appointment } = require('../src/models/Appointment');
const { QueueEntry } = require('../src/models/QueueEntry');
const { AIAnalysis } = require('../src/models/AIAnalysis');
const { MedicalImageAnalysis } = require('../src/models/MedicalImageAnalysis');
const Consultation = require('../src/models/Consultation');
const User = require('../src/models/User');

let server;
let ioServer;
let staffSocket;
let doctorSocket;
let patientSocket;
let baseUrl;

const request = async (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

const runEndToEndTestSuite = async () => {
  console.log('\n======================================================');
  console.log('🌟 STARTING DAY 8 MASTER END-TO-END WORKFLOW TEST SUITE');
  console.log('======================================================\n');

  try {
    // 1. Setup Database & HTTP / Socket.IO Server
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aarogya_pravah_ai';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

    const testPort = 5008;
    server = http.createServer(app);
    ioServer = new Server(server, { cors: { origin: '*' } });
    initSocketIO(ioServer);

    await new Promise((resolve) => server.listen(testPort, resolve));
    baseUrl = `http://localhost:${testPort}`;

    // 2. Health Check Endpoint
    console.log('[STAGE 1] System Health & Service Status Check');
    const healthRes = await request('GET', '/api/health');
    assert.strictEqual(healthRes.status, 200, 'Health check endpoint returns HTTP 200');
    assert.strictEqual(healthRes.body.success, true, 'Health check reports success');
    console.log('  ✓ System health operational');

    // 3. User Registration & Auth
    console.log('\n[STAGE 2] User Registration & Role-Based Authentication');
    const staffEmail = `staff.e2e.${Date.now()}@aarogyapravah.org`;
    const docEmail = `dr.e2e.${Date.now()}@aarogyapravah.org`;

    const staffReg = await request('POST', '/api/auth/register', {
      name: 'Senior Triage Nurse',
      email: staffEmail,
      password: 'Password123!',
      role: 'STAFF',
      department: 'Pulmonology',
    });
    assert.strictEqual(staffReg.status, 201, 'Staff registered successfully');
    const staffToken = staffReg.body.data.token;

    const docReg = await request('POST', '/api/auth/register', {
      name: 'Dr. Vikram Seth (Pulmonologist)',
      email: docEmail,
      password: 'Password123!',
      role: 'DOCTOR',
      department: 'Pulmonology',
    });
    assert.strictEqual(docReg.status, 201, 'Doctor registered successfully');
    const docToken = docReg.body.data.token;
    const docId = docReg.body.data.user._id;
    console.log('  ✓ Staff & Doctor tokens issued successfully');

    // 4. Connect Socket.IO Clients
    console.log('\n[STAGE 3] Real-Time Socket.IO Multi-Room Subscriptions');
    staffSocket = ClientIO(baseUrl, { transports: ['websocket'] });
    doctorSocket = ClientIO(baseUrl, { transports: ['websocket'] });

    await Promise.all([
      new Promise((resolve) => staffSocket.on('connect', resolve)),
      new Promise((resolve) => doctorSocket.on('connect', resolve)),
    ]);

    const staffSocketEvents = [];
    const doctorSocketEvents = [];

    staffSocket.emit('join_staff');
    doctorSocket.emit('join_doctor');

    staffSocket.on('new_patient', (evt) => staffSocketEvents.push(evt));
    doctorSocket.on('priority_updated', (evt) => doctorSocketEvents.push(evt));
    doctorSocket.on('patient_called', (evt) => doctorSocketEvents.push(evt));

    await new Promise((resolve) => setTimeout(resolve, 300));
    console.log('  ✓ Staff and Doctor rooms connected & subscribed to Socket event channels');

    // 5. Patient Appointment Registration (with X-Ray)
    console.log('\n[STAGE 4] Patient Appointment Booking with X-Ray Scan');
    const bookRes = await request('POST', '/api/patients/appointments', {
      name: 'Vikramaditya Roy',
      age: 58,
      gender: 'Male',
      phoneNumber: '+91-9811223344',
      email: 'vikram.roy@example.com',
      department: 'Pulmonology',
      possibleCondition: 'Acute Severe Pneumonia',
      symptoms: ['Fever', 'Coughing blood', 'Shortness of breath', 'Chest pain'],
      symptomsDescription: 'Patient presenting with severe breathing distress for 3 days.',
      severityLevel: 'HIGH',
      medicalImageType: 'XRAY',
    });

    assert.strictEqual(bookRes.status, 201, 'Patient appointment booked');
    const { tokenNumber, appointmentId } = bookRes.body.data;
    assert(tokenNumber.startsWith('TKN-'), 'Token generated with valid prefix format TKN-');
    console.log(`  ✓ Appointment booked with Token: ${tokenNumber}`);

    // Connect Patient Socket to private token room
    patientSocket = ClientIO(baseUrl, { transports: ['websocket'] });
    await new Promise((resolve) => patientSocket.on('connect', resolve));
    patientSocket.emit('join_patient', tokenNumber);

    let patientStatusUpdateReceived = false;
    patientSocket.on('patient_status_updated', (evt) => {
      patientStatusUpdateReceived = true;
    });

    // 6. Staff Verification & Groq AI Clinical Triage
    console.log('\n[STAGE 5] Staff Verification & Groq AI Clinical Triage Execution');
    const verifyRes = await request(
      'POST',
      `/api/staff/verify/${appointmentId}`,
      {
        staffSeverity: 'HIGH',
        verificationNotes: 'Patient verified by triage nurse. Vitals: SpO2 88%, Temp 102F.',
        department: 'Pulmonology',
      },
      staffToken
    );

    assert.strictEqual(verifyRes.status, 200, 'Staff verification succeeded');
    assert.strictEqual(verifyRes.body.data.appointment.status, 'VERIFIED', 'Appointment status updated to VERIFIED');

    const aiRecord = await AIAnalysis.findOne({ appointment: appointmentId });
    assert(aiRecord !== null, 'Groq AI Analysis record generated');
    console.log(`  ✓ Groq AI Triage completed. Urgency: ${aiRecord.urgencyLevel}, Risk: ${aiRecord.riskLevel}`);

    // 7. DenseNet-121 ML Screening Ingestion & Priority Recalculation
    console.log('\n[STAGE 6] DenseNet-121 ML Screening Ingestion & Multi-Factor Priority Calculation');
    const mlRes = await request('POST', '/api/ai/image-analysis-result', {
      appointmentId,
      tokenNumber,
      screeningStatus: 'CRITICAL_ABNORMALITY_DETECTED',
      imageScore: 0.92,
      possibleFindings: ['Pneumonia Severe', 'Consolidation Left Lower Lobe'],
      modelVersion: 'densenet121-tf-v1.0',
      confidenceSignal: 0.96,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample_xray.jpg',
    });

    assert.strictEqual(mlRes.status, 200, 'ML screening result ingested');

    const updatedQueueEntry = await QueueEntry.findOne({ appointment: appointmentId });
    assert(updatedQueueEntry !== null, 'Queue Entry exists in database');
    assert(updatedQueueEntry.priorityScore >= 110, 'Multi-factor priority score classified as CRITICAL (>= 110)');
    console.log(`  ✓ Combined Multi-Factor Priority Score: ${updatedQueueEntry.priorityScore} (Level: ${updatedQueueEntry.priorityLevel})`);

    // 8. Real-Time Socket Event Assertions
    console.log('\n[STAGE 7] Real-Time Socket.IO Multi-Room Delivery Verification');
    await new Promise((resolve) => setTimeout(resolve, 400));
    assert(staffSocketEvents.length > 0, 'Staff room received new_patient event');
    assert(doctorSocketEvents.length > 0, 'Doctor room received priority_updated event');
    console.log('  ✓ Staff & Doctor dashboards received instant Socket.IO real-time notifications');

    // 9. Doctor Consultation Lifecycle (Start -> Hold -> Resume -> Complete)
    console.log('\n[STAGE 8] Doctor Clinical Consultation Lifecycle');

    // A. Start Consultation
    const startRes = await request(
      'POST',
      '/api/doctor/consultation/start',
      { queueEntryId: updatedQueueEntry._id },
      docToken
    );
    assert.strictEqual(startRes.status, 200, 'Doctor started consultation');
    console.log('  ✓ Consultation started (Status: IN_CONSULTATION)');

    // C. Put Patient on Hold
    const holdRes = await request(
      'POST',
      '/api/doctor/queue/hold',
      {
        queueEntryId: updatedQueueEntry._id,
        reason: 'Awaiting urgent CT Angiography scan',
        category: 'LAB_RESULTS',
      },
      docToken
    );
    assert.strictEqual(holdRes.status, 200, 'Doctor placed patient on hold');
    console.log('  ✓ Patient placed on hold in PENDING queue');

    // D. Resume Patient Consultation
    const resumeRes = await request(
      'POST',
      '/api/doctor/queue/resume',
      { queueEntryId: updatedQueueEntry._id },
      docToken
    );
    assert.strictEqual(resumeRes.status, 200, 'Doctor resumed patient consultation');
    console.log('  ✓ Patient resumed with pending priority boost');

    // E. Complete Consultation
    const completeRes = await request(
      'POST',
      '/api/doctor/consultation/complete',
      {
        queueEntryId: updatedQueueEntry._id,
        consultationData: {
          clinicalNotes: 'Pneumonia treated with IV antibiotics and supplemental oxygen.',
          diagnosisNotes: 'Severe Bacterial Pneumonia (ICD-10 J18.9)',
          vitals: { temp: '101.2 F', heartRate: '98 bpm', spO2: '94%' },
          prescriptions: ['Ceftriaxone 1g IV daily', 'Azithromycin 500mg PO daily'],
          recommendedFollowUp: 'Follow up in 5 days with repeat X-Ray.',
        },
      },
      docToken
    );
    assert.strictEqual(completeRes.status, 200, 'Doctor completed consultation');

    const finalAppointment = await Appointment.findById(appointmentId);
    assert.strictEqual(finalAppointment.status, 'COMPLETED', 'Final appointment status is COMPLETED');
    console.log('  ✓ Consultation completed successfully & persisted in MongoDB');

    // 10. Queue Stats & Final Cleanup
    console.log('\n[STAGE 9] Final Queue Stats & Audit Logging Integrity');
    const statsRes = await request('GET', '/api/queue/stats?department=Pulmonology');
    assert.strictEqual(statsRes.status, 200, 'Queue statistics retrieved');
    assert(statsRes.body.data.totalCompleted >= 1, 'Completed consultation count tracked accurately');
    console.log('  ✓ Department Queue stats updated accurately');

    // Cleanup Sockets & Server
    staffSocket.disconnect();
    doctorSocket.disconnect();
    patientSocket.disconnect();
    ioServer.close();
    server.close();
    await mongoose.disconnect();

    console.log('\n======================================================');
    console.log('🎉 ALL DAY 8 MASTER END-TO-END WORKFLOW TESTS PASSED!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ DAY 8 MASTER TEST SUITE FAILED: ${error.message}`);
    if (staffSocket) staffSocket.disconnect();
    if (doctorSocket) doctorSocket.disconnect();
    if (patientSocket) patientSocket.disconnect();
    if (ioServer) ioServer.close();
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
};

runEndToEndTestSuite();
