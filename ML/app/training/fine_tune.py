import os
import tensorflow as tf
from app.config import config
from app.training.dataset import get_train_val_test_datasets

def fine_tune_stage_b(model: tf.keras.Model, epochs: int = 5, batch_size: int = 16, learning_rate: float = 1e-5, unfreeze_layers: int = 30):
    """
    Stage B Fine-Tuning: Unfreeze selected upper DenseNet-121 layers and fine-tune with small LR.
    
    @param model: Stage A trained model instance
    @param epochs: Number of Stage B fine-tuning epochs
    @param batch_size: Mini-batch size
    @param learning_rate: Small learning rate (1e-5) to prevent weight explosion
    @param unfreeze_layers: Number of top layers to unfreeze (default top 30 layers)
    @returns: Fine-tuned model, history
    """
    print(f"\n[Stage B Fine-Tuning] Unfreezing top {unfreeze_layers} layers of DenseNet-121...")

    # 1. Unfreeze top layers of the backbone
    model.trainable = True

    # Freeze all layers except the last `unfreeze_layers`
    total_layers = len(model.layers)
    freeze_until = total_layers - unfreeze_layers

    for i, layer in enumerate(model.layers):
        if i < freeze_until:
            layer.trainable = False
        else:
            layer.trainable = True

    trainable_count = count_trainable_weights(model)
    print(f"[Stage B Fine-Tuning] Total layers: {total_layers}, Trainable parameters: {trainable_count}")

    # 2. Recompile model with low learning rate (1e-5)
    optimizer = tf.keras.optimizers.Adam(learning_rate=learning_rate)
    model.compile(
        optimizer=optimizer,
        loss="categorical_crossentropy",
        metrics=["accuracy", tf.keras.metrics.AUC(name="auc")]
    )

    # 3. Load dataset splits
    train_ds, val_ds, test_ds, (x_test, y_test) = get_train_val_test_datasets(batch_size=batch_size)

    # 4. Callbacks & Checkpoint Saving to ML/models/densenet121_chest_xray.h5
    os.makedirs(config.MODEL_DIR, exist_ok=True)
    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(
            filepath=config.MODEL_WEIGHTS_FILE,
            monitor="val_loss",
            save_best_only=True,
            save_weights_only=True,
            verbose=1
        ),
        tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=3, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=2, min_lr=1e-7),
    ]

    print(f"[Stage B Fine-Tuning] Starting Stage B fine-tuning for {epochs} epochs (LR={learning_rate})...")
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=epochs,
        callbacks=callbacks,
        verbose=1
    )

    # Save final model weights
    model.save_weights(config.MODEL_WEIGHTS_FILE)
    print(f"[Stage B Fine-Tuning SUCCESS] Model weights saved to {config.MODEL_WEIGHTS_FILE}")

    return model, history

def count_trainable_weights(model: tf.keras.Model) -> int:
    return sum(tf.keras.backend.count_params(w) for w in model.trainable_weights)
