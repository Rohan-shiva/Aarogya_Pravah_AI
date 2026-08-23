# Aarogya Pravah AI — Backend

Production-ready, modular Node.js + Express + MongoDB backend with Groq AI clinical triage, PyTorch image screening integration, multi-factor dynamic priority queueing, role-based auth (Staff & Doctor), token-based patient tracking, and Socket.IO real-time event broadcasting.

---

## 🌟 Key Features

1. **Groq AI Clinical Triage**: Decision-support analysis (risk & urgency scoring) using Groq Llama-3 with safety guardrails (non-diagnostic disclaimer) and offline heuristic fallback.
2. **PyTorch Medical Image Integration**: Dedicated screening signal ingestion endpoint for external Python + PyTorch deep learning models.
3. **Multi-Factor Priority Scoring Engine**: Weighted algorithm combining clinical severity, trauma/accident factor, AI risk signals, medical image findings, queue aging adjustments (starvation prevention), and pending return boosts.
4. **Smart Dynamic Queue**: Live FIFO-tiebroken priority re-sorting, automated estimated wait time calculation, and doctor consultation lifecycle.
5. **Pending Queue Policy**: Configurable hold and resume workflows for patients awaiting lab tests, scans, or stabilization with priority restoration boosts.
6. **Role-Based Access Control**: Secure JWT authentication and bcrypt password hashing for Hospital Staff and Doctors.
7. **Privacy-Preserving Patient Tracking**: Public token lookup API (`/api/patients/token/:tokenNumber`) that exposes only necessary queue metrics while protecting confidential clinical records.
8. **Real-Time WebSockets**: Socket.IO targeted room messaging for staff dashboard, doctor screens, department displays, and private patient tokens.
9. **HIPAA-Compliant Audit Logging**: Complete audit trail of all staff verifications, triage overrides, and doctor consultation actions.

---

## 📂 Project Architecture

```
Aarogya Pravah AI/backend/
├── src/
│   ├── config/
│   │   ├── db.js                 # MongoDB connection logic
│   │   ├── groq.js               # Groq SDK client configuration
│   │   └── priorityConfig.js     # Configurable weights for priority engine
│   ├── controllers/
│   │   ├── authController.js     # Staff & Doctor registration, login, profile
│   │   ├── patientController.js  # Patient appointment booking & token tracking
│   │   ├── staffController.js    # Patient verification, triage override, status updates
│   │   ├── doctorController.js   # Consultation lifecycle, pending hold/resume, clinical notes
│   │   ├── queueController.js    # Queue queries, live reordering, department stats
│   │   └── aiController.js       # Groq AI trigger & PyTorch X-ray screening webhook
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verification & role authorization (Staff/Doctor)
│   │   ├── errorMiddleware.js    # Centralized error handler & 404 handler
│   │   ├── validateMiddleware.js # Express-validator request payload sanitization
│   │   ├── uploadMiddleware.js   # Multer configuration for medical image uploads
│   │   └── auditMiddleware.js    # Audit trail logger for sensitive staff/doctor actions
│   ├── models/
│   │   ├── User.js               # Staff & Doctor credentials and roles
│   │   ├── Patient.js            # Patient profile & demographics
│   │   ├── Appointment.js        # Appointment records, symptoms, severity, status
│   │   ├── QueueEntry.js         # Smart queue state, priority scores, estimated wait times
│   │   ├── AIAnalysis.js         # Groq AI risk/urgency structured triage records
│   │   ├── MedicalImageAnalysis.js # PyTorch image screening signals & findings
│   │   ├── Consultation.js       # Doctor consultation records, duration, notes
│   │   └── AuditLog.js           # Action audit history
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth
│   │   ├── patientRoutes.js      # /api/patients
│   │   ├── staffRoutes.js        # /api/staff
│   │   ├── doctorRoutes.js       # /api/doctor
│   │   ├── queueRoutes.js        # /api/queue
│   │   └── aiRoutes.js           # /api/ai
│   ├── services/
│   │   ├── groqService.js        # Groq Llama-3 AI triage analysis prompt & parser
│   │   ├── priorityService.js    # Multi-factor dynamic priority scoring engine
│   │   ├── queueService.js       # Smart queue recalculation, re-ordering, wait time estimation
│   │   └── auditService.js       # Centralized audit logging
│   ├── sockets/
│   │   ├── socketHandler.js      # Socket.IO connection handling & room management
│   │   └── socketEmitter.js      # Centralized event emitters for queue, staff, doctor, patients
│   ├── utils/
│   │   ├── tokenGenerator.js     # Token number format generator (e.g. TKN-YYYYMMDD-XXXX)
│   │   ├── apiResponse.js        # Standardized API response format helper
│   │   └── logger.js             # Console/file structured logger
│   ├── app.js                    # Express app initialization, middleware, routes
│   └── server.js                 # HTTP & Socket.IO server startup
├── uploads/                      # Local storage directory for uploaded medical images
├── scripts/
│   ├── seed.js                   # Database seed script for staff, doctors, and sample queue
│   └── testQueueFlow.js          # Automated end-to-end integration test runner
├── .env.example                  # Environment variable template
├── API_DOCUMENTATION.md          # Comprehensive REST & Socket.IO integration doc
├── package.json
└── README.md
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: v18 or higher
- **MongoDB**: Local MongoDB instance (e.g. `mongodb://127.0.0.1:27017`) or MongoDB Atlas URI

### 2. Installation
```bash
cd backend
npm install
```

### 3. Environment Variables Setup
Copy `.env.example` to `.env` and adjust variables as needed:
```bash
cp .env.example .env
```

Key environment variables:
```ini
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/smart_queue_ai
JWT_SECRET=your_super_secret_jwt_key
GROQ_API_KEY=your_groq_api_key_here # Optional: backend has built-in offline fallback if not set
CLIENT_URL=http://localhost:5173
AVG_CONSULTATION_MINUTES=15
AGING_BOOST_MINUTES=10
AGING_BOOST_POINTS=2
PENDING_RETURN_PRIORITY_BOOST=35
```

### 4. Seed Demo Data
Populate demo staff, doctors across departments, and sample triage patients:
```bash
npm run seed
```

### 5. Run Automated End-to-End Test Suite
Run the automated test runner to verify all 14 integration test scenarios:
```bash
npm run test:flow
```

### 6. Start the Server
```bash
# Production mode
npm start

# Development mode (auto-reload)
npm run dev
```

---

## ⚖️ Priority Scoring Formula

The priority engine calculates an operational triage score using a multi-factor formula:

$$\text{Priority Score} = S_{\text{clinical}} + S_{\text{accident}} + S_{\text{AI urgency}} + S_{\text{AI risk}} + S_{\text{image}} + S_{\text{aging}} + S_{\text{pending return}}$$

| Factor | Description | Points Range |
|---|---|---|
| **Clinical Severity** | Staff verified or patient reported (`LOW` / `MEDIUM` / `HIGH` / `CRITICAL`) | $10 - 80$ pts |
| **Accident Trauma** | Trauma severity boost (`EASY` / `MEDIUM` / `HIGH`) | $0 - 45$ pts |
| **Groq AI Urgency** | AI triage urgency assessment | $5 - 45$ pts |
| **Groq AI Risk** | AI clinical risk factors | $5 - 40$ pts |
| **Medical Image Screening** | PyTorch normalized screening score $(0.0 - 1.0) \times 30$ | $0 - 30$ pts |
| **Aging Adjustment** | Starvation prevention (+2 pts every 10 mins waiting) | $0 - 30$ pts max |
| **Pending Return Boost** | Restoration bonus for patients returning from labs/imaging | $+35$ pts |

### Priority Levels Classification
- **`CRITICAL`**: Score $\ge 110$ or Clinical Severity `CRITICAL`
- **`HIGH`**: Score $\ge 70$
- **`MEDIUM`**: Score $\ge 35$
- **`LOW`**: Score $< 35$

*Disclaimer: Priority scores are operational triage aids, NOT medical diagnoses.*

---

## 📡 Frontend Integration

For comprehensive REST endpoints, request/response payloads, and Socket.IO client code examples, please refer to [API_DOCUMENTATION.md](file:///c:/Users/praja/OneDrive/Desktop/Aarogya%20Pravah%20AI/backend/API_DOCUMENTATION.md).
