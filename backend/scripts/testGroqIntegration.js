/**
 * Automated Groq AI Integration Test Suite for Aarogya Pravah AI
 * Verifies safe JSON parsing, output normalization, test cases (A, B, C, D, E),
 * priority score integration, and health check test endpoints.
 */
require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('../src/app');
const { safeJsonParse, normalizeTriageOutput, analyzePatientTriage, generateFallbackTriage } = require('../src/services/groqService');
const { calculatePriorityScore } = require('../src/services/priorityService');

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

const runGroqTests = async () => {
  try {
    console.log(`\n======================================================`);
    console.log(`🧠 STARTING GROQ AI INTEGRATION & PARSING TEST SUITE`);
    console.log(`======================================================\n`);

    // 1. TEST SAFE JSON PARSING
    console.log('[TEST 1] Testing safeJsonParse utility');

    const cleanJsonStr = `{"urgencyLevel": "HIGH", "riskLevel": "HIGH", "riskFactors": ["fever"], "priorityRecommendation": "HIGH", "reason": "Severe infection", "suggestedVitalsToCheck": ["SpO2"]}`;
    const parsedClean = safeJsonParse(cleanJsonStr);
    assert(parsedClean !== null && parsedClean.urgencyLevel === 'HIGH', 'Parses valid clean JSON correctly');

    const markdownFenceStr = `Here is the triage output:\n\`\`\`json\n{"urgencyLevel": "CRITICAL", "riskLevel": "CRITICAL", "riskFactors": ["chest pain"], "priorityRecommendation": "CRITICAL", "reason": "Acute coronary syndrome suspect", "suggestedVitalsToCheck": ["ECG", "BP"]}\n\`\`\``;
    const parsedFence = safeJsonParse(markdownFenceStr);
    assert(parsedFence !== null && parsedFence.urgencyLevel === 'CRITICAL', 'Parses markdown-fenced ```json ... ``` string correctly');

    const trailingCommaStr = `{"urgencyLevel": "LOW", "riskLevel": "LOW", "riskFactors": ["mild cold",], "priorityRecommendation": "LOW", "reason": "Mild symptoms",}`;
    const parsedComma = safeJsonParse(trailingCommaStr);
    assert(parsedComma !== null && parsedComma.urgencyLevel === 'LOW', 'Parses JSON with trailing commas safely');

    const invalidStr = `This is not valid json text at all.`;
    const parsedInvalid = safeJsonParse(invalidStr);
    assert(parsedInvalid === null, 'Returns null safely when text cannot be parsed into JSON');

    // 2. TEST SCHEMA NORMALIZATION
    console.log('\n[TEST 2] Testing normalizeTriageOutput utility');
    const normalized = normalizeTriageOutput({
      urgencyLevel: 'high',
      riskLevel: 'critical',
      priorityRecommendation: 'high',
      riskFactors: 'single risk factor string',
      reason: 'Valid clinical explanation',
    });
    assert(normalized.urgencyLevel === 'HIGH', 'Normalizes urgencyLevel to uppercase enum HIGH');
    assert(normalized.riskLevel === 'CRITICAL', 'Normalizes riskLevel to uppercase enum CRITICAL');
    assert(Array.isArray(normalized.riskFactors), 'Converts single string riskFactors into array');
    assert(normalized.isAiFallback === false, 'Sets isAiFallback to false for valid LLM response');

    // 3. TEST CLINICAL CASE A — Low Urgency
    console.log('\n[TEST 3] Test Case A: Low Urgency Patient Triage');
    const caseAData = {
      patientName: 'Ramesh Patel',
      age: 32,
      gender: 'Male',
      department: 'General Medicine',
      symptoms: ['Mild runny nose', 'Slight sore throat'],
      symptomsDescription: 'Symptoms started yesterday morning.',
      reportedSeverity: 'LOW',
      isAccident: false,
    };
    const caseARes = await analyzePatientTriage(caseAData);
    assert(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(caseARes.urgencyLevel), 'Returns valid urgencyLevel for Case A');
    assert(Array.isArray(caseARes.riskFactors), 'Returns list of risk factors for Case A');
    assert(Boolean(caseARes.reason), 'Returns explanatory clinical rationale for Case A');
    console.log(`     -> Case A Result: Urgency=${caseARes.urgencyLevel}, Risk=${caseARes.riskLevel}, Fallback=${caseARes.isAiFallback}`);

    // 4. TEST CLINICAL CASE B — High Urgency
    console.log('\n[TEST 4] Test Case B: High Urgency Patient Triage');
    const caseBData = {
      patientName: 'Sunita Sharma',
      age: 64,
      gender: 'Female',
      department: 'Cardiology',
      symptoms: ['Chest pain', 'Shortness of breath', 'Profuse sweating'],
      symptomsDescription: 'Acute pressure feeling in chest radiating to left arm.',
      reportedSeverity: 'CRITICAL',
      staffSeverity: 'CRITICAL',
      isAccident: false,
    };
    const caseBRes = await analyzePatientTriage(caseBData);
    assert(caseBRes.urgencyLevel === 'HIGH' || caseBRes.urgencyLevel === 'CRITICAL', 'Identifies high acute risk for chest pain presentation');
    console.log(`     -> Case B Result: Urgency=${caseBRes.urgencyLevel}, Risk=${caseBRes.riskLevel}, Fallback=${caseBRes.isAiFallback}`);

    // 5. TEST CLINICAL CASE C — Trauma / Accident
    console.log('\n[TEST 5] Test Case C: Trauma / Accident Case Triage');
    const caseCData = {
      patientName: 'Vikram Singh',
      age: 26,
      gender: 'Male',
      department: 'Emergency & Trauma',
      symptoms: ['Head injury after motor bike collision', 'Laceration on forehead'],
      reportedSeverity: 'HIGH',
      isAccident: true,
      accidentSeverity: 'HIGH',
    };
    const caseCRes = await analyzePatientTriage(caseCData);
    assert(caseCRes.urgencyLevel === 'HIGH' || caseCRes.urgencyLevel === 'CRITICAL', 'Trauma case categorized as HIGH or CRITICAL');
    assert(caseCRes.riskFactors.some((rf) => rf.toLowerCase().includes('trauma') || rf.toLowerCase().includes('accident') || rf.toLowerCase().includes('high')), 'Trauma risk factor highlighted');

    // 6. TEST CLINICAL CASE D — Missing / Incomplete Data
    console.log('\n[TEST 6] Test Case D: Incomplete Data Input Triage');
    const caseDData = {
      patientName: 'Unknown Intake',
      age: 30,
      gender: 'Other',
      department: 'General Medicine',
      symptoms: [],
      symptomsDescription: '',
      reportedSeverity: 'MEDIUM',
    };
    const caseDRes = await analyzePatientTriage(caseDData);
    assert(Boolean(caseDRes.urgencyLevel), 'Handles empty symptoms safely without crashing');
    assert(Boolean(caseDRes.reason), 'Produces valid objective fallback rationale');

    // 7. TEST CLINICAL CASE E — Simulated Groq Failure / Fallback Workflow
    console.log('\n[TEST 7] Test Case E: Groq API Error & Fallback Recovery');
    const fallbackRes = generateFallbackTriage(caseBData, 'Simulated API Timeout', 'ETIMEDOUT connection to groq api');
    assert(fallbackRes.isAiFallback === true, 'Fallback record correctly flagged with isAiFallback: true');
    assert(fallbackRes.fallbackReason === 'Simulated API Timeout', 'Stores fallback reason string');
    assert(fallbackRes.urgencyLevel === 'CRITICAL', 'Heuristic rule engine correctly triages acute symptoms');

    // 8. TEST PRIORITY ENGINE INTEGRATION WITH GROQ SIGNAL
    console.log('\n[TEST 8] Testing Groq AI signal effect on Priority Engine score');
    const priorityResultWithGroq = calculatePriorityScore({
      staffSeverity: 'HIGH',
      aiAnalysis: { urgencyLevel: 'CRITICAL', riskLevel: 'HIGH' },
    });
    const priorityResultNoGroq = calculatePriorityScore({
      staffSeverity: 'HIGH',
      aiAnalysis: null,
    });
    assert(priorityResultWithGroq.priorityScore > priorityResultNoGroq.priorityScore, 'Groq AI signals increase overall priority score correctly');
    console.log(`     -> Priority without Groq: ${priorityResultNoGroq.priorityScore}, With Groq: ${priorityResultWithGroq.priorityScore}`);

    // 9. TEST LIVE TEST ENDPOINT (/api/ai/test-groq)
    console.log('\n[TEST 9] Testing /api/ai/test-groq Endpoint');
    const mongoUri = 'mongodb://127.0.0.1:27017/aarogya_pravah_ai';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

    const testPort = 5002;
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(testPort, resolve));
    baseUrl = `http://localhost:${testPort}`;

    // Register test staff user
    const regRes = await request('POST', '/api/auth/register', {
      name: 'Groq Tester Nurse',
      email: `groq.tester.${Date.now()}@test.com`,
      password: 'password123',
      role: 'STAFF',
      department: 'Emergency Medicine',
    });
    const staffToken = regRes.body.data.token;

    const testEndpointRes = await request('POST', '/api/ai/test-groq', {}, staffToken);
    assert(testEndpointRes.status === 200, 'Test endpoint returns HTTP 200');
    assert(Boolean(testEndpointRes.body.data.status), 'Returns status field (ONLINE or FALLBACK)');
    assert(typeof testEndpointRes.body.data.latencyMs === 'number', 'Returns latency measurement');
    assert(Boolean(testEndpointRes.body.data.parsedResult), 'Returns parsed triage result object');
    console.log(`     -> Test Endpoint Result: Status=${testEndpointRes.body.data.status}, Latency=${testEndpointRes.body.data.latencyMs}ms, Fallback=${testEndpointRes.body.data.isAiFallback}`);

    server.close();
    await mongoose.disconnect();

    console.log('\n======================================================');
    console.log('🎉 ALL GROQ AI INTEGRATION TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ GROQ TEST SUITE FAILED: ${error.message}`);
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
};

runGroqTests();
