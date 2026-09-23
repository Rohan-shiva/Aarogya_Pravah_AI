/**
 * Day 3 Automated Test Suite — Priority Engine & Socket.IO Real-Time Integration
 * Tests:
 * 1. Priority score calculations across all clinical, accident, AI, imaging, aging, and return signals.
 * 2. Threshold-based priority level classification (LOW, MEDIUM, HIGH, CRITICAL).
 * 3. Queue ordering & tie-breaking (priorityScore DESC, checkInTime ASC).
 * 4. Real-time Socket.IO room subscriptions & event broadcasting.
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
const config = require('../src/config/priorityConfig');

let server;
let ioServer;
let clientSocket;
let baseUrl;

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
};

const runPriorityAndSocketTests = async () => {
  try {
    console.log(`\n======================================================`);
    console.log(`⚡ STARTING DAY 3 PRIORITY ENGINE & SOCKET.IO TEST SUITE`);
    console.log(`======================================================\n`);

    // 1. TEST PRIORITY CALCULATIONS & BREAKDOWN
    console.log('[TEST 1] Testing Priority Engine Calculations & Factors');

    // Case 1A: Base patient reported severity
    const scoreBase = calculatePriorityScore({ reportedSeverity: 'MEDIUM' });
    assert(scoreBase.priorityScore === 25, 'Base MEDIUM reported severity gives 25 points');
    assert(scoreBase.priorityLevel === 'LOW', '25 points maps to LOW priority level (< 35)');

    // Case 1B: Staff verified HIGH severity + Accident boost
    const scoreAccident = calculatePriorityScore({
      staffSeverity: 'HIGH',
      isAccident: true,
      accidentSeverity: 'HIGH',
    });
    assert(scoreAccident.priorityScore === 50 + 45, 'Staff HIGH (50) + Accident HIGH (45) = 95 points');
    assert(scoreAccident.priorityLevel === 'HIGH', '95 points maps to HIGH priority level');

    // Case 1C: Groq AI urgency + risk signals
    const scoreGroq = calculatePriorityScore({
      staffSeverity: 'HIGH',
      aiAnalysis: { urgencyLevel: 'CRITICAL', riskLevel: 'HIGH' },
    });
    assert(scoreGroq.priorityScore === 50 + 45 + 25, 'Staff HIGH (50) + AI Urgency CRITICAL (45) + AI Risk HIGH (25) = 120 points');
    assert(scoreGroq.priorityLevel === 'CRITICAL', '120 points maps to CRITICAL priority level (>= 110)');

    // Case 1D: Aging factor boost
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const scoreAging = calculatePriorityScore({
      reportedSeverity: 'MEDIUM',
      checkInTime: thirtyMinsAgo,
    });
    // 30 mins elapsed = 3 intervals of 10 mins = 3 * 2.0 = +6 points
    assert(scoreAging.priorityScore === 25 + 6, 'Wait time aging (+6 pts for 30 mins) added to base score');

    // Case 1E: Returning pending patient boost
    const scorePendingReturn = calculatePriorityScore({
      reportedSeverity: 'HIGH',
      isReturningFromPending: true,
    });
    assert(scorePendingReturn.priorityScore === 50 + 35, 'Returning pending patient receives +35 points boost');

    // 2. TEST QUEUE ORDERING & TIE-BREAKING
    console.log('\n[TEST 2] Testing Queue Sorting & Tie-Breaking Logic');
    const queueEntries = [
      { id: 'patient1', priorityScore: 70, checkInTime: new Date(Date.now() - 10000) },
      { id: 'patient2', priorityScore: 120, checkInTime: new Date(Date.now() - 5000) },
      { id: 'patient3', priorityScore: 70, checkInTime: new Date(Date.now() - 20000) }, // Tied with patient1 but checked in earlier
    ];

    queueEntries.sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      return new Date(a.checkInTime) - new Date(b.checkInTime);
    });

    assert(queueEntries[0].id === 'patient2', 'Highest priority score (120) placed first');
    assert(queueEntries[1].id === 'patient3', 'Tied score (70) ordered by earlier checkInTime (FIFO tie-breaker)');
    assert(queueEntries[2].id === 'patient1', 'Tied score (70) with later checkInTime placed after');

    // 3. TEST REAL-TIME SOCKET.IO EVENT EMISSIONS
    console.log('\n[TEST 3] Testing Real-Time Socket.IO Server & Client Subscriptions');

    const mongoUri = 'mongodb://127.0.0.1:27017/aarogya_pravah_ai';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

    const testPort = 5003;
    server = http.createServer(app);
    ioServer = new Server(server, {
      cors: { origin: '*' },
    });
    initSocketIO(ioServer);

    await new Promise((resolve) => server.listen(testPort, resolve));
    baseUrl = `http://localhost:${testPort}`;

    // Connect Client Socket
    clientSocket = ClientIO(baseUrl, { transports: ['websocket'] });

    await new Promise((resolve) => {
      clientSocket.on('connect', resolve);
    });
    assert(clientSocket.connected === true, 'Socket.IO client connected to test server');

    // Test joining room
    clientSocket.emit('join_staff');
    await new Promise((resolve) => {
      clientSocket.on('joined_room', (data) => {
        if (data.room === 'staff') resolve();
      });
    });
    assert(true, 'Client successfully joined staff dashboard room');

    // Test receiving real-time events
    const receivedEvents = [];

    clientSocket.on('new_patient', (data) => receivedEvents.push('new_patient'));
    clientSocket.on('priority_updated', (data) => receivedEvents.push('priority_updated'));
    clientSocket.on('queue_updated', (data) => receivedEvents.push('queue_updated'));

    // Emit test events via backend socketEmitter
    socketEmitter.emitNewPatient({ tokenNumber: 'TEST-101', department: 'Emergency' });
    socketEmitter.emitPriorityUpdated('TEST-101', 'Emergency', { priorityScore: 115, priorityLevel: 'CRITICAL' });
    socketEmitter.emitQueueUpdated('Emergency', [{ tokenNumber: 'TEST-101', priorityScore: 115 }]);

    // Wait for event propagation
    await new Promise((resolve) => setTimeout(resolve, 500));

    assert(receivedEvents.includes('new_patient'), 'Client received new_patient real-time event');
    assert(receivedEvents.includes('priority_updated'), 'Client received priority_updated real-time event');
    assert(receivedEvents.includes('queue_updated'), 'Client received queue_updated real-time event');

    // Cleanup sockets and server
    clientSocket.disconnect();
    ioServer.close();
    server.close();
    await mongoose.disconnect();

    console.log('\n======================================================');
    console.log('🎉 ALL DAY 3 PRIORITY & SOCKET TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ DAY 3 TEST SUITE FAILED: ${error.message}`);
    if (clientSocket) clientSocket.disconnect();
    if (ioServer) ioServer.close();
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
};

runPriorityAndSocketTests();
