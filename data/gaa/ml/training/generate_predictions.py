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
    
    # Prepare features
    X = df_latest[feature_names].copy()
    
    # Fill any missing values
    X = X.fillna(0)
    
    # Scale if scaler is provided
    if scaler is not None:
        X_scaled = scaler.transform(X)
    else:
        X_scaled = X.values
    
    # Generate predictions
    predictions = model.predict(X_scaled)
    
    # Calculate confidence intervals (simple approach using historical std)
    historical_std = df.groupby(['department', 'agency'])['amt'].std().mean()
    confidence_interval = 1.96 * historical_std  # 95% CI
    
    # Create output dataframe
    forecast_df = df_latest[['department', 'agency', 'uacs_dpt_dsc', 'uacs_agy_dsc']].copy()
    forecast_df['year'] = forecast_year
    forecast_df['predicted_amt'] = predictions
    forecast_df['confidence_lower'] = predictions - confidence_interval
    forecast_df['confidence_upper'] = predictions + confidence_interval
    forecast_df['model_version'] = metadata.get('model_type', 'unknown')
    forecast_df['prediction_date'] = datetime.now().isoformat()
    
    # Ensure non-negative predictions
    forecast_df['predicted_amt'] = forecast_df['predicted_amt'].clip(lower=0)
    forecast_df['confidence_lower'] = forecast_df['confidence_lower'].clip(lower=0)
    
    print(f"  Generated {len(forecast_df)} predictions")
    print(f"  Total predicted budget: {forecast_df['predicted_amt'].sum():,.2f}")
    
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
