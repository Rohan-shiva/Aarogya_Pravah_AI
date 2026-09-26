/**
 * Day 7 Automated Test Suite — Multi-Factor Priority Engine (Groq AI + DenseNet-121 ML) & Socket.IO Display Stream
 * Tests:
 * 1. Combining Groq AI clinical triage + DenseNet-121 radiological screening into a unified priority score.
 * 2. Verification of separate, transparent evidence breakdown factors (neither overwrites the other).
 * 3. Real-time Socket.IO event emission delivering combined Groq + ML signals to dashboards.
 */
require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { io: ClientIO } = require('../../frontend/node_modules/socket.io-client');
const app = require('../src/app');
const initSocketIO = require('../src/sockets/socketHandler');
const { socketEmitter } = require('../src/sockets/socketEmitter');
const { calculatePriorityScore } = require('../src/services/priorityService');
const { processScreeningResult } = require('../src/services/imageAnalysisService');
const { AIAnalysis } = require('../src/models/AIAnalysis');
const { Appointment } = require('../src/models/Appointment');
const { QueueEntry } = require('../src/models/QueueEntry');

let server;
let ioServer;
let clientSocket;
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

const runCombinedGroqMlTests = async () => {
  try {
    console.log(`\n======================================================`);
    console.log(`🧬 STARTING DAY 7 COMBINED GROQ AI + DENSENET ML TEST SUITE`);
    console.log(`======================================================\n`);

    // 1. TEST MULTI-FACTOR PRIORITY SCORE COMBINATION
    console.log('[TEST 1] Combining Groq AI Triage + DenseNet-121 ML Screening Signals');

    const sampleGroqAnalysis = {
      urgencyLevel: 'HIGH',
      riskLevel: 'CRITICAL',
      priorityRecommendation: 'HIGH',
      reason: 'Red-flag acute respiratory distress identified.',
    };

    const sampleMlAnalysis = {
      screeningStatus: 'CRITICAL_ABNORMALITY_DETECTED',
      imageScore: 0.89,
      modelVersion: 'densenet121-tf-v1.0',
    };

    const combinedScore = calculatePriorityScore({
      staffSeverity: 'HIGH', // 50 pts
      aiAnalysis: sampleGroqAnalysis, // Groq Urgency HIGH (30 pts) + Risk CRITICAL (40 pts) = 70 pts
      imageAnalysis: sampleMlAnalysis, // DenseNet-121 Score 0.89 -> 27 pts (critical min 25) = 27 pts
    });

    // Total expected score: 50 (Staff HIGH) + 30 (Groq Urgency) + 40 (Groq Risk) + 27 (DenseNet ML) = 147 points
    assert(combinedScore.priorityScore === 147, 'Combined Priority Score equals 147 points (50 + 30 + 40 + 27)');
    assert(combinedScore.priorityLevel === 'CRITICAL', 'Combined score classified as CRITICAL priority level (>= 110)');
    assert(combinedScore.scoreBreakdown.aiUrgencyPoints === 30, 'Breakdown preserves Groq AI Urgency points (30)');
    assert(combinedScore.scoreBreakdown.aiRiskPoints === 40, 'Breakdown preserves Groq AI Risk points (40)');
    assert(combinedScore.scoreBreakdown.imageScreeningPoints === 27, 'Breakdown preserves DenseNet-121 ML Image Screening points (27)');
    assert(combinedScore.factorsUsed.length >= 4, 'Factors list transparently includes all distinct evidence signals');

    console.log(`     -> Combined Priority Breakdown: Clinical=${combinedScore.scoreBreakdown.clinicalSeverityPoints}, GroqUrgency=${combinedScore.scoreBreakdown.aiUrgencyPoints}, GroqRisk=${combinedScore.scoreBreakdown.aiRiskPoints}, DenseNetML=${combinedScore.scoreBreakdown.imageScreeningPoints} | Total = ${combinedScore.priorityScore}`);

    // 2. TEST END-TO-END DATABASE & SOCKET PROPAGATION WITH GROQ + ML
    console.log('\n[TEST 2] End-to-End Database Persistence & Socket Event Stream');

    const mongoUri = 'mongodb://127.0.0.1:27017/aarogya_pravah_ai';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

    const testPort = 5005;
    server = http.createServer(app);
    ioServer = new Server(server, { cors: { origin: '*' } });
    initSocketIO(ioServer);

    await new Promise((resolve) => server.listen(testPort, resolve));
    baseUrl = `http://localhost:${testPort}`;

    // Connect Client Socket
    clientSocket = ClientIO(baseUrl, { transports: ['websocket'] });
    await new Promise((resolve) => clientSocket.on('connect', resolve));
    assert(clientSocket.connected === true, 'Socket client connected to test server');

    // Subscribe client to Doctor Dashboard room
    clientSocket.emit('join_doctor');
    await new Promise((resolve) => {
      clientSocket.on('joined_room', (data) => {
        if (data.room === 'doctor') resolve();
      });
    });
    assert(true, 'Client joined doctor dashboard room');

    // Listen for real-time priority updates
    let receivedPriorityEvent = null;
    clientSocket.on('priority_updated', (data) => {
      receivedPriorityEvent = data;
    });

    // Register Staff and Create Patient Appointment
    const regRes = await request('POST', '/api/auth/register', {
      name: 'Day 7 Triage Doctor',
      email: `dr.day7.${Date.now()}@test.com`,
      password: 'password123',
      role: 'DOCTOR',
      department: 'Pulmonology',
    });
    const docToken = regRes.body.data.token;

    const bookRes = await request('POST', '/api/patients/appointments', {
      name: 'Rajesh Kumar',
      age: 52,
      gender: 'Male',
      phoneNumber: '+91-9876007788',
      department: 'Pulmonology',
      possibleCondition: 'Severe Pneumonia',
      symptoms: ['High fever', 'Cough with sputum', 'Shortness of breath'],
      severityLevel: 'HIGH',
      medicalImageType: 'XRAY',
    });
    const { tokenNumber, appointmentId } = bookRes.body.data;
    const targetAppointment = await Appointment.findById(appointmentId);

    // Create QueueEntry record so patient is in active department queue
    await QueueEntry.create({
      appointment: appointmentId,
      patient: targetAppointment.patient,
      department: 'Pulmonology',
      tokenNumber,
      status: 'WAITING',
      checkInTime: new Date(),
      priorityScore: 50,
      priorityLevel: 'HIGH',
    });

    // Save Groq AI Analysis record
    await AIAnalysis.create({
      appointment: appointmentId,
      patient: targetAppointment.patient,
      urgencyLevel: 'HIGH',
      riskLevel: 'CRITICAL',
      priorityRecommendation: 'HIGH',
      reason: 'Severe acute pulmonary symptoms identified.',
      suggestedVitalsToCheck: ['SpO2', 'BP', 'Pulse'],
      modelName: 'llama-3.3-70b-versatile',
      isAiFallback: false,
    });

    // Ingest DenseNet-121 ML screening signal
    await processScreeningResult({
      appointmentId,
      tokenNumber,
      screeningStatus: 'CRITICAL_ABNORMALITY_DETECTED',
      imageScore: 0.89,
      possibleFindings: ['Possible Pneumonia Severe'],
      modelVersion: 'densenet121-tf-v1.0',
      confidenceSignal: 0.95,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample_xray.jpg',
    });

    // Wait 500ms for Socket event propagation
    await new Promise((resolve) => setTimeout(resolve, 500));

    assert(receivedPriorityEvent !== null, 'Doctor Dashboard received priority_updated Socket event');
    assert(receivedPriorityEvent.tokenNumber === tokenNumber, 'Socket event carries correct token number');
    const score = receivedPriorityEvent.priorityData?.newPriorityScore || receivedPriorityEvent.newPriorityScore;
    assert(score > 0, 'Socket event carries updated multi-factor priority score');

    // Cleanup sockets and server
    clientSocket.disconnect();
    ioServer.close();
    server.close();
    await mongoose.disconnect();

    console.log('\n======================================================');
    console.log('🎉 ALL DAY 7 GROQ + ML MULTI-FACTOR TESTS PASSED!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ DAY 7 TEST SUITE FAILED: ${error.message}`);
    if (clientSocket) clientSocket.disconnect();
    if (ioServer) ioServer.close();
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
};

runCombinedGroqMlTests();
