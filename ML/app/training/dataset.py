import os
import numpy as np
import tensorflow as tf
from PIL import Image
from app.config import config

def build_data_augmentation_layer() -> tf.keras.Sequential:
    """
    Construct Keras preprocessing data augmentation pipeline
    for radiological image training.
    """
    return tf.keras.Sequential([
        tf.keras.layers.RandomRotation(0.08, fill_mode="nearest"),
        tf.keras.layers.RandomTranslation(height_factor=0.05, width_factor=0.05, fill_mode="nearest"),
        tf.keras.layers.RandomZoom(height_factor=0.08, width_factor=0.08, fill_mode="nearest"),
        tf.keras.layers.RandomFlip("horizontal"),
    ], name="data_augmentation")

def generate_synthetic_dataset(num_samples_per_class: int = 20, image_size: tuple = config.IMAGE_SIZE, num_classes: int = config.NUM_CLASSES):
    """
    Generate synthetic dataset for offline training and CI test verification
    when external multi-GB datasets are not locally downloaded.
    
    @returns: (x_data, y_data) numpy arrays
    """
    x_list = []
    y_list = []

    np.random.seed(42)
    for class_idx in range(num_classes):
        for _ in range(num_samples_per_class):
            # Generate synthetic grayscale/RGB pattern with distinct class intensity shifts
            base_color = (class_idx + 1) * 35
            noise = np.random.randint(-20, 20, size=(image_size[0], image_size[1], 3), dtype=np.int16)
            img_arr = np.clip(base_color + noise, 0, 255).astype(np.uint8)

            # Preprocess to match DenseNet input requirements
            img_float = img_arr.astype(np.float32)
            preprocessed = tf.keras.applications.densenet.preprocess_input(img_float)

            x_list.append(preprocessed)

            # One-hot encode label
            one_hot = np.zeros(num_classes, dtype=np.float32)
            one_hot[class_idx] = 1.0
            y_list.append(one_hot)

    x_data = np.array(x_list, dtype=np.float32)
    y_data = np.array(y_list, dtype=np.float32)

    # Shuffle dataset
    indices = np.arange(len(x_data))
    np.random.shuffle(indices)

    return x_data[indices], y_data[indices]

def get_train_val_test_datasets(batch_size: int = 16, test_split: float = 0.15, val_split: float = 0.15):
    """
    Create train, validation, and test dataset splits.
    """
    x_data, y_data = generate_synthetic_dataset(num_samples_per_class=25)

    total_samples = len(x_data)
    test_count = int(total_samples * test_split)
    val_count = int(total_samples * val_split)
    train_count = total_samples - test_count - val_count

    x_train, y_train = x_data[:train_count], y_data[:train_count]
    x_val, y_val = x_data[train_count:train_count+val_count], y_data[train_count:train_count+val_count]
    x_test, y_test = x_data[train_count+val_count:], y_data[train_count+val_count:]

    train_ds = tf.data.Dataset.from_tensor_slices((x_train, y_train)).batch(batch_size).prefetch(tf.data.AUTOTUNE)
    val_ds = tf.data.Dataset.from_tensor_slices((x_val, y_val)).batch(batch_size).prefetch(tf.data.AUTOTUNE)
    test_ds = tf.data.Dataset.from_tensor_slices((x_test, y_test)).batch(batch_size).prefetch(tf.data.AUTOTUNE)

    return train_ds, val_ds, test_ds, (x_test, y_test)
