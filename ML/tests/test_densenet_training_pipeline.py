import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.config import config
from app.training.train import train_stage_a_head
from app.training.fine_tune import fine_tune_stage_b
from app.training.evaluate import evaluate_densenet_model

def test_full_densenet121_fine_tuning_pipeline():
    """
    Execute controlled 2-stage fine-tuning pipeline test:
    Stage A (head training) -> Stage B (selective layer unfreezing) -> Evaluation -> Checkpoint Verification.
    """
    print("\n[ML Pipeline Test] Starting Stage A Head Training (2 epochs)...")
    model, history_a, (x_test, y_test) = train_stage_a_head(epochs=2, batch_size=16, learning_rate=1e-3)
    
    assert model is not None
    assert len(history_a.history['accuracy']) == 2
    print("  [OK] Stage A head training completed successfully")

    print("\n[ML Pipeline Test] Starting Stage B Fine-Tuning (2 epochs)...")
    fine_tuned_model, history_b = fine_tune_stage_b(model, epochs=2, batch_size=16, learning_rate=1e-5, unfreeze_layers=30)
    
    assert fine_tuned_model is not None
    assert len(history_b.history['accuracy']) == 2
    print("  [OK] Stage B selective unfreezing fine-tuning completed successfully")

    print("\n[ML Pipeline Test] Verifying Checkpoint Weight File Saving...")
    assert os.path.exists(config.MODEL_WEIGHTS_FILE), f"Weights file should exist at {config.MODEL_WEIGHTS_FILE}"
    print(f"  [OK] Model weights successfully saved to {config.MODEL_WEIGHTS_FILE}")

    print("\n[ML Pipeline Test] Running Model Evaluation...")
    eval_report = evaluate_densenet_model(fine_tuned_model, x_test, y_test)
    
    assert "testAccuracy" in eval_report
    assert "testAuc" in eval_report
    assert len(eval_report["classMetrics"]) == config.NUM_CLASSES
    print(f"  [OK] Evaluation report generated: Accuracy={eval_report['testAccuracy'] * 100:.2f}%, AUC={eval_report['testAuc']:.4f}")

if __name__ == "__main__":
    print("\n======================================================")
    print("RUNNING TENSORFLOW DENSENET-121 FINE-TUNING TESTS")
    print("======================================================\n")
    test_full_densenet121_fine_tuning_pipeline()
    print("\n======================================================")
    print("ALL DAY 5 FINE-TUNING PIPELINE TESTS PASSED SUCCESSFULLY!")
    print("======================================================\n")
