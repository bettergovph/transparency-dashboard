#!/usr/bin/env python3
"""
Evaluate Model Performance

Compare predictions against actual data to assess model accuracy.
Generates performance metrics and visualizations.

Usage:
    python evaluate_models.py --predictions ../predictions/ --actual ../../gaa.parquet
"""

import argparse
import json
from pathlib import Path
from datetime import datetime

import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def load_actual_data(parquet_path: Path) -> pd.DataFrame:
    """Load actual budget data."""
    
    print(f"Loading actual data from {parquet_path}...")
    df = pd.read_parquet(parquet_path)
    print(f"  Loaded {len(df)} records")
    print(f"  Years: {sorted(df['year'].unique())}")
    
    return df


def load_predictions(predictions_dir: Path, prediction_type: str):
    """Load prediction files from directory."""
    
    pattern = f"{prediction_type}_*.parquet"
    files = list(predictions_dir.glob(pattern))
    
    if not files:
        return None
    
    # Load most recent file
    latest_file = sorted(files)[-1]
    print(f"\nLoading {prediction_type} predictions from {latest_file.name}...")
    df = pd.read_parquet(latest_file)
    print(f"  Loaded {len(df)} predictions")
    
    return df


def evaluate_forecast(df_forecast: pd.DataFrame, df_actual: pd.DataFrame):
    """Evaluate budget forecast predictions."""
    
    print("\n" + "="*60)
    print("BUDGET FORECAST EVALUATION")
    print("="*60)
    
    # Get forecast year
    forecast_year = df_forecast['year'].iloc[0]
    print(f"\nForecast Year: {forecast_year}")
    
    # Check if actual data exists for forecast year
    df_actual_year = df_actual[df_actual['year'] == forecast_year]
    
    if len(df_actual_year) == 0:
        print(f"⚠ No actual data available for {forecast_year} - cannot evaluate accuracy")
        print(f"\nForecast Summary:")
        print(f"  Total Predicted Budget: ₱{df_forecast['predicted_amt'].sum():,.2f}")
        print(f"  Number of Predictions: {len(df_forecast)}")
        print(f"  Average Prediction: ₱{df_forecast['predicted_amt'].mean():,.2f}")
        print(f"  Median Prediction: ₱{df_forecast['predicted_amt'].median():,.2f}")
        
        # Top predicted departments
        print(f"\nTop 10 Predicted Departments:")
        top_depts = df_forecast.groupby('department')['predicted_amt'].sum().nlargest(10)
        for dept, amt in top_depts.items():
            print(f"  {dept}: ₱{amt:,.2f}")
        
        return None
    
    # Merge predictions with actual data
    print(f"\n✓ Actual data available for {forecast_year}")
    
    # Aggregate by department and agency for comparison
    forecast_agg = df_forecast.groupby(['department', 'agency'])['predicted_amt'].sum().reset_index()
    actual_agg = df_actual_year.groupby(['department', 'agency'])['amt'].sum().reset_index()
    
    # Merge
    comparison = forecast_agg.merge(
        actual_agg,
        on=['department', 'agency'],
        how='inner'
    )
    
    if len(comparison) == 0:
        print("⚠ No matching entities found between forecast and actual data")
        return None
    
    print(f"  Matched {len(comparison)} entities for comparison")
    
    # Calculate metrics
    y_true = comparison['amt'].values
    y_pred = comparison['predicted_amt'].values
    
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)
    
    # Calculate percentage errors
    mape = np.mean(np.abs((y_true - y_pred) / np.where(y_true != 0, y_true, 1))) * 100
    
    # Total budget comparison
    total_actual = y_true.sum()
    total_predicted = y_pred.sum()
    total_error = ((total_predicted - total_actual) / total_actual) * 100
    
    print("\n" + "-"*60)
    print("PERFORMANCE METRICS")
    print("-"*60)
    print(f"  Mean Absolute Error (MAE):     ₱{mae:,.2f}")
    print(f"  Root Mean Squared Error (RMSE): ₱{rmse:,.2f}")
    print(f"  R² Score:                       {r2:.4f}")
    print(f"  Mean Absolute Percentage Error: {mape:.2f}%")
    
    print("\n" + "-"*60)
    print("BUDGET TOTALS")
    print("-"*60)
    print(f"  Actual Total:    ₱{total_actual:,.2f}")
    print(f"  Predicted Total: ₱{total_predicted:,.2f}")
    print(f"  Total Error:     {total_error:+.2f}%")
    
    # Best and worst predictions
    comparison['error'] = comparison['predicted_amt'] - comparison['amt']
    comparison['abs_error'] = np.abs(comparison['error'])
    comparison['pct_error'] = (comparison['error'] / comparison['amt'].replace(0, np.nan)) * 100
    
    print("\n" + "-"*60)
    print("BEST PREDICTIONS (Lowest Absolute Error)")
    print("-"*60)
    best = comparison.nsmallest(5, 'abs_error')
    for _, row in best.iterrows():
        print(f"  {row['department']}/{row['agency']}: Error = ₱{row['error']:+,.2f} ({row['pct_error']:+.1f}%)")
    
    print("\n" + "-"*60)
    print("WORST PREDICTIONS (Highest Absolute Error)")
    print("-"*60)
    worst = comparison.nlargest(5, 'abs_error')
    for _, row in worst.iterrows():
        print(f"  {row['department']}/{row['agency']}: Error = ₱{row['error']:+,.2f} ({row['pct_error']:+.1f}%)")
    
    # Return metrics
    return {
        'forecast_year': int(forecast_year),
        'n_predictions': len(comparison),
        'mae': float(mae),
        'rmse': float(rmse),
        'r2': float(r2),
        'mape': float(mape),
        'total_actual': float(total_actual),
        'total_predicted': float(total_predicted),
        'total_error_pct': float(total_error)
    }


def evaluate_anomalies(df_anomalies: pd.DataFrame, df_actual: pd.DataFrame):
    """Evaluate anomaly detection results."""
    
    print("\n" + "="*60)
    print("ANOMALY DETECTION EVALUATION")
    print("="*60)
    
    print(f"\nTotal Anomalies Detected: {len(df_anomalies)}")
    
    # Anomaly distribution by year
    print("\nAnomalies by Year:")
    yearly_anomalies = df_anomalies.groupby('year').size()
    for year, count in yearly_anomalies.items():
        total_records = len(df_actual[df_actual['year'] == year])
        pct = (count / total_records) * 100 if total_records > 0 else 0
        print(f"  {year}: {count} ({pct:.2f}% of total)")
    
    # Anomaly types
    if 'anomaly_type' in df_anomalies.columns:
        print("\nAnomalies by Type:")
        type_counts = df_anomalies['anomaly_type'].value_counts()
        for atype, count in type_counts.items():
            pct = (count / len(df_anomalies)) * 100
            print(f"  {atype}: {count} ({pct:.1f}%)")
    
    # Top anomalous departments
    print("\nTop 10 Departments with Most Anomalies:")
    dept_anomalies = df_anomalies.groupby('department').size().nlargest(10)
    for dept, count in dept_anomalies.items():
        print(f"  {dept}: {count}")
    
    # Anomaly score distribution
    if 'anomaly_score' in df_anomalies.columns:
        print("\nAnomaly Score Statistics:")
        print(f"  Mean:   {df_anomalies['anomaly_score'].mean():.4f}")
        print(f"  Median: {df_anomalies['anomaly_score'].median():.4f}")
        print(f"  Min:    {df_anomalies['anomaly_score'].min():.4f}")
        print(f"  Max:    {df_anomalies['anomaly_score'].max():.4f}")
    
    return {
        'total_anomalies': len(df_anomalies),
        'years_covered': df_anomalies['year'].nunique(),
        'anomaly_types': df_anomalies['anomaly_type'].value_counts().to_dict() if 'anomaly_type' in df_anomalies.columns else {}
    }


def evaluate_clusters(df_clusters: pd.DataFrame):
    """Evaluate clustering results."""
    
    print("\n" + "="*60)
    print("CLUSTERING EVALUATION")
    print("="*60)
    
    print(f"\nTotal Entities Clustered: {len(df_clusters)}")
    print(f"Number of Clusters: {df_clusters['cluster_id'].nunique()}")
    
    # Cluster distribution
    print("\nCluster Distribution:")
    cluster_counts = df_clusters.groupby(['cluster_id', 'cluster_label']).size().reset_index(name='count')
    for _, row in cluster_counts.iterrows():
        pct = (row['count'] / len(df_clusters)) * 100
        print(f"  Cluster {row['cluster_id']} - {row['cluster_label']}: {row['count']} ({pct:.1f}%)")
    
    # Cluster statistics
    print("\nCluster Budget Statistics:")
    cluster_stats = df_clusters.groupby('cluster_label')['amt_sum'].agg(['mean', 'median', 'sum'])
    for label, stats in cluster_stats.iterrows():
        print(f"  {label}:")
        print(f"    Mean:   ₱{stats['mean']:,.2f}")
        print(f"    Median: ₱{stats['median']:,.2f}")
        print(f"    Total:  ₱{stats['sum']:,.2f}")
    
    return {
        'n_clusters': int(df_clusters['cluster_id'].nunique()),
        'n_entities': len(df_clusters),
        'cluster_sizes': df_clusters['cluster_id'].value_counts().to_dict()
    }


def main():
    parser = argparse.ArgumentParser(description='Evaluate ML model predictions')
    parser.add_argument('--predictions', required=True, help='Predictions directory')
    parser.add_argument('--actual', required=True, help='Actual data Parquet file')
    parser.add_argument('--output', help='Output file for evaluation report (JSON)')
    
    args = parser.parse_args()
    
    predictions_dir = Path(args.predictions)
    actual_path = Path(args.actual)
    
    if not predictions_dir.exists():
        print(f"Error: Predictions directory not found: {predictions_dir}")
        return 1
    
    if not actual_path.exists():
        print(f"Error: Actual data file not found: {actual_path}")
        return 1
    
    # Load actual data
    df_actual = load_actual_data(actual_path)
    
    # Evaluation results
    results = {
        'evaluation_date': datetime.now().isoformat(),
        'actual_data_file': str(actual_path),
        'predictions_directory': str(predictions_dir)
    }
    
    # Evaluate forecasts
    df_forecast = load_predictions(predictions_dir, 'budget_forecast')
    if df_forecast is not None:
        forecast_metrics = evaluate_forecast(df_forecast, df_actual)
        if forecast_metrics:
            results['forecast'] = forecast_metrics
    
    # Evaluate anomalies
    df_anomalies = load_predictions(predictions_dir, 'anomalies')
    if df_anomalies is not None:
        anomaly_metrics = evaluate_anomalies(df_anomalies, df_actual)
        results['anomalies'] = anomaly_metrics
    
    # Evaluate clusters
    df_clusters = load_predictions(predictions_dir, 'spending_clusters')
    if df_clusters is not None:
        cluster_metrics = evaluate_clusters(df_clusters)
        results['clusters'] = cluster_metrics
    
    # Save evaluation report
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n✓ Evaluation report saved to {output_path}")
    else:
        # Save to predictions directory by default
        timestamp = datetime.now().strftime('%Y%m%d')
        output_path = predictions_dir / f'evaluation_report_{timestamp}.json'
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n✓ Evaluation report saved to {output_path}")
    
    print("\n" + "="*60)
    print("EVALUATION COMPLETE")
    print("="*60)
    
    return 0


if __name__ == '__main__':
    exit(main())
