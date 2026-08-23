const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    durationMinutes: {
      type: Number,
      default: 0,
    },
    vitals: {
      bloodPressure: { type: String, trim: true },
      heartRate: { type: Number },
      temperature: { type: Number }, // Celsius or Fahrenheit
      oxygenSaturation: { type: Number }, // SpO2 %
      respiratoryRate: { type: Number },
    },
    clinicalNotes: {
      type: String,
      trim: true,
    },
    diagnosisNotes: {
      type: String,
      trim: true,
    },
    prescriptions: [
      {
        medicationName: { type: String, required: true },
        dosage: { type: String, required: true },
        frequency: { type: String, required: true },
        durationDays: { type: Number, default: 5 },
        instructions: { type: String },
      },
    ],
    recommendedFollowUp: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'IN_PROGRESS',
    },
  },
  {
    timestamps: true,
  }
);

const Consultation = mongoose.model('Consultation', consultationSchema);
module.exports = Consultation;
