# GAA Budget Machine Learning

This directory contains machine learning implementations for budget analysis, forecasting, and anomaly detection.

## Directory Structure

```
ml/
├── features/           # Feature engineering scripts
├── models/             # Trained model artifacts (.pkl files)
├── training/           # Model training scripts
├── predictions/        # Prediction output files (.parquet)
├── notebooks/          # Jupyter notebooks for exploration
├── requirements.txt    # ML-specific dependencies
└── README.md           # This file
```

## ML Use Cases

### 1. Budget Forecasting
Predict future budget allocations based on historical trends across departments, agencies, and categories.

**Models:**
- Time series forecasting (Prophet, ARIMA)
- Regression models for multi-year predictions
- Department-specific models

### 2. Anomaly Detection
Identify unusual budget allocations that deviate from expected patterns.

**Models:**
- Isolation Forest
- Statistical outlier detection
- Autoencoder-based anomaly detection

### 3. Spending Pattern Analysis
Cluster departments/agencies by spending behavior and identify patterns.

**Models:**
- K-means clustering
- Hierarchical clustering
- Principal Component Analysis (PCA)

### 4. Budget Allocation Prediction
Predict budget distributions across expense categories, objects, and regions.

**Models:**
- Random Forest
- XGBoost
- Neural Networks

## Workflow

### Step 1: Feature Engineering
Extract and engineer features from raw budget data:

```bash
python features/feature_engineering.py --input ../gaa.parquet --output features/budget_features.parquet
```

**Features generated:**
- Year-over-year growth rates
- Department/agency spending ratios
- Seasonal patterns
- Historical averages and trends
- Categorical encodings

### Step 2: Train Models
Train machine learning models on historical data:

```bash
# Budget forecasting
python training/train_forecast_model.py --features features/budget_features.parquet --output models/

# Anomaly detection
python training/train_anomaly_model.py --features features/budget_features.parquet --output models/

# Clustering analysis
python training/train_clustering_model.py --features features/budget_features.parquet --output models/
```

### Step 3: Generate Predictions
Run trained models to generate predictions:

```bash
python training/generate_predictions.py --input ../gaa.parquet --models models/ --output predictions/
```

**Output files (Parquet format):**
- `budget_forecast_{YYYY-MM-DD}.parquet` - Future budget predictions
- `anomalies_{YYYY-MM-DD}.parquet` - Detected anomalies with scores
- `spending_clusters_{YYYY-MM-DD}.parquet` - Cluster assignments and insights

### Step 4: Evaluate Models
Assess model performance:

```bash
python training/evaluate_models.py --predictions predictions/ --actual ../gaa.parquet
```

## Data Schema

### Input: GAA Budget Data
From `gaa.parquet` with fields:
- `id`, `year`, `department`, `agency`, `amt`, etc.

### Output: Predictions Parquet

**Budget Forecasts:**
```
- id: int
- year: int (predicted year)
- department: str
- agency: str
- predicted_amt: float
- confidence_lower: float
- confidence_upper: float
- model_version: str
- prediction_date: timestamp
```

**Anomalies:**
```
- id: int (from original data)
- year: int
- department: str
- agency: str
- amt: float (actual)
- expected_amt: float
- anomaly_score: float
- is_anomaly: bool
- anomaly_type: str
- detection_date: timestamp
```

**Spending Clusters:**
```
- entity_id: str (department or agency)
- entity_type: str
- cluster_id: int
- cluster_label: str
- spending_profile: json
- years_analyzed: list[int]
- analysis_date: timestamp
```

## Model Configuration

Models are saved in the `models/` directory with metadata:
- `forecast_model.pkl` - Forecasting model
- `anomaly_model.pkl` - Anomaly detection model
- `cluster_model.pkl` - Clustering model
- `feature_scaler.pkl` - Feature scaling transformer
- `model_metadata.json` - Model versions and parameters

## Requirements

See `requirements.txt` for dependencies:
- scikit-learn
- xgboost
- prophet (for time series)
- pandas, numpy
- pyarrow (for Parquet I/O)

## Example Usage

```python
import pandas as pd
import joblib

# Load trained model
model = joblib.load('models/forecast_model.pkl')

# Load features
features = pd.read_parquet('features/budget_features.parquet')

# Generate predictions
predictions = model.predict(features)

# Save to Parquet
output_df = pd.DataFrame({
    'year': [2026] * len(predictions),
    'predicted_amt': predictions,
    # ... other fields
})
output_df.to_parquet('predictions/forecast_2026.parquet')
```

## Next Steps

1. **Data Exploration**: Start with notebooks to understand patterns
2. **Feature Engineering**: Identify most predictive features
3. **Model Selection**: Test different algorithms
4. **Validation**: Use cross-validation for robust evaluation
5. **Deployment**: Integrate predictions into the dashboard
6. **Monitoring**: Track model performance over time

## Notes

- All outputs use Parquet format for consistency with existing pipeline
- Models are versioned with timestamps
- Feature engineering follows existing field naming conventions (lowercase)
- Predictions include confidence intervals where applicable
- Anomaly detection uses configurable thresholds
