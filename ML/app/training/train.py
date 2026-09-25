import os
import tensorflow as tf
from app.config import config
from app.model.densenet import build_densenet121_model
from app.training.dataset import get_train_val_test_datasets, build_data_augmentation_layer

def train_stage_a_head(epochs: int = 5, batch_size: int = 16, learning_rate: float = 1e-3):
    """
    Stage A Training: Freeze DenseNet-121 backbone and train custom classification head.
    
    @param epochs: Number of Stage A epochs
    @param batch_size: Mini-batch size
    @param learning_rate: Initial learning rate (1e-3)
    @returns: Trained Keras model, history, test_data
    """
    print("\n[Stage A Training] Freezing DenseNet-121 backbone...")
    
    # 1. Build model with frozen backbone
    model = build_densenet121_model(num_classes=config.NUM_CLASSES, trainable_backbone=False)

    # 2. Compile model with Adam optimizer & Categorical Crossentropy loss
    optimizer = tf.keras.optimizers.Adam(learning_rate=learning_rate)
    model.compile(
        optimizer=optimizer,
        loss="categorical_crossentropy",
        metrics=["accuracy", tf.keras.metrics.AUC(name="auc")]
    )

    # 3. Load dataset splits
    train_ds, val_ds, test_ds, (x_test, y_test) = get_train_val_test_datasets(batch_size=batch_size)

    # 4. Setup callbacks
    os.makedirs(config.MODEL_DIR, exist_ok=True)
    callbacks = [
        tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=3, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=2, min_lr=1e-6),
    ]

    print(f"[Stage A Training] Starting Stage A for {epochs} epochs (LR={learning_rate})...")
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=epochs,
        callbacks=callbacks,
        verbose=1
    )

    return model, history, (x_test, y_test)
