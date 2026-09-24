# Aarogya Pravah AI — TensorFlow DenseNet-121 Radiological Screening Service

Standalone Python ML microservice built with **TensorFlow / Keras** and **FastAPI** for preliminary medical image classification (e.g. Chest X-Ray screening).

## Architecture

```text
Input Medical Image
       ↓
Preprocessing (224x224, DenseNet Normalization)
       ↓
Pretrained DenseNet-121 Backbone (ImageNet Weights)
       ↓
Global Average Pooling + Batch Normalization + Dense Classification Head
       ↓
Softmax / Multi-Class Probabilities
       ↓
Abnormality Risk Score & Confidence Signal
       ↓
FastAPI HTTP Endpoint → Node.js Backend Priority Engine
```

## Task & Target Classes

1. `NORMAL`: No significant radiological abnormality detected.
2. `PNEUMONIA_MILD`: Mild pulmonary opacities / infiltrates.
3. `PNEUMONIA_SEVERE`: Dense focal/bilateral consolidation.
4. `TUBERCULOSIS_SUSPECT`: Apical cavitary lesions / miliary pattern.
5. `CARDIOMEGALY`: Enlarged cardiac silhouette.
6. `EFFUSION`: Pleural fluid collection / blunted costophrenic angles.

## Medical Safety Disclaimer

> **IMPORTANT**: This ML service produces **preliminary operational screening signals** for triage queue prioritization. It does **NOT** constitute a clinical diagnosis or treatment recommendation. All outputs require verification by a qualified physician.
