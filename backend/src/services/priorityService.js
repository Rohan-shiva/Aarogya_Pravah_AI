const config = require('../config/priorityConfig');

/**
 * Priority Scoring Engine
 * Combines clinical triage, accident severity, Groq AI decision support,
 * medical image screening results, wait-time aging, and pending return status.
 *
 * NOTE: The priority score is strictly an administrative and operational triage score,
 * and is NOT a medical diagnosis.
 *
 * @param {Object} data - Patient and appointment data
 * @returns {Object} Priority score, level, breakdown, and explanatory factors
 */
const calculatePriorityScore = (data = {}) => {
  const {
    staffSeverity,
    reportedSeverity = 'MEDIUM',
    isAccident = false,
    accidentSeverity = 'NONE',
    aiAnalysis = null,
    imageAnalysis = null,
    checkInTime = null,
    isPending = false,
    wasPending = false,
  } = data;

  const factorsUsed = [];
  let clinicalSeverityPoints = 0;
  let accidentPoints = 0;
  let aiUrgencyPoints = 0;
  let aiRiskPoints = 0;
  let imageScreeningPoints = 0;
  let agingPoints = 0;
  let pendingReturnBoostPoints = 0;

  // 1. Clinical Severity Score (Staff verified takes precedence over patient reported)
  const effectiveSeverity = (staffSeverity || reportedSeverity || 'MEDIUM').toUpperCase();
  clinicalSeverityPoints = config.severityScores[effectiveSeverity] || config.severityScores.MEDIUM;
  
  if (staffSeverity) {
    factorsUsed.push(`Staff-verified clinical severity: ${staffSeverity} (+${clinicalSeverityPoints} pts)`);
  } else {
    factorsUsed.push(`Patient-reported initial severity: ${reportedSeverity} (+${clinicalSeverityPoints} pts)`);
  }

  // 2. Accident Case & Severity Boost
  if (isAccident) {
    const accSev = (accidentSeverity || 'MEDIUM').toUpperCase();
    accidentPoints = config.accidentScores[accSev] || config.accidentScores.MEDIUM;
    factorsUsed.push(`Accident trauma case (${accSev}) (+${accidentPoints} pts)`);
  }

  // 3. Groq AI Urgency & Risk Signals
  if (aiAnalysis) {
    const aiUrgency = (aiAnalysis.urgencyLevel || 'MEDIUM').toUpperCase();
    const aiRisk = (aiAnalysis.riskLevel || 'MEDIUM').toUpperCase();

    aiUrgencyPoints = config.aiUrgencyScores[aiUrgency] || 0;
    aiRiskPoints = config.aiRiskScores[aiRisk] || 0;

    factorsUsed.push(`AI urgency assessment: ${aiUrgency} (+${aiUrgencyPoints} pts)`);
    factorsUsed.push(`AI clinical risk factor: ${aiRisk} (+${aiRiskPoints} pts)`);
  }

  // 4. Medical Image Screening Signal (if available from PyTorch screening service)
  if (imageAnalysis && typeof imageAnalysis.imageScore === 'number') {
    // imageScore is normalized between 0.0 and 1.0
    const normalizedScore = Math.max(0, Math.min(1, imageAnalysis.imageScore));
    imageScreeningPoints = Math.round(normalizedScore * config.maxImageScreeningPoints);

    if (imageAnalysis.screeningStatus === 'CRITICAL_ABNORMALITY_DETECTED') {
      imageScreeningPoints = Math.max(imageScreeningPoints, 25);
    }

    factorsUsed.push(
      `Medical image screening score (${(normalizedScore * 100).toFixed(0)}%, Status: ${
        imageAnalysis.screeningStatus || 'Analyzed'
      }) (+${imageScreeningPoints} pts)`
    );
  }

  // 5. Aging Factor (Time spent waiting in queue prevents starvation)
  if (checkInTime && !isPending) {
    const checkInDate = new Date(checkInTime);
    const now = new Date();
    const minutesWaiting = Math.max(0, Math.floor((now - checkInDate) / (1000 * 60)));

    const intervals = Math.floor(minutesWaiting / config.agingIntervalMinutes);
    agingPoints = Math.min(config.maxAgingPoints, intervals * config.agingPointsPerInterval);

    if (agingPoints > 0) {
      factorsUsed.push(
        `Queue wait time adjustment (${minutesWaiting} mins elapsed) (+${agingPoints} pts)`
      );
    }
  }

  // 6. Pending Patient Return Boost (patients returning from labs/X-ray/hold)
  if (wasPending || data.isReturningFromPending) {
    pendingReturnBoostPoints = config.pendingReturnBoost;
    factorsUsed.push(
      `Returning pending patient priority restoration (+${pendingReturnBoostPoints} pts)`
    );
  }

  // Calculate Total Priority Score
  const totalScore = Math.round(
    clinicalSeverityPoints +
      accidentPoints +
      aiUrgencyPoints +
      aiRiskPoints +
      imageScreeningPoints +
      agingPoints +
      pendingReturnBoostPoints
  );

  // Classify Priority Level based on thresholds
  let priorityLevel = 'LOW';
  if (totalScore >= config.thresholds.CRITICAL || effectiveSeverity === 'CRITICAL') {
    priorityLevel = 'CRITICAL';
  } else if (totalScore >= config.thresholds.HIGH) {
    priorityLevel = 'HIGH';
  } else if (totalScore >= config.thresholds.MEDIUM) {
    priorityLevel = 'MEDIUM';
  } else {
    priorityLevel = 'LOW';
  }

  return {
    priorityScore: totalScore,
    priorityLevel,
    scoreBreakdown: {
      clinicalSeverityPoints,
      accidentPoints,
      aiUrgencyPoints,
      aiRiskPoints,
      imageScreeningPoints,
      agingPoints,
      pendingReturnBoostPoints,
      totalScore,
      factorsUsed,
    },
    factorsUsed,
    calculatedAt: new Date(),
    disclaimer:
      'PRIORITY CLASSIFICATION DISCLAIMER: This priority score is an operational triage calculation and does not constitute a clinical diagnosis or treatment recommendation.',
  };
};

module.exports = {
  calculatePriorityScore,
};
