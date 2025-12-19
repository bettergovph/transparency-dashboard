#!/usr/bin/env python3
"""
Train Budget Forecasting Model

Train a model to predict future budget allocations based on historical patterns.
Supports multiple algorithms: Linear Regression, Random Forest, XGBoost.

Usage:
    python train_forecast_model.py --features ../features/budget_features.parquet --output ../models/
"""

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime

import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb


def prepare_features_for_forecast(df: pd.DataFrame, target_col: str = 'amt') -> tuple:
    """Prepare features and target for forecasting."""
    
    # Select relevant features for forecasting
    feature_cols = [
        'years_since_start',
        'yoy_growth_rate',
        'dept_share_of_total',
        'agency_share_of_dept',
        'amt_lag_1', 'amt_lag_2', 'amt_lag_3',
        'amt_rolling_mean_2y', 'amt_rolling_mean_3y',
        'amt_rolling_std_2y', 'amt_rolling_std_3y',
        'department_encoded', 'agency_encoded',
        'uacs_exp_cd_encoded', 'fundcd_encoded'
    ]
    
    # Filter to only include rows with complete data (no NaN in lags)
    df_complete = df.dropna(subset=['amt_lag_1', 'amt_lag_2', 'amt_lag_3'])
    
    # Select features that exist in the dataframe
    available_features = [col for col in feature_cols if col in df_complete.columns]
    
    X = df_complete[available_features]
    y = df_complete[target_col]
    
    return X, y, available_features


def train_linear_model(X_train, y_train, X_test, y_test):
    """Train Linear Regression model."""
    
    print("\nTraining Linear Regression...")
    model = LinearRegression()
    model.fit(X_train, y_train)
    
    # Predictions
    y_pred_train = model.predict(X_train)
    y_pred_test = model.predict(X_test)
    
    # Metrics
    metrics = {
        'train_mae': mean_absolute_error(y_train, y_pred_train),
        'train_rmse': np.sqrt(mean_squared_error(y_train, y_pred_train)),
        'train_r2': r2_score(y_train, y_pred_train),
        'test_mae': mean_absolute_error(y_test, y_pred_test),
        'test_rmse': np.sqrt(mean_squared_error(y_test, y_pred_test)),
        'test_r2': r2_score(y_test, y_pred_test)
    }
    
    return model, metrics


def train_random_forest(X_train, y_train, X_test, y_test):
    """Train Random Forest model."""
    
    print("\nTraining Random Forest...")
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    
    # Predictions
    y_pred_train = model.predict(X_train)
    y_pred_test = model.predict(X_test)
    
    # Metrics
    metrics = {
        'train_mae': mean_absolute_error(y_train, y_pred_train),
        'train_rmse': np.sqrt(mean_squared_error(y_train, y_pred_train)),
        'train_r2': r2_score(y_train, y_pred_train),
        'test_mae': mean_absolute_error(y_test, y_pred_test),
        'test_rmse': np.sqrt(mean_squared_error(y_test, y_pred_test)),
        'test_r2': r2_score(y_test, y_pred_test)
    }
    
    return model, metrics


def train_xgboost(X_train, y_train, X_test, y_test):
    """Train XGBoost model."""
    
    print("\nTraining XGBoost...")
    model = xgb.XGBRegressor(
        n_estimators=200,
        max_depth=8,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    
    # Predictions
    y_pred_train = model.predict(X_train)
    y_pred_test = model.predict(X_test)
    
    # Metrics
    metrics = {
        'train_mae': mean_absolute_error(y_train, y_pred_train),
        'train_rmse': np.sqrt(mean_squared_error(y_train, y_pred_train)),
        'train_r2': r2_score(y_train, y_pred_train),
        'test_mae': mean_absolute_error(y_test, y_pred_test),
        'test_rmse': np.sqrt(mean_squared_error(y_test, y_pred_test)),
        'test_r2': r2_score(y_test, y_pred_test)
    }
    
    return model, metrics


def print_metrics(model_name: str, metrics: dict):
    """Pretty print model metrics."""
    
    print(f"\n{model_name} Performance:")
    print(f"  Train MAE:  {metrics['train_mae']:,.2f}")
    print(f"  Train RMSE: {metrics['train_rmse']:,.2f}")
    print(f"  Train R²:   {metrics['train_r2']:.4f}")
    print(f"  Test MAE:   {metrics['test_mae']:,.2f}")
    print(f"  Test RMSE:  {metrics['test_rmse']:,.2f}")
    print(f"  Test R²:    {metrics['test_r2']:.4f}")


def main():
    parser = argparse.ArgumentParser(description='Train budget forecasting model')
    parser.add_argument('--features', required=True, help='Input features Parquet file')
    parser.add_argument('--output', required=True, help='Output directory for models')
    parser.add_argument('--algorithm', default='xgboost', 
                        choices=['linear', 'random_forest', 'xgboost', 'all'],
                        help='Algorithm to use (default: xgboost)')
    parser.add_argument('--test-size', type=float, default=0.2, help='Test set size (default: 0.2)')
    
    args = parser.parse_args()
    
    print(f"Loading features from {args.features}...")
    df = pd.read_parquet(args.features)
    
    print(f"Data shape: {df.shape}")
    
    # Prepare features
    print("\nPreparing features for forecasting...")
    X, y, feature_names = prepare_features_for_forecast(df)
    
    print(f"Features shape: {X.shape}")
    print(f"Target shape: {y.shape}")
    print(f"Using features: {feature_names}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=args.test_size, random_state=42
    )
    
    print(f"\nTrain set: {X_train.shape[0]} samples")
    print(f"Test set: {X_test.shape[0]} samples")
    
    # Scale features
    print("\nScaling features...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train models
    models = {}
    all_metrics = {}
    
    if args.algorithm in ['linear', 'all']:
        model, metrics = train_linear_model(X_train_scaled, y_train, X_test_scaled, y_test)
        models['linear'] = model
        all_metrics['linear'] = metrics
        print_metrics('Linear Regression', metrics)
    
    if args.algorithm in ['random_forest', 'all']:
        model, metrics = train_random_forest(X_train, y_train, X_test, y_test)
        models['random_forest'] = model
        all_metrics['random_forest'] = metrics
        print_metrics('Random Forest', metrics)
    
    if args.algorithm in ['xgboost', 'all']:
        model, metrics = train_xgboost(X_train, y_train, X_test, y_test)
        models['xgboost'] = model
        all_metrics['xgboost'] = metrics
        print_metrics('XGBoost', metrics)
    
    # Select best model based on test R²
    best_model_name = max(all_metrics.keys(), key=lambda k: all_metrics[k]['test_r2'])
    best_model = models[best_model_name]
    
    print(f"\n✓ Best model: {best_model_name} (Test R² = {all_metrics[best_model_name]['test_r2']:.4f})")
    
    # Save models and metadata
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save best model
    model_path = output_dir / 'forecast_model.pkl'
    joblib.dump(best_model, model_path)
    print(f"\nSaved best model to {model_path}")
    
    # Save scaler
    scaler_path = output_dir / 'feature_scaler.pkl'
    joblib.dump(scaler, scaler_path)
    print(f"Saved scaler to {scaler_path}")
    
    # Save metadata
    metadata = {
        'model_type': best_model_name,
        'training_date': datetime.now().isoformat(),
        'features': feature_names,
        'test_size': args.test_size,
        'metrics': all_metrics,
        'data_shape': {
            'train_samples': len(X_train),
            'test_samples': len(X_test),
            'n_features': len(feature_names)
        }
    }
    
    metadata_path = output_dir / 'forecast_model_metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to {metadata_path}")
    
    print("\n✓ Training complete!")


if __name__ == '__main__':
    main()
