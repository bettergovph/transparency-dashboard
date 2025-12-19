#!/usr/bin/env python3
"""
Train Anomaly Detection Model

Detect unusual budget allocations using Isolation Forest and statistical methods.

Usage:
    python train_anomaly_model.py --features ../features/budget_features.parquet --output ../models/
"""

import argparse
import json
from pathlib import Path
from datetime import datetime

import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


def prepare_features_for_anomaly(df: pd.DataFrame) -> tuple:
    """Prepare features for anomaly detection."""
    
    # Select features relevant for anomaly detection
    feature_cols = [
        'amt',
        'yoy_growth_rate',
        'dept_share_of_total',
        'agency_share_of_dept',
        'amt_rolling_mean_2y',
        'amt_rolling_std_2y',
        'outlier_score'
    ]
    
    # Remove rows with NaN values
    df_complete = df.dropna(subset=feature_cols)
    
    # Select available features
    available_features = [col for col in feature_cols if col in df_complete.columns]
    
    X = df_complete[available_features]
    
    return X, df_complete, available_features


def train_isolation_forest(X, contamination=0.05):
    """Train Isolation Forest for anomaly detection."""
    
    print(f"\nTraining Isolation Forest (contamination={contamination})...")
    
    model = IsolationForest(
        n_estimators=100,
        contamination=contamination,
        random_state=42,
        n_jobs=-1
    )
    
    # Fit and predict
    predictions = model.fit_predict(X)
    anomaly_scores = model.score_samples(X)
    
    # Convert predictions: -1 (anomaly) -> 1, 1 (normal) -> 0
    is_anomaly = (predictions == -1).astype(int)
    
    n_anomalies = is_anomaly.sum()
    pct_anomalies = (n_anomalies / len(is_anomaly)) * 100
    
    print(f"  Detected {n_anomalies} anomalies ({pct_anomalies:.2f}%)")
    
    return model, is_anomaly, anomaly_scores


def calculate_statistical_anomalies(df: pd.DataFrame, threshold=3.0):
    """Calculate statistical anomalies using Z-score method."""
    
    print(f"\nCalculating statistical anomalies (threshold={threshold} std)...")
    
    # Calculate z-scores for amount within each department-year group
    df['z_score'] = df.groupby(['department', 'year'])['amt'].transform(
        lambda x: np.abs((x - x.mean()) / x.std()) if x.std() > 0 else 0
    )
    
    # Flag as statistical anomaly if z-score exceeds threshold
    statistical_anomaly = (df['z_score'] > threshold).astype(int)
    
    n_statistical = statistical_anomaly.sum()
    pct_statistical = (n_statistical / len(statistical_anomaly)) * 100
    
    print(f"  Found {n_statistical} statistical anomalies ({pct_statistical:.2f}%)")
    
    return statistical_anomaly, df['z_score']


def classify_anomaly_type(row):
    """Classify type of anomaly based on characteristics."""
    
    if row['yoy_growth_rate'] > 100:
        return 'high_growth'
    elif row['yoy_growth_rate'] < -50:
        return 'decline'
    elif row['amt'] > row['amt_rolling_mean_3y'] * 2:
        return 'spending_spike'
    elif row['dept_share_of_total'] > 10:
        return 'high_concentration'
    else:
        return 'other'


def main():
    parser = argparse.ArgumentParser(description='Train anomaly detection model')
    parser.add_argument('--features', required=True, help='Input features Parquet file')
    parser.add_argument('--output', required=True, help='Output directory for models')
    parser.add_argument('--contamination', type=float, default=0.05, 
                        help='Expected proportion of anomalies (default: 0.05)')
    parser.add_argument('--z-threshold', type=float, default=3.0,
                        help='Z-score threshold for statistical anomalies (default: 3.0)')
    
    args = parser.parse_args()
    
    print(f"Loading features from {args.features}...")
    df = pd.read_parquet(args.features)
    
    print(f"Data shape: {df.shape}")
    
    # Prepare features
    print("\nPreparing features for anomaly detection...")
    X, df_complete, feature_names = prepare_features_for_anomaly(df)
    
    print(f"Features shape: {X.shape}")
    print(f"Using features: {feature_names}")
    
    # Scale features for Isolation Forest
    print("\nScaling features...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train Isolation Forest
    iso_model, ml_anomaly, anomaly_scores = train_isolation_forest(
        X_scaled, contamination=args.contamination
    )
    
    # Calculate statistical anomalies
    statistical_anomaly, z_scores = calculate_statistical_anomalies(
        df_complete, threshold=args.z_threshold
    )
    
    # Combine both methods: flag as anomaly if either method detects it
    combined_anomaly = ((ml_anomaly == 1) | (statistical_anomaly == 1)).astype(int)
    
    n_combined = combined_anomaly.sum()
    pct_combined = (n_combined / len(combined_anomaly)) * 100
    
    print(f"\n✓ Combined anomaly detection:")
    print(f"  Total anomalies: {n_combined} ({pct_combined:.2f}%)")
    
    # Classify anomaly types
    print("\nClassifying anomaly types...")
    df_complete['anomaly_type'] = df_complete.apply(classify_anomaly_type, axis=1)
    
    # Create output dataframe with anomaly information
    anomaly_df = df_complete.copy()
    anomaly_df['ml_anomaly'] = ml_anomaly
    anomaly_df['statistical_anomaly'] = statistical_anomaly
    anomaly_df['is_anomaly'] = combined_anomaly
    anomaly_df['anomaly_score'] = anomaly_scores
    anomaly_df['z_score'] = z_scores
    anomaly_df['detection_date'] = datetime.now().isoformat()
    
    # Show anomaly type distribution
    if n_combined > 0:
        anomaly_types = anomaly_df[anomaly_df['is_anomaly'] == 1]['anomaly_type'].value_counts()
        print("\nAnomaly types detected:")
        for atype, count in anomaly_types.items():
            print(f"  {atype}: {count}")
    
    # Save model and outputs
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save Isolation Forest model
    model_path = output_dir / 'anomaly_model.pkl'
    joblib.dump(iso_model, model_path)
    print(f"\nSaved model to {model_path}")
    
    # Save scaler
    scaler_path = output_dir / 'anomaly_scaler.pkl'
    joblib.dump(scaler, scaler_path)
    print(f"Saved scaler to {scaler_path}")
    
    # Save metadata
    metadata = {
        'model_type': 'isolation_forest',
        'training_date': datetime.now().isoformat(),
        'features': feature_names,
        'contamination': args.contamination,
        'z_threshold': args.z_threshold,
        'statistics': {
            'total_samples': len(df_complete),
            'ml_anomalies': int(ml_anomaly.sum()),
            'statistical_anomalies': int(statistical_anomaly.sum()),
            'combined_anomalies': int(n_combined),
            'anomaly_rate': float(pct_combined)
        }
    }
    
    metadata_path = output_dir / 'anomaly_model_metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to {metadata_path}")
    
    # Save anomaly predictions to predictions directory
    predictions_dir = output_dir.parent / 'predictions'
    predictions_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d')
    anomaly_output = predictions_dir / f'anomalies_{timestamp}.parquet'
    
    # Select only anomalies for output
    anomaly_results = anomaly_df[anomaly_df['is_anomaly'] == 1].copy()
    
    # Select relevant columns for output
    output_cols = [
        'id', 'year', 'department', 'agency', 'amt',
        'anomaly_score', 'z_score', 'anomaly_type',
        'is_anomaly', 'ml_anomaly', 'statistical_anomaly',
        'yoy_growth_rate', 'dept_share_of_total',
        'detection_date'
    ]
    
    available_output_cols = [col for col in output_cols if col in anomaly_results.columns]
    anomaly_results = anomaly_results[available_output_cols]
    
    anomaly_results.to_parquet(anomaly_output, index=False, compression='snappy')
    print(f"Saved anomaly results to {anomaly_output}")
    
    print("\n✓ Anomaly detection training complete!")


if __name__ == '__main__':
    main()
