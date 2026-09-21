const { getGroqClient, isGroqConfigured, DEFAULT_MODEL } = require('../config/groq');
const logger = require('../utils/logger');

/**
 * Safely parse raw LLM output strings into JSON objects.
 * Handles markdown fences, surrounding text, trailing commas, and malformed syntax.
 * @param {string} rawText
 * @returns {Object|null} Parsed JSON object or null if invalid
 */
const safeJsonParse = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return null;

  try {
    // 1. First attempt direct JSON parse
    return JSON.parse(rawText.trim());
  } catch (e1) {
    // Continue to advanced cleanup
  }

  try {
    let clean = rawText.trim();

    // 2. Strip markdown code fences (```json ... ``` or ``` ...)
    clean = clean.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();

    // 3. Extract JSON object substring between first '{' and last '}'
    const startIdx = clean.indexOf('{');
    const endIdx = clean.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      clean = clean.substring(startIdx, endIdx + 1);
    }

    // 4. Remove trailing commas before closing braces/brackets
    clean = clean.replace(/,\s*([\}\]])/g, '$1');

    return JSON.parse(clean);
  } catch (e2) {
    logger.warn(`[Groq AI Safe JSON Parse] Failed to parse response text: ${rawText.slice(0, 150)}... Error: ${e2.message}`);
    return null;
  }
};

/**
 * Normalize and validate Groq AI output against allowed enums and schema
 */
const normalizeTriageOutput = (parsed, defaultModel = DEFAULT_MODEL) => {
  const validLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  const rawUrgency = String(parsed.urgencyLevel || parsed.urgency || '').toUpperCase();
  const rawRisk = String(parsed.riskLevel || parsed.risk || '').toUpperCase();
  const rawPriority = String(parsed.priorityRecommendation || parsed.priority || '').toUpperCase();

  const urgencyLevel = validLevels.includes(rawUrgency) ? rawUrgency : 'MEDIUM';
  const riskLevel = validLevels.includes(rawRisk) ? rawRisk : 'MEDIUM';
  const priorityRecommendation = validLevels.includes(rawPriority) ? rawPriority : 'MEDIUM';

  const riskFactors = Array.isArray(parsed.riskFactors)
    ? parsed.riskFactors.map(String).filter(Boolean)
    : typeof parsed.riskFactors === 'string' && parsed.riskFactors.trim()
    ? [parsed.riskFactors.trim()]
    : ['Standard clinical observation'];

  const suggestedVitalsToCheck = Array.isArray(parsed.suggestedVitalsToCheck)
    ? parsed.suggestedVitalsToCheck.map(String).filter(Boolean)
    : ['Blood Pressure', 'Pulse', 'SpO2', 'Temperature'];

  const reason = typeof parsed.reason === 'string' && parsed.reason.trim()
    ? parsed.reason.trim()
    : 'AI clinical decision support evaluation completed based on patient intake data.';

  return {
    urgencyLevel,
    riskLevel,
    riskFactors,
    priorityRecommendation,
    reason,
    suggestedVitalsToCheck,
    modelName: defaultModel,
    isAiFallback: false,
    rawResponse: parsed,
  };
};

/**
 * Fallback heuristic triage analyzer when Groq API is unavailable, offline, or errored.
 * Provides safe operational continuity without fabricating diagnostic conclusions.
 */
const generateFallbackTriage = (patientData, reasonMessage = 'Groq API unavailable — heuristic triage active', errorDetails = null) => {
  const {
    symptoms = [],
    reportedSeverity = 'MEDIUM',
    staffSeverity,
    isAccident = false,
    accidentSeverity = 'NONE',
    age = 30,
    possibleCondition = '',
  } = patientData;

  const effectiveSeverity = staffSeverity || reportedSeverity;
  const criticalKeywords = ['chest pain', 'unconscious', 'breathing', 'stroke', 'heavy bleeding', 'cardiac', 'seizure', 'trauma'];
  const symptomsStr = Array.isArray(symptoms) ? symptoms.join(' ').toLowerCase() : String(symptoms).toLowerCase();

  const hasCriticalKeyword = criticalKeywords.some((kw) => symptomsStr.includes(kw));

  let urgencyLevel = 'MEDIUM';
  let riskLevel = 'MEDIUM';
  let priorityRecommendation = 'MEDIUM';
  const riskFactors = [];

  if (isAccident) {
    riskFactors.push(`Trauma/Accident case with ${accidentSeverity} severity`);
    if (accidentSeverity === 'HIGH') {
      urgencyLevel = 'CRITICAL';
      riskLevel = 'CRITICAL';
      priorityRecommendation = 'CRITICAL';
    } else if (accidentSeverity === 'MEDIUM') {
      urgencyLevel = 'HIGH';
      riskLevel = 'HIGH';
      priorityRecommendation = 'HIGH';
    }
  }

  if (effectiveSeverity === 'CRITICAL' || hasCriticalKeyword) {
    urgencyLevel = 'CRITICAL';
    riskLevel = 'CRITICAL';
    priorityRecommendation = 'CRITICAL';
    riskFactors.push('High-risk acute clinical symptoms detected during intake triage');
  } else if (effectiveSeverity === 'HIGH') {
    if (urgencyLevel !== 'CRITICAL') {
      urgencyLevel = 'HIGH';
      riskLevel = 'HIGH';
      priorityRecommendation = 'HIGH';
    }
    riskFactors.push('Elevated symptom severity reported during intake');
  }

  if (age < 2 || age > 75) {
    riskFactors.push(`Age vulnerability factor (Patient age: ${age})`);
  }

  return {
    urgencyLevel,
    riskLevel,
    riskFactors: riskFactors.length > 0 ? riskFactors : ['Standard non-acute clinical presentation'],
    priorityRecommendation,
    reason: `[Clinical Heuristic Fallback] ${reasonMessage}. Calculated from intake parameters (Severity: ${effectiveSeverity}, Accident: ${isAccident ? accidentSeverity : 'No'}, Age: ${age}).`,
    suggestedVitalsToCheck: ['Blood Pressure', 'Heart Rate', 'SpO2', 'Temperature'],
    modelName: 'heuristic-rule-engine-v1.0 (fallback)',
    isAiFallback: true,
    fallbackReason: reasonMessage,
    errorMessage: errorDetails || null,
  };
};

/**
 * Analyze patient triage data using Groq Llama AI with safe response validation
 * @param {Object} patientData - Patient and appointment details
 * @returns {Promise<Object>} Structured triage analysis
 */
const analyzePatientTriage = async (patientData) => {
  const {
    patientName,
    age,
    gender,
    department,
    symptoms = [],
    symptomsDescription = '',
    possibleCondition = '',
    reportedSeverity = 'MEDIUM',
    staffSeverity,
    isAccident = false,
    accidentSeverity = 'NONE',
    medicalImageType = 'NONE',
  } = patientData;

  // If Groq is not configured, gracefully use heuristic fallback
  if (!isGroqConfigured()) {
    logger.warn('[Groq AI] GROQ_API_KEY is missing or invalid in environment. Engaging fallback clinical triage heuristic.');
    return generateFallbackTriage(patientData, 'GROQ_API_KEY not configured', 'Environment variable missing or set to placeholder');
  }

  try {
    const groq = getGroqClient();
    if (!groq) {
      return generateFallbackTriage(patientData, 'Groq client initialization failed', 'Unable to create Groq SDK instance');
    }

    const systemPrompt = `You are a clinical decision-support triage AI assistant embedded in a hospital emergency/outpatient smart queue system.
YOUR PURPOSE: Analyze preliminary intake details and assign administrative priority triage levels (LOW, MEDIUM, HIGH, CRITICAL) to help staff and doctors order waiting patients safely.

IMPORTANT MEDICAL & SAFETY CONSTRAINTS:
1. YOU MUST NEVER PROVIDE A FINAL DIAGNOSIS OR DEFINITIVE TREATMENT PLAN.
2. Output purely structured administrative triage recommendations for priority and risk.
3. Be especially alert to red-flag symptoms (e.g., chest pain, respiratory distress, acute trauma, altered mental state, severe pain, pediatric/geriatric vulnerability).
4. Always respond with ONLY valid, raw JSON matching the required schema. No markdown backticks, no markdown formatting outside JSON.

REQUIRED JSON FORMAT:
{
  "urgencyLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "riskFactors": ["list of key clinical risk observations"],
  "priorityRecommendation": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "reason": "Clear, objective 2-3 sentence clinical triage rationale for staff/doctor review.",
  "suggestedVitalsToCheck": ["SpO2", "Blood Pressure", "Heart Rate", "Temperature"]
}`;

    const userPrompt = `Please triage the following patient intake record:
- Patient Demographics: Age ${age}, Gender ${gender}
- Department: ${department}
- Reported Symptoms: ${Array.isArray(symptoms) ? symptoms.join(', ') : symptoms}
- Additional Description: ${symptomsDescription || 'None provided'}
- Possible/Suspected Condition: ${possibleCondition || 'Unspecified'}
- Patient Reported Severity: ${reportedSeverity}
- Staff Verified Severity: ${staffSeverity || 'Pending staff review'}
- Accident / Trauma Case: ${isAccident ? `YES (Severity: ${accidentSeverity})` : 'NO'}
- Associated Medical Imaging: ${medicalImageType}

Provide your structured JSON triage decision support:`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: DEFAULT_MODEL,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('Empty response received from Groq API');
    }

    const parsed = safeJsonParse(responseContent);
    if (!parsed) {
      logger.warn('[Groq AI] LLM output could not be parsed safely into JSON format. Engaging fallback rule engine.');
      return generateFallbackTriage(patientData, 'Malformed LLM JSON response', `Raw output: ${responseContent.slice(0, 100)}`);
    }

    return normalizeTriageOutput(parsed, DEFAULT_MODEL);
  } catch (error) {
    const errorMsg = error.message || 'Unknown Groq API error';
    logger.error(`[Groq AI Error] Failed to generate AI analysis: ${errorMsg}. Engaging fallback rule engine.`);

    let fallbackReason = 'Groq API call error';
    if (error.status === 401 || errorMsg.includes('401') || errorMsg.includes('api key')) {
      fallbackReason = 'Groq API Authentication Error (Invalid Key)';
    } else if (error.status === 429 || errorMsg.includes('429') || errorMsg.includes('rate limit')) {
      fallbackReason = 'Groq API Rate Limit Exceeded';
    } else if (errorMsg.includes('timeout') || error.code === 'ETIMEDOUT') {
      fallbackReason = 'Groq API Request Timeout';
    }

    return generateFallbackTriage(patientData, fallbackReason, errorMsg);
  }
};

module.exports = {
  safeJsonParse,
  normalizeTriageOutput,
  analyzePatientTriage,
  generateFallbackTriage,
};
