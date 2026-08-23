const { getGroqClient, isGroqConfigured, DEFAULT_MODEL } = require('../config/groq');
const logger = require('../utils/logger');

/**
 * Fallback heuristic triage analyzer when Groq API is unavailable or offline
 */
const generateFallbackTriage = (patientData) => {
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
  const criticalKeywords = ['chest pain', 'unconscious', 'breathing', 'stroke', 'heavy bleeding', 'cardiac', 'seizure'];
  const symptomsStr = Array.isArray(symptoms) ? symptoms.join(' ').toLowerCase() : String(symptoms).toLowerCase();

  let hasCriticalKeyword = criticalKeywords.some((kw) => symptomsStr.includes(kw));

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
    riskFactors.push('High-risk acute clinical symptoms detected during triage');
  } else if (effectiveSeverity === 'HIGH') {
    if (urgencyLevel !== 'CRITICAL') {
      urgencyLevel = 'HIGH';
      riskLevel = 'HIGH';
      priorityRecommendation = 'HIGH';
    }
    riskFactors.push('Elevated symptom severity reported');
  }

  if (age < 2 || age > 75) {
    riskFactors.push(`Age vulnerability factor (Patient age: ${age})`);
  }

  return {
    urgencyLevel,
    riskLevel,
    riskFactors: riskFactors.length > 0 ? riskFactors : ['Standard non-acute presentation'],
    priorityRecommendation,
    reason: `Automated triage assessment based on clinical parameters (Severity: ${effectiveSeverity}, Accident: ${isAccident ? accidentSeverity : 'No'}, Age: ${age}).`,
    suggestedVitalsToCheck: ['Blood Pressure', 'Heart Rate', 'SpO2', 'Temperature'],
    modelName: 'heuristic-rule-engine-v1.0 (fallback)',
    isAiFallback: true,
  };
};

/**
 * Analyze patient triage data using Groq Llama AI
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
    logger.warn('[Groq AI] GROQ_API_KEY is not configured in .env. Using fallback clinical triage heuristic.');
    return generateFallbackTriage(patientData);
  }

  try {
    const groq = getGroqClient();

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

    const parsed = JSON.parse(responseContent);

    // Normalize and validate output
    const validLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const urgencyLevel = validLevels.includes(parsed.urgencyLevel?.toUpperCase()) ? parsed.urgencyLevel.toUpperCase() : 'MEDIUM';
    const riskLevel = validLevels.includes(parsed.riskLevel?.toUpperCase()) ? parsed.riskLevel.toUpperCase() : 'MEDIUM';
    const priorityRecommendation = validLevels.includes(parsed.priorityRecommendation?.toUpperCase())
      ? parsed.priorityRecommendation.toUpperCase()
      : 'MEDIUM';

    return {
      urgencyLevel,
      riskLevel,
      riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
      priorityRecommendation,
      reason: parsed.reason || 'AI clinical triage completed.',
      suggestedVitalsToCheck: Array.isArray(parsed.suggestedVitalsToCheck) ? parsed.suggestedVitalsToCheck : ['Blood Pressure', 'Pulse', 'SpO2'],
      modelName: DEFAULT_MODEL,
      isAiFallback: false,
      rawResponse: parsed,
    };
  } catch (error) {
    logger.error(`[Groq AI Error] Failed to generate AI analysis: ${error.message}. Engaging fallback rule engine.`);
    return generateFallbackTriage(patientData);
  }
};

module.exports = {
  analyzePatientTriage,
  generateFallbackTriage,
};
