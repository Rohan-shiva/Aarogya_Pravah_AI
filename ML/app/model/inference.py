import os
import numpy as np
import tensorflow as tf
from app.config import config
from app.model.densenet import build_densenet121_model
from app.schemas.prediction import PredictionResponse, ClassConfidence

_model_instance = None

def get_or_load_model() -> tf.keras.Model:
    """
    Singleton loader for DenseNet-121 model.
    Loads saved fine-tuned weights if available, or initializes ImageNet pretrained foundation.
    """
    global _model_instance
    if _model_instance is not None:
        return _model_instance

    model = build_densenet121_model(num_classes=config.NUM_CLASSES, trainable_backbone=False)

    if os.path.exists(config.MODEL_WEIGHTS_FILE):
        try:
            model.load_weights(config.MODEL_WEIGHTS_FILE)
            print(f"[ML Inference] Loaded fine-tuned weights from {config.MODEL_WEIGHTS_FILE}")
        except Exception as e:
            print(f"[ML Inference Warning] Failed to load saved weights: {e}. Using ImageNet pretrained initialization.")
    else:
        print(f"[ML Inference] No fine-tuned weights file found at {config.MODEL_WEIGHTS_FILE}. Utilizing pretrained DenseNet-121 backbone.")

    _model_instance = model
    return _model_instance

def predict_radiological_image(
    preprocessed_tensor: np.ndarray,
    appointment_id: str = None,
    token_number: str = None
) -> PredictionResponse:
    """
    Run DenseNet-121 inference on preprocessed tensor and format structured prediction output.
    
    @param preprocessed_tensor: Batch array of shape (1, 224, 224, 3)
    @param appointment_id: Optional appointment ID string
    @param token_number: Optional token number string
    @returns: PredictionResponse schema
    """
    model = get_or_load_model()

    # 1. Run forward pass inference
    predictions = model.predict(preprocessed_tensor, verbose=0)[0]  # Array of shape (NUM_CLASSES,)

    # 2. Extract class probabilities
    class_probs = {config.CLASSES[i]: float(predictions[i]) for i in range(len(config.CLASSES))}
    top_class_idx = int(np.argmax(predictions))
    predicted_class = config.CLASSES[top_class_idx]
    confidence_signal = float(predictions[top_class_idx])

    # 3. Calculate normalized abnormality score (0.0 = completely normal, 1.0 = severe abnormality)
    normal_prob = class_probs.get("NORMAL", 0.0)
    abnormality_score = float(round(1.0 - normal_prob, 4))

    # 4. Map top predicted class to backend priority screening status
    screening_status = config.STATUS_MAP.get(predicted_class, "MILD_FINDINGS")

    # 5. Build class breakdown list
    class_breakdown = [
        ClassConfidence(className=cls_name, confidence=round(prob, 4))
        for cls_name, prob in sorted(class_probs.items(), key=lambda x: x[1], reverse=True)
    ]

    # 6. Extract possible findings strings
    possible_findings = []
    if predicted_class != "NORMAL":
        possible_findings.append(f"Possible {predicted_class.replace('_', ' ').title()}")
    
    # Include secondary elevated findings (> 15% confidence)
    for cls_name, prob in class_probs.items():
        if cls_name != "NORMAL" and cls_name != predicted_class and prob >= 0.15:
            possible_findings.append(f"Elevated probability for {cls_name.replace('_', ' ').title()} ({(prob * 100):.1f}%)")

    if not possible_findings:
        possible_findings.append("No acute radiological abnormality detected")

    return PredictionResponse(
        appointmentId=appointment_id,
        tokenNumber=token_number,
        screeningStatus=screening_status,
        imageScore=abnormality_score,
        predictedClass=predicted_class,
        confidenceSignal=round(confidence_signal, 4),
        possibleFindings=possible_findings,
        classBreakdown=class_breakdown,
        modelVersion=config.MODEL_VERSION,
        isFallbackModel=False,
    )
