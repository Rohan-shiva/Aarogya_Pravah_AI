import os
import sys
import io

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import numpy as np
from PIL import Image
from app.config import config
from app.model.densenet import build_densenet121_model
from app.model.preprocessing import load_and_preprocess_image
from app.model.inference import predict_radiological_image

def test_densenet121_architecture():
    """Verify DenseNet-121 model builds with correct input and output dimensions"""
    model = build_densenet121_model(num_classes=config.NUM_CLASSES, trainable_backbone=False)
    
    assert model.name == "DenseNet121_Radiological_Classifier"
    assert model.input_shape == (None, 224, 224, 3)
    assert model.output_shape == (None, config.NUM_CLASSES)
    print("  [OK] DenseNet-121 architecture instantiated with correct tensor shapes")

def test_image_preprocessing_pipeline():
    """Verify synthetic image is preprocessed into tensor of shape (1, 224, 224, 3)"""
    # Create synthetic 300x300 RGB test image
    synthetic_img = Image.new("RGB", (300, 300), color=(128, 128, 128))
    img_byte_arr = io.BytesIO()
    synthetic_img.save(img_byte_arr, format="PNG")
    raw_bytes = img_byte_arr.getvalue()

    preprocessed = load_and_preprocess_image(raw_bytes)
    
    assert isinstance(preprocessed, np.ndarray)
    assert preprocessed.shape == (1, 224, 224, 3)
    assert preprocessed.dtype == np.float32
    print("  [OK] Image preprocessing outputs normalized batch tensor of shape (1, 224, 224, 3)")

def test_inference_pipeline():
    """Verify inference pipeline generates structured PredictionResponse"""
    synthetic_img = Image.new("RGB", (224, 224), color=(200, 200, 200))
    img_byte_arr = io.BytesIO()
    synthetic_img.save(img_byte_arr, format="JPEG")
    raw_bytes = img_byte_arr.getvalue()

    preprocessed = load_and_preprocess_image(raw_bytes)
    result = predict_radiological_image(preprocessed, appointment_id="APP-TEST-123", token_number="TKN-999")

    assert result.appointmentId == "APP-TEST-123"
    assert result.tokenNumber == "TKN-999"
    assert result.screeningStatus in ["NORMAL", "MILD_FINDINGS", "MODERATE_FINDINGS", "CRITICAL_ABNORMALITY_DETECTED"]
    assert 0.0 <= result.imageScore <= 1.0
    assert 0.0 <= result.confidenceSignal <= 1.0
    assert len(result.classBreakdown) == config.NUM_CLASSES
    print(f"  [OK] Inference pipeline outputs valid prediction: Class={result.predictedClass}, Status={result.screeningStatus}, Score={result.imageScore}")

if __name__ == "__main__":
    print("\n======================================================")
    print("RUNNING TENSORFLOW DENSENET-121 FOUNDATION TESTS")
    print("======================================================\n")
    test_densenet121_architecture()
    test_image_preprocessing_pipeline()
    test_inference_pipeline()
    print("\n======================================================")
    print("ALL DAY 4 ML FOUNDATION TESTS PASSED SUCCESSFULLY!")
    print("======================================================\n")
