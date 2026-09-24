import io
import numpy as np
from PIL import Image
import tensorflow as tf
from tensorflow.keras.applications.densenet import preprocess_input
from app.config import config

def load_and_preprocess_image(image_bytes: bytes) -> np.ndarray:
    """
    Load raw image bytes, resize to target dimensions (224x224),
    convert to RGB, and apply standard DenseNet-121 normalization.
    @param image_bytes: Raw binary image file content
    @returns: Preprocessed batch tensor of shape (1, 224, 224, 3)
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))

        # Convert palette/grayscale images to 3-channel RGB
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Resize image to target (224, 224)
        image = image.resize(config.IMAGE_SIZE, Image.Resampling.BILINEAR)

        # Convert PIL Image to numpy array (224, 224, 3)
        img_array = np.array(image, dtype=np.float32)

        # Expand dimensions to batch tensor (1, 224, 224, 3)
        batch_array = np.expand_dims(img_array, axis=0)

        # Apply DenseNet-121 specific preprocessing (zero-centering per channel with scaling)
        preprocessed = preprocess_input(batch_array)

        return preprocessed
    except Exception as e:
        raise ValueError(f"Image preprocessing failed: {str(e)}")
