import os

class MLConfig:
    PORT: int = int(os.getenv("PORT", 8000))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Image Preprocessing Settings
    IMAGE_SIZE: tuple = (224, 224)
    INPUT_CHANNELS: int = 3

    # Classification Classes
    CLASSES: list = [
        "NORMAL",
        "PNEUMONIA_MILD",
        "PNEUMONIA_SEVERE",
        "TUBERCULOSIS_SUSPECT",
        "CARDIOMEGALY",
        "EFFUSION",
    ]
    NUM_CLASSES: int = len(CLASSES)

    # Screening Status Mapping for Backend Priority Engine
    # Map classes to backend screening statuses
    STATUS_MAP: dict = {
        "NORMAL": "NORMAL",
        "PNEUMONIA_MILD": "MILD_FINDINGS",
        "PNEUMONIA_SEVERE": "CRITICAL_ABNORMALITY_DETECTED",
        "TUBERCULOSIS_SUSPECT": "CRITICAL_ABNORMALITY_DETECTED",
        "CARDIOMEGALY": "MODERATE_FINDINGS",
        "EFFUSION": "MODERATE_FINDINGS",
    }

    # Model Artifacts Path
    MODEL_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
    MODEL_WEIGHTS_FILE: str = os.path.join(MODEL_DIR, "densenet121_chest_xray.weights.h5")
    MODEL_VERSION: str = "densenet121-tf-v1.0"

config = MLConfig()
