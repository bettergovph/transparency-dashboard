#!/bin/bash
# Complete ML Pipeline for GAA Budget Analysis
#
# This script runs the full machine learning workflow:
# 1. Feature engineering
# 2. Model training (forecast + anomaly detection)
# 3. Prediction generation
# 4. Output to Parquet files
#
# Usage:
#   ./run_ml_pipeline.sh
#   ./run_ml_pipeline.sh --forecast-only
#   ./run_ml_pipeline.sh --anomaly-only

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directories
ML_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GAA_DIR="$(dirname "$ML_DIR")"
INPUT_PARQUET="$GAA_DIR/gaa.parquet"
FEATURES_DIR="$ML_DIR/features"
MODELS_DIR="$ML_DIR/models"
PREDICTIONS_DIR="$ML_DIR/predictions"
TRAINING_DIR="$ML_DIR/training"

# Parse arguments
FORECAST_ONLY=false
ANOMALY_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --forecast-only)
            FORECAST_ONLY=true
            shift
            ;;
        --anomaly-only)
            ANOMALY_ONLY=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--forecast-only|--anomaly-only]"
            exit 1
            ;;
    esac
done

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}GAA Budget ML Pipeline${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if input file exists
if [ ! -f "$INPUT_PARQUET" ]; then
    echo -e "${RED}✗ Error: Input file not found: $INPUT_PARQUET${NC}"
    echo "Please run gaa_csv_to_parquet.py first to generate the Parquet file."
    exit 1
fi

echo -e "${YELLOW}Input:${NC} $INPUT_PARQUET"
echo ""

# Step 1: Feature Engineering
echo -e "${GREEN}[1/4] Feature Engineering${NC}"
echo "--------------------------------------"

FEATURES_OUTPUT="$FEATURES_DIR/budget_features.parquet"

if [ -f "$FEATURES_OUTPUT" ]; then
    echo "Features file already exists: $FEATURES_OUTPUT"
    read -p "Regenerate features? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        python3 "$FEATURES_DIR/feature_engineering.py" \
            --input "$INPUT_PARQUET" \
            --output "$FEATURES_OUTPUT"
    fi
else
    python3 "$FEATURES_DIR/feature_engineering.py" \
        --input "$INPUT_PARQUET" \
        --output "$FEATURES_OUTPUT"
fi

echo ""

# Step 2: Train Forecast Model
if [ "$ANOMALY_ONLY" = false ]; then
    echo -e "${GREEN}[2/4] Training Forecast Model${NC}"
    echo "--------------------------------------"
    
    python3 "$TRAINING_DIR/train_forecast_model.py" \
        --features "$FEATURES_OUTPUT" \
        --output "$MODELS_DIR" \
        --algorithm xgboost
    
    echo ""
fi

# Step 3: Train Anomaly Detection Model
if [ "$FORECAST_ONLY" = false ]; then
    echo -e "${GREEN}[3/4] Training Anomaly Detection Model${NC}"
    echo "--------------------------------------"
    
    python3 "$TRAINING_DIR/train_anomaly_model.py" \
        --features "$FEATURES_OUTPUT" \
        --output "$MODELS_DIR" \
        --contamination 0.05
    
    echo ""
fi

# Step 4: Generate Predictions
echo -e "${GREEN}[4/4] Generating Predictions${NC}"
echo "--------------------------------------"

PREDICTION_TYPE="all"
if [ "$FORECAST_ONLY" = true ]; then
    PREDICTION_TYPE="forecast"
elif [ "$ANOMALY_ONLY" = true ]; then
    PREDICTION_TYPE="anomaly"
fi

python3 "$TRAINING_DIR/generate_predictions.py" \
    --input "$INPUT_PARQUET" \
    --models "$MODELS_DIR" \
    --output "$PREDICTIONS_DIR" \
    --prediction-type "$PREDICTION_TYPE"

echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Pipeline Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Outputs:${NC}"
echo "  Features:    $FEATURES_OUTPUT"
echo "  Models:      $MODELS_DIR/"
echo "  Predictions: $PREDICTIONS_DIR/"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Review prediction results in $PREDICTIONS_DIR/"
echo "  2. Evaluate model performance with evaluate_models.py"
echo "  3. Integrate predictions into the dashboard"
echo ""
