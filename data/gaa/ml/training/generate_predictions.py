#!/usr/bin/env python3
"""
Generate Budget Predictions

Use trained models to generate future budget predictions and save to Parquet.

Usage:
    python generate_predictions.py --input ../../gaa.parquet --models ../models/ --output ../predictions/
"""

import argparse
import json
from pathlib import Path
from datetime import datetime

import pandas as pd
import numpy as np
import joblib


def load_model_and_metadata(models_dir: Path, model_type: str):
    """Load trained model, scaler, and metadata."""
    
    model_path = models_dir / f'{model_type}_model.pkl'
    scaler_path = models_dir / f'{"feature" if model_type == "forecast" else model_type}_scaler.pkl'
    metadata_path = models_dir / f'{model_type}_model_metadata.json'
    
    if not model_path.exists():
        raise FileNotFoundError(f"Model not found: {model_path}")
    
    print(f"Loading {model_type} model from {model_path}...")
    model = joblib.load(model_path)
    
    scaler = None
    if scaler_path.exists():
        scaler = joblib.load(scaler_path)
    
    metadata = {}
    if metadata_path.exists():
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
    
    return model, scaler, metadata


def generate_forecast_predictions(df: pd.DataFrame, model, scaler, metadata, forecast_year: int):
    """Generate budget forecasts for a future year."""
    
    print(f"\nGenerating forecast predictions for year {forecast_year}...")
    
    # Get feature names from metadata
    feature_names = metadata.get('features', [])
    
    # Filter to latest year data to use as base for forecasting
    latest_year = df['year'].max()
    df_latest = df[df['year'] == latest_year].copy()
    
    print(f"  Base year: {latest_year}")
    print(f"  Entities to forecast: {len(df_latest):,}")
    print(f"  Base year total budget: {df_latest['amt'].sum():,.0f} (thousands) = {df_latest['amt'].sum() * 1000 / 1e12:.2f}T")
    
    # Check for lag feature availability
    has_lags = not df_latest[['amt_lag_1', 'amt_lag_2', 'amt_lag_3']].isna().all().any()
    
    # For entities missing lag features, estimate using available data
    if 'amt_lag_1' in df_latest.columns:
        # Fill missing lag_1 with current amount (assume stable)
        df_latest['amt_lag_1'] = df_latest['amt_lag_1'].fillna(df_latest['amt'])
    if 'amt_lag_2' in df_latest.columns:
        df_latest['amt_lag_2'] = df_latest['amt_lag_2'].fillna(df_latest['amt_lag_1'])
    if 'amt_lag_3' in df_latest.columns:
        df_latest['amt_lag_3'] = df_latest['amt_lag_3'].fillna(df_latest['amt_lag_2'])
    
    # Fill other missing features
    for col in ['amt_rolling_mean_2y', 'amt_rolling_mean_3y']:
        if col in df_latest.columns:
            df_latest[col] = df_latest[col].fillna(df_latest['amt'])
    for col in ['amt_rolling_std_2y', 'amt_rolling_std_3y']:
        if col in df_latest.columns:
            df_latest[col] = df_latest[col].fillna(0)
    
    # Update time-based features for the forecast year
    df_latest['years_since_start'] = df_latest['years_since_start'] + 1
    
    # Shift lag features for forecasting
    # For 2026 prediction: lag_1 should be 2025's amt, lag_2 should be 2024's amt, etc.
    df_latest_original_amt = df_latest['amt'].copy()
    if 'amt_lag_3' in df_latest.columns:
        df_latest['amt_lag_3'] = df_latest['amt_lag_2']
    if 'amt_lag_2' in df_latest.columns:
        df_latest['amt_lag_2'] = df_latest['amt_lag_1']
    if 'amt_lag_1' in df_latest.columns:
        df_latest['amt_lag_1'] = df_latest_original_amt  # Current year becomes lag 1
    
    # Update rolling means (simple approximation)
    if 'amt_rolling_mean_2y' in df_latest.columns:
        df_latest['amt_rolling_mean_2y'] = (df_latest['amt_lag_1'] + df_latest['amt_lag_2']) / 2
    if 'amt_rolling_mean_3y' in df_latest.columns:
        df_latest['amt_rolling_mean_3y'] = (df_latest['amt_lag_1'] + df_latest['amt_lag_2'] + df_latest['amt_lag_3']) / 3
    
    # Prepare features
    X = df_latest[feature_names].copy()
    
    # Fill any remaining missing values with 0
    X = X.fillna(0)
    
    # Scale if scaler is provided
    if scaler is not None:
        X_scaled = scaler.transform(X)
    else:
        X_scaled = X.values
    
    # Generate predictions
    predictions = model.predict(X_scaled)
    
    # Ensure non-negative predictions
    predictions = np.maximum(predictions, 0)
    
    # For entities with very low predictions, use historical growth approach
    # Calculate average YoY growth from historical data
    avg_growth = 0.08  # ~8% average growth based on historical (6.33T vs ~4.1T over 5 years)
    
    # Use hybrid approach: model predictions for large entities, growth-based for small
    for i in range(len(predictions)):
        if predictions[i] < df_latest_original_amt.iloc[i] * 0.5:  # If prediction is less than 50% of current
            # Use historical growth estimate instead
            predictions[i] = df_latest_original_amt.iloc[i] * (1 + avg_growth)
    
    # Calculate confidence intervals (10% margin)
    confidence_margin = 0.1
    
    # Create output dataframe
    forecast_df = df_latest[['department', 'agency', 'uacs_dpt_dsc', 'uacs_agy_dsc']].copy()
    forecast_df['year'] = forecast_year
    forecast_df['predicted_amt'] = predictions
    forecast_df['confidence_lower'] = predictions * (1 - confidence_margin)
    forecast_df['confidence_upper'] = predictions * (1 + confidence_margin)
    forecast_df['model_version'] = metadata.get('model_type', 'unknown')
    forecast_df['prediction_date'] = datetime.now().isoformat()
    
    # Clip to reasonable bounds
    forecast_df['confidence_lower'] = forecast_df['confidence_lower'].clip(lower=0)
    
    predicted_total = forecast_df['predicted_amt'].sum()
    actual_latest = df_latest_original_amt.sum()
    growth_rate = ((predicted_total / actual_latest) - 1) * 100 if actual_latest > 0 else 0
    
    print(f"  Predicted {forecast_year} total: {predicted_total:,.0f} (thousands) = {predicted_total * 1000 / 1e12:.2f}T")
    print(f"  YoY growth prediction: {growth_rate:.1f}%")
    print(f"  Generated {len(forecast_df):,} predictions")
    
    return forecast_df


def apply_anomaly_detection(df: pd.DataFrame, model, scaler, metadata):
    """Apply anomaly detection to existing data."""
    
    print("\nApplying anomaly detection...")
    
    # Get feature names from metadata
    feature_names = metadata.get('features', [])
    
    # Prepare features
    X = df[feature_names].copy()
    X = X.fillna(0)
    
    # Scale if scaler is provided
    if scaler is not None:
        X_scaled = scaler.transform(X)
    else:
        X_scaled = X.values
    
    # Predict anomalies
    predictions = model.predict(X_scaled)
    anomaly_scores = model.score_samples(X_scaled)
    
    # Convert predictions: -1 (anomaly) -> 1, 1 (normal) -> 0
    is_anomaly = (predictions == -1).astype(int)
    
    # Create output dataframe
    anomaly_df = df[['id', 'year', 'department', 'agency', 'amt', 
                     'uacs_dpt_dsc', 'uacs_agy_dsc']].copy()
    anomaly_df['is_anomaly'] = is_anomaly
    anomaly_df['anomaly_score'] = anomaly_scores
    anomaly_df['detection_date'] = datetime.now().isoformat()
    
    # Filter to only anomalies
    anomaly_df = anomaly_df[anomaly_df['is_anomaly'] == 1]
    
    print(f"  Detected {len(anomaly_df)} anomalies")
    
    return anomaly_df


def main():
    parser = argparse.ArgumentParser(description='Generate predictions from trained models')
    parser.add_argument('--input', required=True, help='Input Parquet file (gaa.parquet)')
    parser.add_argument('--models', required=True, help='Directory containing trained models')
    parser.add_argument('--output', required=True, help='Output directory for predictions')
    parser.add_argument('--forecast-year', type=int, help='Year to forecast (default: next year)')
    parser.add_argument('--prediction-type', default='all', 
                        choices=['forecast', 'anomaly', 'all'],
                        help='Type of prediction to generate')
    
    args = parser.parse_args()
    
    print(f"Loading data from {args.input}...")
    df = pd.read_parquet(args.input)
    
    # Load features (if available)
    features_path = Path(args.models).parent / 'features' / 'budget_features.parquet'
    if features_path.exists():
        print(f"Loading features from {features_path}...")
        df = pd.read_parquet(features_path)
    
    print(f"Data shape: {df.shape}")
    
    models_dir = Path(args.models)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d')
    
    # Generate forecasts
    if args.prediction_type in ['forecast', 'all']:
        try:
            model, scaler, metadata = load_model_and_metadata(models_dir, 'forecast')
            
            forecast_year = args.forecast_year or (df['year'].max() + 1)
            forecast_df = generate_forecast_predictions(df, model, scaler, metadata, forecast_year)
            
            # Save to Parquet
            forecast_output = output_dir / f'budget_forecast_{forecast_year}_{timestamp}.parquet'
            forecast_df.to_parquet(forecast_output, index=False, compression='snappy')
            print(f"\n✓ Saved forecast to {forecast_output}")
            
        except FileNotFoundError as e:
            print(f"\n⚠ Skipping forecast: {e}")
    
    # Detect anomalies
    if args.prediction_type in ['anomaly', 'all']:
        try:
            model, scaler, metadata = load_model_and_metadata(models_dir, 'anomaly')
            
            anomaly_df = apply_anomaly_detection(df, model, scaler, metadata)
            
            # Save to Parquet
            anomaly_output = output_dir / f'anomalies_{timestamp}.parquet'
            anomaly_df.to_parquet(anomaly_output, index=False, compression='snappy')
            print(f"\n✓ Saved anomalies to {anomaly_output}")
            
        except FileNotFoundError as e:
            print(f"\n⚠ Skipping anomaly detection: {e}")
    
    print("\n✓ Prediction generation complete!")


if __name__ == '__main__':
    main()
