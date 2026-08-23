/**
 * Priority Engine Configuration
 * Defines modular and customizable weights for dynamic smart queue prioritization.
 * Note: Priority scores are administrative triage scores, NOT medical diagnoses.
 */

module.exports = {
  // Base clinical severity score (set by staff or initial reporting)
  severityScores: {
    LOW: 10,
    MEDIUM: 25,
    HIGH: 50,
    CRITICAL: 80,
  },

  // Accident case severity boost
  accidentScores: {
    NONE: 0,
    EASY: 10,
    MEDIUM: 25,
    HIGH: 45,
  },

  // Groq AI Urgency Level weights
  aiUrgencyScores: {
    LOW: 5,
    MEDIUM: 15,
    HIGH: 30,
    CRITICAL: 45,
  },

  // Groq AI Risk Level weights
  aiRiskScores: {
    LOW: 5,
    MEDIUM: 15,
    HIGH: 25,
    CRITICAL: 40,
  },

  // Medical image screening score scaling (0.0 - 1.0 mapped to max points)
  maxImageScreeningPoints: 30,

  // Aging factor: extra priority points added per aging interval to prevent starvation
  agingIntervalMinutes: parseInt(process.env.AGING_BOOST_MINUTES, 10) || 10,
  agingPointsPerInterval: parseFloat(process.env.AGING_BOOST_POINTS, 10) || 2.0,
  maxAgingPoints: 30, // Cap aging boost so non-critical patients don't jump ahead of true emergencies indefinitely

  // Priority boost for returning pending patients (held for tests/labs/stabilization)
  pendingReturnBoost: parseInt(process.env.PENDING_RETURN_PRIORITY_BOOST, 10) || 35,

  // Priority Level Classification Thresholds
  thresholds: {
    CRITICAL: 110,
    HIGH: 70,
    MEDIUM: 35,
    LOW: 0,
  },

  // Department-specific estimated consultation times in minutes
  departmentConsultationMinutes: {
    'General Medicine': 12,
    'Emergency': 8,
    'Cardiology': 20,
    'Orthopedics': 15,
    'Pediatrics': 15,
    'Neurology': 25,
    'Dermatology': 10,
    'ENT': 12,
    'Other': 15,
  },

  defaultAverageConsultationMinutes: parseInt(process.env.AVG_CONSULTATION_MINUTES, 10) || 15,
};
