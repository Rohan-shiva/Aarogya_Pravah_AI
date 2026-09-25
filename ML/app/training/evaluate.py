import numpy as np
import tensorflow as tf
from app.config import config

def evaluate_densenet_model(model: tf.keras.Model, x_test: np.ndarray, y_test: np.ndarray) -> dict:
    """
    Evaluate fine-tuned DenseNet-121 model on test set and compute metrics.
    
    @param model: Fine-tuned model instance
    @param x_test: Test batch images array
    @param y_test: Test one-hot labels array
    @returns: Dictionary of evaluation metrics
    """
    print("\n[Model Evaluation] Evaluating fine-tuned model on test set...")

    # 1. Run model evaluation
    loss, accuracy, auc = model.evaluate(x_test, y_test, verbose=0)

    # 2. Compute class-level metrics
    predictions = model.predict(x_test, verbose=0)
    pred_classes = np.argmax(predictions, axis=1)
    true_classes = np.argmax(y_test, axis=1)

    class_metrics = {}
    for i, class_name in enumerate(config.CLASSES):
        tp = np.sum((pred_classes == i) & (true_classes == i))
        fp = np.sum((pred_classes == i) & (true_classes != i))
        fn = np.sum((pred_classes != i) & (true_classes == i))

        precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        f1 = float(2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

        class_metrics[class_name] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1Score": round(f1, 4),
        }

    eval_report = {
        "testLoss": round(float(loss), 4),
        "testAccuracy": round(float(accuracy), 4),
        "testAuc": round(float(auc), 4),
        "classMetrics": class_metrics,
        "modelVersion": config.MODEL_VERSION,
    }

    print(f"[Model Evaluation Metrics] Accuracy: {eval_report['testAccuracy'] * 100:.2f}%, AUC: {eval_report['testAuc']:.4f}")
    return eval_report
