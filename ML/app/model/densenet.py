import tensorflow as tf
from tensorflow.keras.applications import DenseNet121
from tensorflow.keras.layers import GlobalAveragePooling2D, Dense, Dropout, BatchNormalization
from tensorflow.keras.models import Model
from app.config import config

def build_densenet121_model(num_classes: int = config.NUM_CLASSES, trainable_backbone: bool = False) -> Model:
    """
    Build pretrained DenseNet-121 model architecture with custom classification head.
    
    @param num_classes: Number of target radiological classification categories
    @param trainable_backbone: Whether backbone layers are trainable (default False for Stage A)
    @returns: tf.keras.models.Model instance
    """
    # 1. Instantiate pretrained DenseNet-121 backbone without top classification head
    base_model = DenseNet121(
        weights="imagenet",
        include_top=False,
        input_shape=(config.IMAGE_SIZE[0], config.IMAGE_SIZE[1], config.INPUT_CHANNELS)
    )

    # 2. Control backbone layer trainability
    base_model.trainable = trainable_backbone

    # 3. Add project-specific custom classification head
    x = base_model.output
    x = GlobalAveragePooling2D(name="global_avg_pool")(x)
    x = BatchNormalization(name="head_batch_norm")(x)
    x = Dense(256, activation="relu", name="head_dense_256")(x)
    x = Dropout(0.4, name="head_dropout")(x)
    outputs = Dense(num_classes, activation="softmax", name="radiological_classification_output")(x)

    # 4. Construct complete Keras Model
    model = Model(inputs=base_model.input, outputs=outputs, name="DenseNet121_Radiological_Classifier")

    return model
