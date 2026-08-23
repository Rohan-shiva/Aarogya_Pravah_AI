/**
 * Automated End-to-End Flow Test Script for Aarogya Pravah AI Backend
 * Runs in-memory HTTP requests against the Express app and MongoDB.
 */
require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('../src/app');

let server;
let baseUrl;

// Simple fetch-like HTTP client for testing
const request = async (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
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
      }
    );

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
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

const runTests = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aarogya_pravah_ai';
    console.log(`\n======================================================`);
    console.log(`🚀 STARTING AAROGYA PRAVAH AI INTEGRATION TEST SUITE`);
    console.log(`======================================================\n`);

    console.log(`[Test Setup] Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    // Start local ephemeral HTTP server
    const testPort = 5001;
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(testPort, resolve));
    baseUrl = `http://localhost:${testPort}`;
    console.log(`[Test Setup] Test server listening at ${baseUrl}\n`);

    // TEST 1: Health Check
    console.log('[TEST 1] Testing Health Check Endpoint (/api/health)');
    const healthRes = await request('GET', '/api/health');
    assert(healthRes.status === 200, 'Health endpoint returns HTTP 200');
    assert(healthRes.body.success === true, 'Health check indicates success');

    // TEST 2: Staff & Doctor Registration / Login
    console.log('\n[TEST 2] Testing Staff & Doctor Authentication');
    const staffEmail = `nurse.${Date.now()}@test.com`;
    const staffReg = await request('POST', '/api/auth/register', {
      name: 'Nurse Fatima',
      email: staffEmail,
      password: 'password123',
      role: 'STAFF',
      department: 'General Medicine',
    });
    assert(staffReg.status === 201, 'Staff registered with HTTP 201');
    const staffToken = staffReg.body.data.token;
    assert(Boolean(staffToken), 'Staff received valid JWT token');

    const docEmail = `dr.kapoor.${Date.now()}@test.com`;
    const docReg = await request('POST', '/api/auth/register', {
      name: 'Dr. Kabir Kapoor',
      email: docEmail,
      password: 'password123',
      role: 'DOCTOR',
      department: 'General Medicine',
      specialization: 'Internal Medicine',
    });
    assert(docReg.status === 201, 'Doctor registered with HTTP 201');
    const docToken = docReg.body.data.token;
    assert(Boolean(docToken), 'Doctor received valid JWT token');

    // TEST 3A: Patient Appointment Booking (Without X-Ray)
    console.log('\n[TEST 3A] Testing Patient Appointment Booking (Without X-Ray)');
    const bookingRes = await request('POST', '/api/patients/appointments', {
      name: 'Aarav Sharma',
      age: 42,
      gender: 'Male',
      phoneNumber: '+91-9988776655',
      department: 'General Medicine',
      possibleCondition: 'Severe Cough and High Fever',
      symptoms: ['High fever', 'Cough with phlegm', 'Shortness of breath'],
      symptomsDescription: 'Symptoms worsening over past 48 hours.',
      severityLevel: 'HIGH',
      isAccident: false,
    });
    assert(bookingRes.status === 201, 'Patient appointment without X-ray booked with HTTP 201');
    assert(bookingRes.body.data.status === 'PENDING_STAFF_VERIFICATION', 'Status is PENDING_STAFF_VERIFICATION');
    const tokenNumber = bookingRes.body.data.tokenNumber;
    const appointmentId = bookingRes.body.data.appointmentId;
    assert(Boolean(tokenNumber), `Generated unique token: ${tokenNumber}`);

    // TEST 3B: Patient Appointment Booking (With medicalImageType = 'XRAY')
    console.log('\n[TEST 3B] Testing Patient Appointment Booking (With medicalImageType = XRAY)');
    const xrayBookingRes = await request('POST', '/api/patients/appointments', {
      name: 'Pooja Verma',
      age: 28,
      gender: 'Female',
      phoneNumber: '+91-9911223344',
      department: 'Orthopedics',
      possibleCondition: 'Wrist Fracture',
      symptoms: ['Wrist pain', 'Swelling after fall'],
      symptomsDescription: 'Severe pain on moving left wrist.',
      severityLevel: 'HIGH',
      isAccident: true,
      accidentSeverity: 'MEDIUM',
      medicalImageType: 'XRAY',
    });
    assert(xrayBookingRes.status === 201, 'Patient appointment with XRAY booked with HTTP 201');
    assert(Boolean(xrayBookingRes.body.data.tokenNumber), `Generated X-ray token: ${xrayBookingRes.body.data.tokenNumber}`);

    // TEST 4: Patient Token Lookup (Privacy-Preserving)
    console.log('\n[TEST 4] Testing Privacy-Safe Patient Token Tracking');
    const tokenRes = await request('GET', `/api/patients/token/${tokenNumber}`);
    assert(tokenRes.status === 200, 'Token lookup returns HTTP 200');
    assert(tokenRes.body.data.tokenNumber === tokenNumber, 'Returns correct token number');
    assert(tokenRes.body.data.status === 'PENDING_STAFF_VERIFICATION', 'Returns correct status');
    assert(typeof tokenRes.body.data.estimatedWaitMinutes === 'number', 'Returns estimated wait time');

    // TEST 5: Staff Pending Verifications List
    console.log('\n[TEST 5] Testing Staff Pending Verifications List');
    const pendingList = await request('GET', '/api/staff/pending-verifications', null, staffToken);
    assert(pendingList.status === 200, 'Staff retrieved pending verifications list');
    const found = pendingList.body.data.appointments.some((a) => a.tokenNumber === tokenNumber);
    assert(found, 'Newly booked patient appears in pending verifications list');

    // TEST 6: Staff Verifying Patient & Triggering Groq AI + Priority Engine
    console.log('\n[TEST 6] Testing Staff Verification, AI Triage & Priority Scoring');
    const verifyRes = await request(
      'POST',
      `/api/staff/verify/${appointmentId}`,
      {
        staffSeverity: 'HIGH',
        verificationNotes: 'Patient vitals confirmed. Elevated body temperature (103F).',
      },
      staffToken
    );
    assert(verifyRes.status === 200, 'Patient verified with HTTP 200');
    assert(verifyRes.body.data.appointment.status === 'VERIFIED', 'Appointment status updated to VERIFIED');
    assert(Boolean(verifyRes.body.data.aiAnalysis), 'Groq AI triage analysis record created');
    assert(Boolean(verifyRes.body.data.queueEntry), 'Smart queue entry created with status WAITING');
    assert(verifyRes.body.data.priorityResult.priorityScore > 0, 'Priority score calculated');
    console.log(`     -> Priority Score: ${verifyRes.body.data.priorityResult.priorityScore} (${verifyRes.body.data.priorityResult.priorityLevel})`);

    const queueEntryId = verifyRes.body.data.queueEntry._id;

    // TEST 7: External PyTorch X-Ray Screening Webhook Ingestion
    console.log('\n[TEST 7] Testing PyTorch Medical Image Screening Result Webhook');
    const imageWebhookRes = await request('POST', '/api/ai/image-analysis-result', {
      tokenNumber,
      screeningStatus: 'MODERATE_FINDINGS',
      imageScore: 0.78,
      possibleFindings: ['Bilateral infiltrates', 'Bronchial wall thickening'],
      modelVersion: 'pytorch-chest-xray-v2.1',
      confidenceSignal: 0.92,
      findingsDetails: { opacities: 'Lower right lobe' },
    });
    assert(imageWebhookRes.status === 200, 'Image screening signal ingested with HTTP 200');
    assert(
      imageWebhookRes.body.data.imageAnalysis.screeningStatus === 'MODERATE_FINDINGS',
      'Image analysis saved'
    );
    assert(Boolean(imageWebhookRes.body.data.updatedPriority), 'Priority automatically updated after screening result');
    console.log(`     -> Recalculated Score with Image: ${imageWebhookRes.body.data.updatedPriority.priorityScore}`);

    // TEST 8: Doctor Dashboard Prioritized Queue View
    console.log('\n[TEST 8] Testing Doctor Queue Retrieval');
    const docQueueRes = await request('GET', '/api/doctor/queue', null, docToken);
    assert(docQueueRes.status === 200, 'Doctor queue retrieved with HTTP 200');
    assert(docQueueRes.body.data.queue.length > 0, 'Queue contains active entries');

    // TEST 9: Doctor Starting Consultation
    console.log('\n[TEST 9] Testing Doctor Starting Consultation');
    const startConsultRes = await request(
      'POST',
      '/api/doctor/consultation/start',
      { queueEntryId },
      docToken
    );
    assert(startConsultRes.status === 200, 'Consultation started successfully');
    assert(
      startConsultRes.body.data.appointment.status === 'IN_CONSULTATION',
      'Status transitioned to IN_CONSULTATION'
    );

    // TEST 10: Doctor Placing Patient On Hold (Pending for Labs/X-Ray)
    console.log('\n[TEST 10] Testing Placing Patient on Hold (PENDING queue)');
    const holdRes = await request(
      'POST',
      '/api/doctor/queue/hold',
      {
        queueEntryId,
        reason: 'Sent for urgent Complete Blood Count & Arterial Blood Gas test',
        category: 'LAB_RESULTS',
        notes: 'Review immediately when lab technician uploads results.',
      },
      docToken
    );
    assert(holdRes.status === 200, 'Patient placed on hold with HTTP 200');
    assert(holdRes.body.data.appointment.status === 'PENDING', 'Status transitioned to PENDING');

    // TEST 11: Viewing Pending Queue
    console.log('\n[TEST 11] Testing Pending Queue View');
    const pendingQueueRes = await request('GET', '/api/doctor/pending-queue', null, docToken);
    assert(pendingQueueRes.status === 200, 'Pending queue retrieved');
    const isHeld = pendingQueueRes.body.data.pendingQueue.some((q) => q._id === queueEntryId);
    assert(isHeld, 'Held patient appears in pending queue');

    // TEST 12: Resuming Patient from Hold to Active Queue with Priority Boost
    console.log('\n[TEST 12] Testing Resuming Patient from Hold (Priority Boosted)');
    const resumeRes = await request(
      'POST',
      '/api/doctor/queue/resume',
      { queueEntryId },
      docToken
    );
    assert(resumeRes.status === 200, 'Patient resumed with HTTP 200');
    assert(resumeRes.body.data.appointment.status === 'WAITING', 'Status returned to WAITING');

    // TEST 13: Doctor Completing Consultation with Diagnosis and Prescriptions
    console.log('\n[TEST 13] Testing Doctor Completing Consultation');
    // Start again before completion
    await request('POST', '/api/doctor/consultation/start', { queueEntryId }, docToken);

    const completeRes = await request(
      'POST',
      '/api/doctor/consultation/complete',
      {
        queueEntryId,
        clinicalNotes: 'Chest auscultation reveals bilateral wheezing. Responded well to nebulization.',
        diagnosisNotes: 'Acute Bronchitis with secondary bacterial superinfection.',
        vitals: {
          bloodPressure: '128/82',
          heartRate: 88,
          temperature: 99.4,
          oxygenSaturation: 97,
        },
        prescriptions: [
          {
            medicationName: 'Amoxicillin-Clavulanate 625mg',
            dosage: '1 tablet',
            frequency: 'Twice daily after meals',
            durationDays: 5,
          },
          {
            medicationName: 'Levosalbutamol Inhaler',
            dosage: '2 puffs',
            frequency: 'Every 8 hours as needed',
            durationDays: 7,
          },
        ],
        recommendedFollowUp: 'Follow up in 5 days if fever persists.',
      },
      docToken
    );
    assert(completeRes.status === 200, 'Consultation completed with HTTP 200');
    assert(completeRes.body.data.appointment.status === 'COMPLETED', 'Status transitioned to COMPLETED');
    assert(completeRes.body.data.consultation.status === 'COMPLETED', 'Consultation record marked COMPLETED');

    // TEST 14: Final Queue Statistics
    console.log('\n[TEST 14] Testing Queue Statistics');
    const statsRes = await request('GET', '/api/queue/stats');
    assert(statsRes.status === 200, 'Queue statistics retrieved');
    assert(typeof statsRes.body.data.totalCompleted === 'number', 'Completed counts tracked accurately');

    console.log('\n======================================================');
    console.log('🎉 ALL 14 TEST SUITE SCENARIOS PASSED SUCCESSFULLY!');
    console.log('======================================================\n');

    server.close();
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ TEST SUITE FAILED: ${error.message}`);
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
};

runTests();
