/**
 * Day 6 Automated Test Suite — TensorFlow DenseNet-121 ML & Backend Integration
 * Verifies:
 * 1. Image screening webhook ingestion (`processScreeningResult`).
 * 2. Database persistence of DenseNet-121 prediction results (`MedicalImageAnalysis`).
 * 3. Dynamic priority recalculation incorporating ML screening score (`imageScreeningPoints`).
 * 4. Async ML service invocation (`triggerAsyncImageAnalysis`).
 * 5. Graceful offline fallback handling when ML service is unavailable.
 */
require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('../src/app');
const { processScreeningResult, triggerAsyncImageAnalysis } = require('../src/services/imageAnalysisService');
const { MedicalImageAnalysis } = require('../src/models/MedicalImageAnalysis');
const { Appointment } = require('../src/models/Appointment');
const { QueueEntry } = require('../src/models/QueueEntry');

let server;
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
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
};

const runMlIntegrationTests = async () => {
  try {
    console.log(`\n======================================================`);
    console.log(`🔬 STARTING DAY 6 ML & BACKEND INTEGRATION TEST SUITE`);
    console.log(`======================================================\n`);

    const mongoUri = 'mongodb://127.0.0.1:27017/aarogya_pravah_ai';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

    const testPort = 5004;
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(testPort, resolve));
    baseUrl = `http://localhost:${testPort}`;

    // 1. TEST STAFF REGISTRATION & APPOINTMENT CREATION WITH X-RAY
    console.log('[TEST 1] Creating Patient Appointment with X-Ray Scan Upload');

    const regRes = await request('POST', '/api/auth/register', {
      name: 'ML Test Nurse',
      email: `ml.nurse.${Date.now()}@test.com`,
      password: 'password123',
      role: 'STAFF',
      department: 'Pulmonology',
    });
    const staffToken = regRes.body.data.token;

    const bookRes = await request('POST', '/api/patients/appointments', {
      name: 'Ananya Gupta',
      age: 38,
      gender: 'Female',
      phoneNumber: '+91-9876500112',
      department: 'Pulmonology',
      possibleCondition: 'Pneumonia Screening',
      symptoms: ['High fever', 'Productive cough', 'Chest pain on deep breath'],
      severityLevel: 'HIGH',
      medicalImageType: 'XRAY',
    });
    assert(bookRes.status === 201, 'Patient appointment registered with HTTP 201');
    const { tokenNumber, appointmentId } = bookRes.body.data;
    assert(Boolean(tokenNumber), `Issued token number: ${tokenNumber}`);

    // Verify appointment by staff
    const verifyRes = await request('POST', `/api/staff/verify/${appointmentId}`, {
      staffSeverity: 'HIGH',
      verificationNotes: 'Vitals confirmed. X-Ray image uploaded for DenseNet-121 screening.',
    }, staffToken);
    assert(verifyRes.status === 200, 'Staff verified appointment into active queue');
    const basePriorityScore = verifyRes.body.data.priorityResult.priorityScore;
    console.log(`     -> Base Priority Score before ML Screening: ${basePriorityScore}`);

    // 2. TEST DENSENET-121 SCREENING RESULT INGESTION
    console.log('\n[TEST 2] Processing TensorFlow DenseNet-121 ML Screening Ingestion');
    const mlPayload = {
      appointmentId,
      tokenNumber,
      screeningStatus: 'CRITICAL_ABNORMALITY_DETECTED',
      imageScore: 0.8918,
      possibleFindings: ['Possible Pneumonia Severe', 'Bilateral focal opacities'],
      modelVersion: 'densenet121-tf-v1.0',
      confidenceSignal: 0.95,
      findingsDetails: { predictedClass: 'PNEUMONIA_SEVERE' },
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample_xray.jpg',
    };

    const mlResult = await processScreeningResult(mlPayload);
    assert(mlResult.imageRecord !== null, 'MedicalImageAnalysis record created in database');
    assert(mlResult.imageRecord.screeningStatus === 'CRITICAL_ABNORMALITY_DETECTED', 'Saved DenseNet-121 screeningStatus');
    assert(mlResult.imageRecord.imageScore === 0.8918, 'Saved DenseNet-121 abnormality score');
    assert(mlResult.imageRecord.modelVersion === 'densenet121-tf-v1.0', 'Saved modelVersion string');

    // 3. TEST DYNAMIC PRIORITY SCORE RECALCULATION WITH ML SIGNAL
    console.log('\n[TEST 3] Verifying Dynamic Priority Recalculation after ML Signal');
    const updatedQueueEntry = await QueueEntry.findOne({ appointment: appointmentId });
    assert(updatedQueueEntry.priorityScore > basePriorityScore, 'ML screening score boosted overall priority score');
    assert(updatedQueueEntry.scoreBreakdown.imageScreeningPoints > 0, 'Image screening points included in score breakdown');
    console.log(`     -> Recalculated Priority Score after DenseNet-121 ML Screening: ${updatedQueueEntry.priorityScore} (+${updatedQueueEntry.scoreBreakdown.imageScreeningPoints} ML pts)`);

    // 4. TEST ASYNC ML SERVICE OFFLINE FALLBACK HANDLING
    console.log('\n[TEST 4] Testing Async ML Service Offline Fallback Handling');
    const fallbackAppointmentRes = await request('POST', '/api/patients/appointments', {
      name: 'Rahul Dravid',
      age: 49,
      gender: 'Male',
      phoneNumber: '+91-9876500113',
      department: 'Orthopedics',
      symptoms: ['Sprain in ankle'],
      severityLevel: 'MEDIUM',
    });
    const fallbackId = fallbackAppointmentRes.body.data.appointmentId;

    // Trigger async ML analysis with offline endpoint
    await triggerAsyncImageAnalysis({
      appointmentId: fallbackId,
      tokenNumber: fallbackAppointmentRes.body.data.tokenNumber,
      patientId: 'patient_123',
      imageUrl: 'http://invalid-offline-ml-service-host:9999/image.jpg',
    });

    // Wait 300ms for setImmediate async execution
    await new Promise((resolve) => setTimeout(resolve, 300));

    const checkedAppointment = await Appointment.findById(fallbackId);
    assert(checkedAppointment !== null, 'Patient appointment exists');
    assert(checkedAppointment.status === 'PENDING_STAFF_VERIFICATION', 'Patient registration flow completes smoothly despite offline ML service');

    // Clean up server and database connections
    server.close();
    await mongoose.disconnect();

    console.log('\n======================================================');
    console.log('🎉 ALL DAY 6 ML & BACKEND INTEGRATION TESTS PASSED!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ DAY 6 TEST SUITE FAILED: ${error.message}`);
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
};

runMlIntegrationTests();
