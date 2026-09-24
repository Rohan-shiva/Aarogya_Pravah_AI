import io
import requests
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.config import config
from app.model.preprocessing import load_and_preprocess_image
from app.model.inference import predict_radiological_image, get_or_load_model
from app.schemas.prediction import PredictionResponse, PredictionRequest

app = FastAPI(
    title="Aarogya Pravah AI — DenseNet-121 Radiological Screening Service",
    description="TensorFlow / Keras DenseNet-121 image classification microservice for hospital queue triage prioritization.",
    version=config.MODEL_VERSION,
)

# Enable CORS for backend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    """Warm up TensorFlow model on FastAPI startup"""
    try:
        get_or_load_model()
        print(f"[ML Service] TensorFlow DenseNet-121 Service initialized on port {config.PORT}")
    except Exception as e:
        print(f"[ML Service Warning] Model warmup failed: {e}")

@app.get("/health")
def health_check():
    """Health check endpoint for Node.js backend monitoring"""
    return {
        "status": "HEALTHY",
        "service": "TensorFlow DenseNet-121 Screening Service",
        "modelVersion": config.MODEL_VERSION,
        "classes": config.CLASSES,
        "imageSize": config.IMAGE_SIZE,
        "environment": config.ENVIRONMENT,
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict_image(
    file: UploadFile = File(...),
    appointmentId: str = Form(None),
    tokenNumber: str = Form(None),
):
    """
    Accept multipart/form-data medical image file, run DenseNet-121 inference,
    and return structured screening signals for backend priority calculation.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file format '{file.content_type}'. Must be a valid medical image (JPEG, PNG, DICOM-derived)."
        )

    try:
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

        preprocessed = load_and_preprocess_image(contents)
        result = predict_radiological_image(preprocessed, appointmentId, tokenNumber)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ML inference processing failed: {str(e)}"
        )

@app.post("/predict-url", response_model=PredictionResponse)
async def predict_image_url(payload: PredictionRequest):
    """
    Accept image URL JSON payload (e.g. Cloudinary image URL), download image,
    run DenseNet-121 inference, and return structured screening output.
    """
    if not payload.imageUrl:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="imageUrl is required."
        )

    try:
        response = requests.get(payload.imageUrl, timeout=10)
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to fetch image from URL (HTTP status {response.status_code})."
            )

        preprocessed = load_and_preprocess_image(response.content)
        result = predict_radiological_image(preprocessed, payload.appointmentId, payload.tokenNumber)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ML URL inference processing failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=config.HOST, port=config.PORT, reload=True)
