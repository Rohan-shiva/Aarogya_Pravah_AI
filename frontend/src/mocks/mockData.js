// Comprehensive Mock Data for Aarogya Pravah AI

export const mockStaffProfile = {
  id: "STAFF-001",
  name: "Dr. Aris Thorne",
  avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuB-5UOUTsOt4NO5LMTC5DPKKgvzXFmcfqmzn-4d_26kYSVQOCACjVvuf4W5_rfkp8xOy6vx7b4n0LyFHlDx1XwKQBQbKvyTDc89xZ2cAcsdJfQ0HDkpnf0DSr9R0Sj4xqXrXBQAN9dJVeM1Dlij4a7e7FMxU_GXrDzvJlt3OGo3o-6PnT7xvfniw6dhkMuBeCvDwQQbJrk9mIcRaDIOP24HruvlWDanlu6sxTpHZN2bnVT3QZYwb3YO",
  role: "Senior Cardiologist",
  department: "Cardiology Department",
  employeeId: "EMP-2048-CT",
  email: "a.thorne@aarogyapravah.ai",
  contact: "+1 (555) 284-9382",
  license: "MED-LI-773829",
  dateOfJoining: "October 14, 2018",
  specializations: ["Interventional Cardiology", "Echocardiography"],
  shiftStatus: "On-Duty",
  currentAssignment: "Ward 4B - Cardiac ICU",
  todaySchedule: [
    { title: "Morning Rounds", time: "08:00 - 10:00" },
    { title: "Outpatient Clinic", time: "11:00 - 14:00" },
    { title: "Emergency On-Call", time: "15:00 - 18:00" }
  ],
  security: {
    twoFactorEnabled: true
  }
};

export const mockNotifications = [
  {
    id: "notif-1",
    type: "new_request",
    title: "New Request: Cardiology",
    message: "Token #A-142 just arrived.",
    time: "Just now",
    unread: true
  },
  {
    id: "notif-2",
    type: "queue_update",
    title: "Queue Updated",
    message: "Dr. Smith cleared 2 patients.",
    time: "5 mins ago",
    unread: false
  },
  {
    id: "notif-3",
    type: "ai_alert",
    title: "Critical AI Triage Detected",
    message: "Patient PT-9042 flagged with Urgency Score 94/100.",
    time: "12 mins ago",
    unread: false
  }
];

export const mockPendingValidationPatients = [
  {
    id: "PT-9042",
    tokenNumber: "T-098",
    fullName: "Marcus Thorne",
    age: 42,
    gender: "Male",
    dob: "12/05/1981",
    bloodGroup: "O+",
    contact: "+1 (555) 019-8472",
    arrivalTime: "10:42 AM",
    waitTime: "10 min wait",
    department: "Cardiology",
    assignedDoctor: "Dr. Sarah Jenkins",
    reportedSeverity: "High",
    isAccidentalCase: true,
    accidentSeverity: "High",
    status: "Pending Validation",
    symptoms: "Severe, crushing chest pain radiating to the left arm. Shortness of breath, diaphoresis starting 30 minutes ago.",
    aiPreliminary: {
      suggestedDisease: "Acute Myocardial Infarction (AMI)",
      urgencyScore: 92,
      riskLevel: "High"
    },
    attachments: [
      {
        id: "att-1",
        fileName: "Chest_XRay_Frontal.jpg",
        fileType: "image/jpeg",
        url: "https://lh3.googleusercontent.com/aida-public/AB6AXuC4TW7M0EFG7nr1O129gg5f6pVo_KwAaGPuxnedBW9Otg1rMwHt9K_cgj-p0fgzg06TRnsXK6E9Tn924Jkz1Qkv16bQD8PTXM5A0LvHLaIHcDeNuPAVQYXOa1rycMw9xjG5IRZeWNC9eujbHE7c5t1W8z55zcO5pR6LS0olq7HOd7hMcDc4YJKNIqIp535i-usktWpneA5Ki4m50GgJlKbvEjPYOhGYka4M2VelCwdayCfcJE6GTHxv"
      }
    ]
  },
  {
    id: "PT-9043",
    tokenNumber: "T-099",
    fullName: "Sarah Jenkins",
    age: 62,
    gender: "Female",
    dob: "08/19/1962",
    bloodGroup: "A+",
    contact: "+1 (555) 392-1084",
    arrivalTime: "10:47 AM",
    waitTime: "5 min wait",
    department: "Orthopedics",
    assignedDoctor: "Dr. Aris Thorne",
    reportedSeverity: "Medium",
    isAccidentalCase: true,
    accidentSeverity: "Medium",
    status: "Pending Validation",
    symptoms: "Fractured radius, minor abrasions following slip on icy stairs. Swelling and restricted wrist movement.",
    aiPreliminary: {
      suggestedDisease: "Distal Radius Fracture",
      urgencyScore: 68,
      riskLevel: "Medium"
    },
    attachments: [
      {
        id: "att-2",
        fileName: "Wrist_XRay_Lateral.jpg",
        fileType: "image/jpeg",
        url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAtsSrKVqOFfN9sxGf4mwSt2r5-_lbzTOxq3ZkGuy-fTIfe2wFvFLuB5Q4gsdbSWGoVVRiFj1bACBkHxQx1PtBLaeyZgAnIxE-wxDfQyE1JZyLnIU-iV6rl7RWSp_H3jeF2krtYmeilxaPJgpu3ERU9FS5QMyrUYmszODJwfmGpX5duA6zGxeg-t9GVaca-bce14nFZmthnEGcDzQSBYnp_VL5CLUZ9KD66xHjd6f6NAF7CMilxo-T0"
      }
    ]
  },
  {
    id: "PT-9044",
    tokenNumber: "T-100",
    fullName: "David Chen",
    age: 29,
    gender: "Male",
    dob: "03/11/1995",
    bloodGroup: "B+",
    contact: "+1 (555) 749-2810",
    arrivalTime: "10:52 AM",
    waitTime: "Just arrived",
    department: "General Medicine",
    assignedDoctor: "Dr. Elena Rostova",
    reportedSeverity: "Low",
    isAccidentalCase: false,
    accidentSeverity: "",
    status: "Pending Validation",
    symptoms: "Persistent dry cough for 4 days, mild fever (38°C), body aches, fatigue.",
    aiPreliminary: {
      suggestedDisease: "Viral Upper Respiratory Infection",
      urgencyScore: 35,
      riskLevel: "Low"
    },
    attachments: []
  }
];

export const mockDoctorPriorityQueue = [
  {
    id: "PT-9042",
    tokenNumber: "TKN-042",
    fullName: "Sarah Jenkins",
    age: 62,
    gender: "Female",
    department: "Cardiology",
    waitTimeText: "Waiting 12m",
    urgencyLevel: "HIGH URGENCY",
    urgencyBadgeColor: "error",
    aiSummary: "Severe chest pain, shortness of breath. Possible Myocardial Infarction.",
    aiScoreBreakdown: {
      aiScore: 40,
      imageScore: 30,
      severityWeight: 20,
      waitTimeBonus: 4,
      totalScore: 94
    },
    xraySummary: null,
    status: "Waiting"
  },
  {
    id: "PT-9043",
    tokenNumber: "TKN-043",
    fullName: "Marcus Thorne",
    age: 41,
    gender: "Male",
    department: "Orthopedics",
    waitTimeText: "Waiting 28m",
    urgencyLevel: "MEDIUM URGENCY",
    urgencyBadgeColor: "secondary",
    aiSummary: "Suspected fracture, left radius.",
    aiScoreBreakdown: {
      aiScore: 30,
      imageScore: 25,
      severityWeight: 10,
      waitTimeBonus: 3,
      totalScore: 68
    },
    xraySummary: "Hairline fracture confirmed at distal radius.",
    status: "Waiting"
  },
  {
    id: "PT-9044",
    tokenNumber: "TKN-044",
    fullName: "Elena Rostova",
    age: 34,
    gender: "Female",
    department: "Neurology",
    waitTimeText: "Waiting 35m",
    urgencyLevel: "MEDIUM URGENCY",
    urgencyBadgeColor: "secondary",
    aiSummary: "Sudden onset migraine with aura, visual field disturbances.",
    aiScoreBreakdown: {
      aiScore: 28,
      imageScore: 0,
      severityWeight: 20,
      waitTimeBonus: 4,
      totalScore: 52
    },
    xraySummary: null,
    status: "Waiting"
  },
  {
    id: "PT-9045",
    tokenNumber: "TKN-045",
    fullName: "David Chen",
    age: 29,
    gender: "Male",
    department: "General Medicine",
    waitTimeText: "Waiting 45m",
    urgencyLevel: "LOW URGENCY",
    urgencyBadgeColor: "surface-container-high",
    aiSummary: "Seasonal influenza-like symptoms, low-grade fever.",
    aiScoreBreakdown: {
      aiScore: 15,
      imageScore: 0,
      severityWeight: 5,
      waitTimeBonus: 5,
      totalScore: 25
    },
    xraySummary: null,
    status: "Waiting"
  }
];

export const mockPatientHistory = {
  patient: {
    id: "PT-9043",
    fullName: "Marcus Thorne",
    age: 42,
    dob: "12/05/1981",
    bloodGroup: "O+",
    primaryDoctor: "Dr. Sarah Jenkins",
    totalVisits: 4,
    maxAiRisk: 92,
    frequentDepartments: [
      { name: "Cardiology", visits: 2, percentage: 50 },
      { name: "Orthopedics", visits: 1, percentage: 25 },
      { name: "General Medicine", visits: 1, percentage: 25 }
    ],
    trendData: [
      { label: "V1", score: 12 },
      { label: "V2", score: 34 },
      { label: "V3", score: 92, isCritical: true },
      { label: "V4", score: 8 }
    ]
  },
  timeline: [
    {
      id: "hist-1",
      date: "Oct 12, 2023",
      department: "Cardiology",
      conditionTitle: "Severe Chest Pain & Palpitations",
      aiPriority: 92,
      isCritical: true,
      diagnosis: "Acute myocardial infarction ruled out. Diagnosed with severe costochondritis and stress-induced tachycardia. Referred to physical therapy and prescribed beta-blockers.",
      attachments: [
        { type: "icon", icon: "monitor_heart", label: "ECG Report" },
        { type: "icon", icon: "medical_information", label: "Lab Vitals" }
      ]
    },
    {
      id: "hist-2",
      date: "May 04, 2022",
      department: "Orthopedics",
      conditionTitle: "Right Knee Sprain",
      aiPriority: 34,
      isCritical: false,
      diagnosis: "Grade 2 MCL sprain following sports injury. Immobilization via brace applied. Ice and elevation recommended.",
      attachments: [
        {
          type: "image",
          thumbnail: "https://lh3.googleusercontent.com/aida-public/AB6AXuAtsSrKVqOFfN9sxGf4mwSt2r5-_lbzTOxq3ZkGuy-fTIfe2wFvFLuB5Q4gsdbSWGoVVRiFj1bACBkHxQx1PtBLaeyZgAnIxE-wxDfQyE1JZyLnIU-iV6rl7RWSp_H3jeF2krtYmeilxaPJgpu3ERU9FS5QMyrUYmszODJwfmGpX5duA6zGxeg-t9GVaca-bce14nFZmthnEGcDzQSBYnp_VL5CLUZ9KD66xHjd6f6NAF7CMilxo-T0",
          label: "Knee X-Ray"
        }
      ]
    }
  ]
};

export const mockTokenDatabase = {
  "TKN-042": {
    tokenNumber: "TKN-042",
    patientName: "Sarah Jenkins",
    department: "Cardiology",
    estimatedWaitTime: "45 min",
    queuePosition: "#12",
    status: "Waiting for Triage Validation",
    statusType: "pending",
    timestamp: "10:42 AM"
  },
  "T-098": {
    tokenNumber: "T-098",
    patientName: "Marcus Thorne",
    department: "Cardiology",
    estimatedWaitTime: "15 min",
    queuePosition: "#2",
    status: "AI Analysis Complete - In Doctor Queue",
    statusType: "ready",
    timestamp: "10:42 AM"
  },
  "T-099": {
    tokenNumber: "T-099",
    patientName: "Sarah Jenkins",
    department: "Orthopedics",
    estimatedWaitTime: "25 min",
    queuePosition: "#5",
    status: "In Doctor Priority Queue",
    statusType: "ready",
    timestamp: "10:47 AM"
  },
  "T-100": {
    tokenNumber: "T-100",
    patientName: "David Chen",
    department: "General Medicine",
    estimatedWaitTime: "50 min",
    queuePosition: "#14",
    status: "Waiting for Staff Validation",
    statusType: "pending",
    timestamp: "10:52 AM"
  }
};
