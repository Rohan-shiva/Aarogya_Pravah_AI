from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class PredictionRequest(BaseModel):
    appointmentId: Optional[str] = None
    tokenNumber: Optional[str] = None
    imageUrl: Optional[str] = None

class ClassConfidence(BaseModel):
    className: str
    confidence: float

class PredictionResponse(BaseModel):
    appointmentId: Optional[str] = None
    tokenNumber: Optional[str] = None
    screeningStatus: str = Field(description="NORMAL, MILD_FINDINGS, MODERATE_FINDINGS, CRITICAL_ABNORMALITY_DETECTED, INCONCLUSIVE")
    imageScore: float = Field(ge=0.0, le=1.0, description="Normalized abnormality score between 0.0 and 1.0")
    predictedClass: str
    confidenceSignal: float = Field(ge=0.0, le=1.0)
    possibleFindings: List[str] = []
    classBreakdown: List[ClassConfidence] = []
    modelVersion: str = "densenet121-tf-v1.0"
    isFallbackModel: bool = False
    disclaimer: str = "AI-generated decision support — not a medical diagnosis."
