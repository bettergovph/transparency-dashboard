# Quick Start Guide - GAA Budget ML

Get started with budget machine learning in 5 minutes!

## Prerequisites

1. **Install Python dependencies:**
   ```bash
   cd data/gaa/ml
   pip install -r requirements.txt
   ```

2. **Ensure you have the GAA Parquet file:**
   ```bash
   # Should exist: data/gaa/gaa.parquet
   # If not, run: python ../gaa_csv_to_parquet.py
   ```

## Usage

### Option 1: Run Complete Pipeline (Recommended)

Run everything with one command:

```bash
./run_ml_pipeline.sh
```

This will:
1. ✓ Engineer features from budget data
2. ✓ Train forecasting model (XGBoost)
3. ✓ Train anomaly detection model (Isolation Forest)
4. ✓ Generate predictions and save to Parquet files

**Outputs:**
- `features/budget_features.parquet` - ML-ready features
- `models/*.pkl` - Trained models
- `predictions/*.parquet` - Forecast & anomaly results

### Option 2: Run Individual Steps

**Step 1: Feature Engineering**
```bash
python features/feature_engineering.py \
  --input ../gaa.parquet \
  --output features/budget_features.parquet
```

**Step 2: Train Forecast Model**
```bash
python training/train_forecast_model.py \
  --features features/budget_features.parquet \
  --output models/ \
  --algorithm xgboost
```

**Step 3: Train Anomaly Detector**
```bash
python training/train_anomaly_model.py \
  --features features/budget_features.parquet \
  --output models/
```

**Step 4: Train Clustering Model** (Optional)
```bash
python training/train_clustering_model.py \
  --features features/budget_features.parquet \
  --output models/ \
  --n-clusters 5
```

**Step 5: Generate Predictions**
```bash
python training/generate_predictions.py \
  --input ../gaa.parquet \
  --models models/ \
  --output predictions/
```

### Option 3: Interactive Exploration

Use Jupyter notebook for interactive analysis:

```bash
jupyter notebook notebooks/quick_start.ipynb
```

## Output Files

All predictions are saved as **Parquet files** in the `predictions/` directory:

### Budget Forecasts
**File:** `predictions/budget_forecast_YYYY_YYYYMMDD.parquet`

**Schema:**
```
- year: int                    (predicted year)
- department: str
- agency: str
- predicted_amt: float         (predicted budget amount)
- confidence_lower: float      (95% CI lower bound)
- confidence_upper: float      (95% CI upper bound)
- model_version: str
- prediction_date: timestamp
```

### Anomalies
**File:** `predictions/anomalies_YYYYMMDD.parquet`

**Schema:**
```
- id: int                      (from original data)
- year: int
- department: str
- agency: str
- amt: float                   (actual amount)
- anomaly_score: float         (lower = more anomalous)
- z_score: float               (statistical deviation)
- anomaly_type: str            (classification)
- is_anomaly: bool
- detection_date: timestamp
```

### Spending Clusters
**File:** `predictions/spending_clusters_YYYYMMDD.parquet`

**Schema:**
```
- entity_id: str               (department/agency ID)
- entity_desc: str
- cluster_id: int
- cluster_label: str           (meaningful name)
- amt_sum: float               (total historical budget)
- yoy_growth_rate_mean: float
- pca_1, pca_2: float          (for visualization)
- analysis_date: timestamp
```

## Reading Predictions

### Python
```python
import pandas as pd

# Load forecast
forecast = pd.read_parquet('predictions/budget_forecast_2026_20241219.parquet')
print(f"Total predicted: ₱{forecast['predicted_amt'].sum():,.2f}")

# Load anomalies
anomalies = pd.read_parquet('predictions/anomalies_20241219.parquet')
print(f"Found {len(anomalies)} anomalies")
```

### DuckDB (for SQL analysis)
```sql
-- Load predictions in DuckDB
SELECT * FROM read_parquet('predictions/*.parquet');

-- Top predicted departments
SELECT department, SUM(predicted_amt) as total
FROM read_parquet('predictions/budget_forecast_*.parquet')
GROUP BY department
ORDER BY total DESC
LIMIT 10;
```

## Model Performance

After training, check the model metadata:

```bash
cat models/forecast_model_metadata.json
cat models/anomaly_model_metadata.json
```

**Key metrics:**
- `test_r2`: Coefficient of determination (higher is better, max 1.0)
- `test_mae`: Mean Absolute Error in pesos
- `test_rmse`: Root Mean Squared Error

## Customization

### Change forecast algorithm
```bash
./run_ml_pipeline.sh --forecast-only
# Or edit run_ml_pipeline.sh to use 'random_forest' or 'linear'
```

### Adjust anomaly sensitivity
```bash
python training/train_anomaly_model.py \
  --contamination 0.1  # Expect 10% anomalies (default: 5%)
```

### Different clustering granularity
```bash
python training/train_clustering_model.py \
  --entity-level department  # Cluster departments instead of agencies
  --n-clusters 8             # More clusters
```

## Troubleshooting

**Problem:** "ModuleNotFoundError: No module named 'sklearn'"
```bash
# Solution: Install dependencies
pip install -r requirements.txt
```

**Problem:** "FileNotFoundError: gaa.parquet not found"
```bash
# Solution: Generate the Parquet file first
cd ..
python gaa_csv_to_parquet.py --csv-dir data --output gaa.parquet
```

**Problem:** Poor model performance (low R²)
- Try different algorithms (`--algorithm random_forest`)
- Add more historical data years
- Check for data quality issues
- Increase training data (reduce `--test-size`)

## Next Steps

1. **Integrate with Dashboard**: Use the Parquet predictions in your React app
2. **Automate**: Set up cron jobs to retrain models periodically
3. **Visualize**: Create charts showing forecasts vs actuals
4. **Alert**: Set up notifications for detected anomalies
5. **Experiment**: Try different features in `feature_engineering.py`

## Support

- See [README.md](README.md) for detailed documentation
- Check model metadata JSON files for performance details
- Review Jupyter notebook for interactive examples

---

**Happy ML! 🚀**
