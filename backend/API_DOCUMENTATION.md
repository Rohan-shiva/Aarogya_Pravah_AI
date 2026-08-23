# Aarogya Pravah AI - Backend API & Real-Time Integration Documentation

AI-Powered Smart Patient Queue Management System REST API and Socket.IO real-time event specification for frontend integration (React + Vite + Tailwind CSS).

---

## Base Configuration

- **Base URL**: `http://localhost:5000`
- **Socket.IO URL**: `ws://localhost:5000`
- **Content-Type**: `application/json` (except image upload endpoints which use `multipart/form-data`)

---

## Standard Response Structure

All REST API responses follow a consistent JSON envelope:

### Success Response
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Description of action result",
  "data": { ... },
  "meta": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error description",
  "errors": [ ... ]
}
```

---

## Authentication & Authorization

Protected endpoints require a standard Bearer token in the `Authorization` header:

```http
Authorization: Bearer <your_jwt_token>
```

### User Roles
- `STAFF`: Hospital staff / Compounders (intake verification, severity overrides)
- `DOCTOR`: Medical doctors (consultation, hold/resume, diagnosis, prescriptions)
- *Patients do not require login; they access their status using their unique `tokenNumber`.*

---

## 1. Authentication APIs (`/api/auth`)

### 1.1 Register User (Staff / Doctor)
- **Endpoint**: `POST /api/auth/register`
- **Auth Required**: No
- **Request Body**:
```json
{
  "name": "Nurse Priya Sharma",
  "email": "priya@hospital.com",
  "password": "password123",
  "role": "STAFF",
  "department": "Emergency & Triage",
  "phoneNumber": "+91-9876543210"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "65e23a4b...",
      "name": "Nurse Priya Sharma",
      "email": "priya@hospital.com",
      "role": "STAFF",
      "department": "Emergency & Triage"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 1.2 User Login
- **Endpoint**: `POST /api/auth/login`
- **Auth Required**: No
- **Request Body**:
```json
{
  "email": "staff@aarogyapravah.ai",
  "password": "password123"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "65e23a4b...",
      "name": "Nurse Priya Sharma",
      "email": "staff@aarogyapravah.ai",
      "role": "STAFF",
      "department": "Emergency & Triage"
    },
    "token": "eyJhbGciOiJIUzI1Ni..."
  }
}
```

### 1.3 Get Current Profile
- **Endpoint**: `GET /api/auth/me`
- **Auth Required**: Yes (Staff or Doctor)
- **Response (200 OK)**: Returns the current user profile.

### 1.4 List Active Doctors
- **Endpoint**: `GET /api/auth/doctors?department=Cardiology`
- **Auth Required**: Yes
- **Response (200 OK)**: Returns active doctors list for assignment.

---

## 2. Patient Appointment & Token APIs (`/api/patients`)

### 2.1 Book New Appointment
- **Endpoint**: `POST /api/patients/appointments`
- **Auth Required**: No
- **Content-Type**: `multipart/form-data` (if uploading image) or `application/json`
- **Request Fields**:
  - `name` *(string, required)*: Patient full name
  - `age` *(number, required)*: Age (0-130)
  - `gender` *(string, required)*: `Male` | `Female` | `Other`
  - `phoneNumber` *(string, required)*: Patient phone number
  - `email` *(string, optional)*: Patient email
  - `department` *(string, required)*: E.g., `Emergency`, `General Medicine`, `Cardiology`
  - `possibleCondition` *(string, optional)*: Self-reported condition
  - `symptoms` *(array or comma-separated string, required)*: E.g., `["Chest pain", "Shortness of breath"]`
  - `symptomsDescription` *(string, optional)*: Additional details
  - `severityLevel` *(string, optional)*: `LOW` | `MEDIUM` | `HIGH` | `CRITICAL` (Default: `MEDIUM`)
  - `isAccident` *(boolean, optional)*: `true` | `false`
  - `accidentSeverity` *(string, optional)*: `NONE` | `EASY` | `MEDIUM` | `HIGH`
  - `medicalImage` *(file, optional)*: Image file (JPG/PNG/WebP/DICOM)
- **Response (201 Created)**:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Appointment successfully booked and queued for staff verification",
  "data": {
    "tokenNumber": "EMG-20260822-4819",
    "appointmentId": "65e23c8f...",
    "patientName": "Aarav Sharma",
    "department": "Emergency",
    "appointmentTime": "2026-08-22T02:30:00.000Z",
    "estimatedWaitMinutes": 15,
    "status": "PENDING_STAFF_VERIFICATION",
    "message": "Your appointment has been registered. Please wait for hospital staff to verify your check-in."
  }
}
```

### 2.2 Privacy-Safe Patient Token Tracking
- **Endpoint**: `GET /api/patients/token/:tokenNumber`
- **Auth Required**: No (Public token lookup)
- **Example**: `GET /api/patients/token/EMG-20260822-4819`
- **Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Patient queue status retrieved successfully",
  "data": {
    "tokenNumber": "EMG-20260822-4819",
    "department": "Emergency",
    "appointmentDate": "2026-08-22T02:30:00.000Z",
    "status": "WAITING",
    "queuePosition": 2,
    "estimatedWaitMinutes": 16,
    "priorityLevel": "CRITICAL",
    "isPending": false,
    "pendingReason": null,
    "assignedDoctor": null,
    "departmentQueueStats": {
      "totalWaiting": 4,
      "currentServingToken": "EMG-20260822-1044"
    },
    "lastUpdated": "2026-08-22T02:32:00.000Z"
  }
}
```

---

## 3. Staff Dashboard APIs (`/api/staff`)

*All Staff routes require `Authorization: Bearer <STAFF_JWT>` header.*

### 3.1 Get Pending Verifications
- **Endpoint**: `GET /api/staff/pending-verifications?department=Emergency`
- **Response (200 OK)**: Returns list of newly booked patients awaiting verification.

### 3.2 Get Patient Complete Details
- **Endpoint**: `GET /api/staff/patient/:id`
- **Response (200 OK)**: Full clinical and appointment record with AI analysis and image screening details.

### 3.3 Verify & Place Patient in Priority Queue
- **Endpoint**: `POST /api/staff/verify/:id`
- **Description**: Verifies patient details, triggers Groq AI triage, calculates dynamic priority score, creates queue entry (`WAITING`), and emits real-time updates.
- **Request Body**:
```json
{
  "staffSeverity": "HIGH",
  "verificationNotes": "Confirmed high fever (103F) and acute respiratory discomfort.",
  "isAccident": false,
  "department": "General Medicine"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Patient successfully verified and placed in dynamic priority queue",
  "data": {
    "appointment": {
      "_id": "65e23c8f...",
      "tokenNumber": "TKN-20260822-8392",
      "status": "VERIFIED",
      "staffSeverity": "HIGH"
    },
    "aiAnalysis": {
      "urgencyLevel": "HIGH",
      "riskLevel": "HIGH",
      "riskFactors": ["Acute respiratory symptom pattern"],
      "priorityRecommendation": "HIGH",
      "reason": "Elevated body temperature and respiratory involvement warrants expedited review."
    },
    "queueEntry": {
      "_id": "65e23e11...",
      "priorityScore": 95,
      "priorityLevel": "HIGH",
      "queuePosition": 1,
      "estimatedWaitMinutes": 0,
      "status": "WAITING"
    },
    "priorityResult": {
      "priorityScore": 95,
      "priorityLevel": "HIGH",
      "factorsUsed": [
        "Staff-verified clinical severity: HIGH (+50 pts)",
        "AI urgency assessment: HIGH (+30 pts)",
        "AI clinical risk factor: HIGH (+25 pts)"
      ]
    }
  }
}
```

### 3.4 Request Clarification (Flag Patient)
- **Endpoint**: `POST /api/staff/request-clarification/:id`
- **Request Body**:
```json
{
  "clarificationReason": "Discrepancy in reported symptoms vs vitals; please check ID at counter."
}
```

### 3.5 Reject Appointment
- **Endpoint**: `POST /api/staff/reject/:id`
- **Request Body**:
```json
{
  "rejectionReason": "Duplicate booking or invalid contact information."
}
```

### 3.6 Override Severity
- **Endpoint**: `POST /api/staff/update-severity/:id`
- **Request Body**:
```json
{
  "severity": "CRITICAL"
}
```

---

## 4. Doctor Dashboard APIs (`/api/doctor`)

*All Doctor routes require `Authorization: Bearer <DOCTOR_JWT>` header.*

### 4.1 Get Prioritized Waiting Queue
- **Endpoint**: `GET /api/doctor/queue?department=Emergency`
- **Response (200 OK)**: Returns prioritized queue with score breakdowns, AI triage reasoning, and image screening signals.

### 4.2 Start Patient Consultation
- **Endpoint**: `POST /api/doctor/consultation/start`
- **Request Body**:
```json
{
  "queueEntryId": "65e23e11..."
}
```
- **Response (200 OK)**: Updates status to `IN_CONSULTATION`, notifies patient via Socket.IO.

### 4.3 Complete Consultation
- **Endpoint**: `POST /api/doctor/consultation/complete`
- **Request Body**:
```json
{
  "queueEntryId": "65e23e11...",
  "clinicalNotes": "Chest auscultation clear. Improved post-nebulization.",
  "diagnosisNotes": "Acute Bronchitis",
  "vitals": {
    "bloodPressure": "120/80",
    "heartRate": 76,
    "temperature": 98.6,
    "oxygenSaturation": 99
  },
  "prescriptions": [
    {
      "medicationName": "Amoxicillin 500mg",
      "dosage": "1 capsule",
      "frequency": "Three times daily",
      "durationDays": 5,
      "instructions": "Take after meals"
    }
  ],
  "recommendedFollowUp": "Review in 5 days if symptoms persist."
}
```

### 4.4 Place Patient on Hold (Pending Queue)
- **Endpoint**: `POST /api/doctor/queue/hold`
- **Request Body**:
```json
{
  "queueEntryId": "65e23e11...",
  "reason": "Sent to Radiology for urgent Chest X-Ray",
  "category": "XRAY_SCAN",
  "notes": "Review immediately when scan is completed."
}
```

### 4.5 Resume Patient to Active Queue (With Priority Boost)
- **Endpoint**: `POST /api/doctor/queue/resume`
- **Request Body**:
```json
{
  "queueEntryId": "65e23e11..."
}
```
- **Response (200 OK)**: Resumes patient into active queue with high-priority restoration boost (+35 pts).

### 4.6 View Pending Patients on Hold
- **Endpoint**: `GET /api/doctor/pending-queue?department=General Medicine`

---

## 5. Smart Queue APIs (`/api/queue`)

### 5.1 Get Active Queue
- **Endpoint**: `GET /api/queue?department=Emergency&status=WAITING&priorityLevel=HIGH`
- **Auth Required**: No

### 5.2 Get Queue Statistics & Breakdown
- **Endpoint**: `GET /api/queue/stats?department=Emergency`
- **Response (200 OK)**:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "totalWaiting": 8,
    "totalInConsultation": 2,
    "totalPending": 3,
    "totalCompleted": 15,
    "priorityBreakdown": {
      "CRITICAL": 2,
      "HIGH": 3,
      "MEDIUM": 2,
      "LOW": 1
    }
  }
}
```

### 5.3 Force Dynamic Queue Recalculation
- **Endpoint**: `POST /api/queue/recalculate`
- **Auth Required**: Yes (Staff/Doctor)
- **Request Body**:
```json
{
  "department": "Emergency"
}
```

---

## 6. AI & PyTorch Screening Webhook APIs (`/api/ai`)

### 6.1 PyTorch Medical Image Screening Ingestion Webhook
- **Endpoint**: `POST /api/ai/image-analysis-result`
- **Description**: Dedicated integration endpoint for external Python + PyTorch deep learning models (e.g. ResNet, DenseNet) to post preliminary screening findings.
- **Request Body**:
```json
{
  "tokenNumber": "TKN-20260822-8392",
  "screeningStatus": "MODERATE_FINDINGS",
  "imageScore": 0.78,
  "possibleFindings": [
    "Right lower lobe consolidation",
    "Pleural thickening"
  ],
  "modelVersion": "pytorch-chest-xray-v2.1",
  "confidenceSignal": 0.91,
  "findingsDetails": {
    "opacityLocation": "Right lower zone",
    "cardiothoracicRatio": 0.52
  }
}
```
- **Response (200 OK)**: Ingests screening record, updates `Appointment.medicalImage.status = 'ANALYZED'`, automatically recalculates priority score, updates queue position, and emits real-time event.

### 6.2 Manual Groq AI Triage Trigger
- **Endpoint**: `POST /api/ai/analyze-triage/:appointmentId`
- **Auth Required**: Yes (Staff/Doctor)

---

## 7. Cloudinary Medical Image Storage & PyTorch Integration Architecture

```text
React Frontend
      ↓ (multipart/form-data via multer.memoryStorage)
Node.js Express Backend
      ↓ (Stream Buffer via cloudinary.uploader.upload_stream)
Cloudinary Persistent Medical Storage (Folder: aarogya-pravah-ai/xrays)
      ↓ (Generates anonymous public ID: xray_anon_...)
Node.js saves asset metadata to MongoDB (Appointment.medicalImage)
      ↓ (Async dispatch with secure URL, NO Cloudinary credentials shared)
Python + PyTorch ML Service (POST /api/v1/screen-xray or Webhook)
      ↓ (Returns preliminary screening signal score & findings)
Node.js Priority Engine recalculates queue priority
      ↓ (Socket.IO priority_updated / queue_updated)
Doctor Dashboard updates in real time
```

### Server Configuration Variables
```env
# Cloudinary (Server-Side Only - Never exposed to frontend)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=aarogya-pravah-ai/xrays

# Python ML Screening Service
PYTORCH_SERVICE_URL=http://localhost:8000
PYTORCH_SERVICE_TIMEOUT=10000
```

---

## 8. Real-Time Socket.IO Integration Guide

### 8.1 Connection Setup (React Client Example)

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling'],
});

// For Staff Dashboard:
socket.emit('join_staff');

// For Doctor Dashboard:
socket.emit('join_doctor', { doctorId: currentDoctorId });

// For Department Screen:
socket.emit('join_department', { department: 'Emergency' });

// For Patient Waiting Screen:
socket.emit('join_patient', { tokenNumber: 'EMG-20260822-4819' });
```

### 8.2 Events Emitted by Server

| Event Name | Sent To | Description | Payload Preview |
|---|---|---|---|
| `new_patient` | `staff` room | Patient booked new appointment | `{ appointment, timestamp }` |
| `patient_verified` | `staff`, `doctor`, `department:*` | Staff verified & queued patient | `{ tokenNumber, department, queuePosition, priorityLevel }` |
| `priority_updated` | `staff`, `doctor`, `department:*` | Priority score recalculated | `{ tokenNumber, department, priorityData }` |
| `queue_updated` | `staff`, `doctor`, `department:*` | Full sorted queue refreshed | `{ department, count, queue: [...] }` |
| `patient_called` | `patient:*`, `staff`, `doctor` | Doctor starts consultation | `{ tokenNumber, doctorName, roomNumber, message }` |
| `patient_on_hold` | `patient:*`, `staff`, `doctor` | Patient placed in pending status | `{ tokenNumber, reason, category }` |
| `patient_completed` | `patient:*`, `staff`, `doctor` | Consultation completed | `{ tokenNumber, department }` |
| `patient_status_updated` | `patient:*` private room | Targeted patient status change | `{ tokenNumber, status, queuePosition, estimatedWaitMinutes, message }` |
