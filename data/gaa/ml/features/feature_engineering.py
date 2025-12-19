#!/usr/bin/env python3
"""
Feature Engineering for GAA Budget Data

This script transforms raw budget data into ML-ready features including:
- Time-based features (trends, seasonality)
- Aggregated statistics (department/agency totals)
- Year-over-year growth rates
- Categorical encodings
- Historical patterns

Usage:
    python feature_engineering.py --input ../../gaa.parquet --output budget_features.parquet
"""

import argparse
import sys
from pathlib import Path
from datetime import datetime

import pandas as pd
import numpy as np


def extract_time_features(df: pd.DataFrame) -> pd.DataFrame:
    """Extract time-based features from year column."""
    
    # Sort by year for proper time series operations
    df = df.sort_values('year')
    
    # Years since first record
    df['years_since_start'] = df['year'] - df['year'].min()
    
    # Binary indicators for specific years
    df['is_latest_year'] = (df['year'] == df['year'].max()).astype(int)
    
    return df


def calculate_growth_rates(df: pd.DataFrame, group_cols: list) -> pd.DataFrame:
    """Calculate year-over-year growth rates for each entity."""
    
    # Sort by group and year
    df = df.sort_values(group_cols + ['year'])
    
    # Calculate YoY change
    df['amt_previous_year'] = df.groupby(group_cols)['amt'].shift(1)
    df['yoy_change'] = df['amt'] - df['amt_previous_year']
    df['yoy_growth_rate'] = (df['yoy_change'] / df['amt_previous_year'].replace(0, np.nan)) * 100
    
    # Fill NaN for first year entries
    df['yoy_growth_rate'] = df['yoy_growth_rate'].fillna(0)
    
    return df


def calculate_entity_statistics(df: pd.DataFrame, entity_col: str, prefix: str) -> pd.DataFrame:
    """Calculate aggregate statistics per entity (department/agency)."""
    
    # Historical totals
    entity_totals = df.groupby(entity_col).agg({
        'amt': ['sum', 'mean', 'std', 'count'],
        'year': ['min', 'max']
    }).reset_index()
    
    entity_totals.columns = [
        entity_col,
        f'{prefix}_total_amt',
        f'{prefix}_mean_amt',
        f'{prefix}_std_amt',
        f'{prefix}_count',
        f'{prefix}_first_year',
        f'{prefix}_last_year'
    ]
    
    # Fill NaN std with 0
    entity_totals[f'{prefix}_std_amt'] = entity_totals[f'{prefix}_std_amt'].fillna(0)
    
    return entity_totals


def encode_categorical_features(df: pd.DataFrame) -> pd.DataFrame:
    """Encode categorical variables for ML."""
    
    # Label encode major categorical fields
    categorical_cols = ['department', 'agency', 'uacs_exp_cd', 'uacs_sobj_cd', 'fundcd']
    
    for col in categorical_cols:
        if col in df.columns:
            # Create encoded version
            df[f'{col}_encoded'] = pd.Categorical(df[col]).codes
    
    return df


def calculate_spending_ratios(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate spending ratios and proportions."""
    
    # Department share of total budget per year
    yearly_totals = df.groupby('year')['amt'].sum().reset_index()
    yearly_totals.columns = ['year', 'year_total_amt']
    
    df = df.merge(yearly_totals, on='year', how='left')
    df['dept_share_of_total'] = (df['amt'] / df['year_total_amt']) * 100
    
    # Agency share within department per year
    dept_yearly_totals = df.groupby(['department', 'year'])['amt'].sum().reset_index()
    dept_yearly_totals.columns = ['department', 'year', 'dept_year_total']
    
    df = df.merge(dept_yearly_totals, on=['department', 'year'], how='left')
    df['agency_share_of_dept'] = (df['amt'] / df['dept_year_total'].replace(0, np.nan)) * 100
    df['agency_share_of_dept'] = df['agency_share_of_dept'].fillna(0)
    
    return df


def add_lag_features(df: pd.DataFrame, group_cols: list, n_lags: int = 3) -> pd.DataFrame:
    """Add lagged features for time series prediction."""
    
    df = df.sort_values(group_cols + ['year'])
    
    for lag in range(1, n_lags + 1):
        df[f'amt_lag_{lag}'] = df.groupby(group_cols)['amt'].shift(lag)
    
    return df


def add_rolling_statistics(df: pd.DataFrame, group_cols: list, windows: list = [2, 3]) -> pd.DataFrame:
    """Add rolling window statistics."""
    
    df = df.sort_values(group_cols + ['year'])
    
    for window in windows:
        df[f'amt_rolling_mean_{window}y'] = (
            df.groupby(group_cols)['amt']
            .transform(lambda x: x.rolling(window=window, min_periods=1).mean())
        )
        df[f'amt_rolling_std_{window}y'] = (
            df.groupby(group_cols)['amt']
            .transform(lambda x: x.rolling(window=window, min_periods=1).std())
        )
    
    # Fill NaN std with 0
    for window in windows:
        df[f'amt_rolling_std_{window}y'] = df[f'amt_rolling_std_{window}y'].fillna(0)
    
    return df


def detect_outliers(df: pd.DataFrame, group_cols: list) -> pd.DataFrame:
    """Flag potential outliers using IQR method."""
    
    def flag_outliers(group):
        Q1 = group['amt'].quantile(0.25)
        Q3 = group['amt'].quantile(0.75)
        IQR = Q3 - Q1
        
        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR
        
        group['is_outlier'] = ((group['amt'] < lower_bound) | (group['amt'] > upper_bound)).astype(int)
        group['outlier_score'] = np.abs((group['amt'] - group['amt'].median()) / group['amt'].std())
        
        return group
    
    df = df.groupby(group_cols).apply(flag_outliers).reset_index(drop=True)
    df['outlier_score'] = df['outlier_score'].fillna(0)
    
    return df


def aggregate_budget_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aggregate budget data to department+agency+year level for forecasting.
    This is critical - ML models should predict at aggregated level, not line items.
    """
    
    print("\nAggregating data to department+agency+year level...")
    print(f"  Original rows: {len(df):,}")
    
    # Get department and agency descriptions (take first non-null)
    desc_cols = ['uacs_dpt_dsc', 'uacs_agy_dsc']
    
    # Aggregate by department, agency, year
    agg_df = df.groupby(['department', 'agency', 'year']).agg({
        'amt': 'sum',
        'uacs_dpt_dsc': 'first',
        'uacs_agy_dsc': 'first'
    }).reset_index()
    
    # Rename amt to indicate it's aggregated
    agg_df = agg_df.rename(columns={'amt': 'amt'})
    
    print(f"  Aggregated rows: {len(agg_df):,}")
    print(f"  Unique years: {sorted(agg_df['year'].unique())}")
    
    # Verify totals match
    for year in sorted(df['year'].unique()):
        orig_total = df[df['year'] == year]['amt'].sum()
        agg_total = agg_df[agg_df['year'] == year]['amt'].sum()
        print(f"  Year {year}: Original={orig_total:,.0f}, Aggregated={agg_total:,.0f}, Match={abs(orig_total-agg_total)<1}")
    
    return agg_df


def main():
    parser = argparse.ArgumentParser(description='Engineer features from GAA budget data')
    parser.add_argument('--input', required=True, help='Input Parquet file (gaa.parquet)')
    parser.add_argument('--output', required=True, help='Output features Parquet file')
    parser.add_argument('--group-level', default='agency', choices=['department', 'agency'],
                        help='Grouping level for time series features')
    parser.add_argument('--aggregate', action='store_true', default=True,
                        help='Aggregate data to department+agency+year level (recommended for forecasting)')
    
    args = parser.parse_args()
    
    print(f"Loading data from {args.input}...")
    df = pd.read_parquet(args.input)
    
    print(f"Original shape: {df.shape}")
    print(f"Columns: {df.columns.tolist()}")
    
    # IMPORTANT: Aggregate to department+agency+year level for proper forecasting
    if args.aggregate:
        df = aggregate_budget_data(df)
    
    # Define grouping columns based on level
    if args.group_level == 'agency':
        group_cols = ['department', 'agency']
    else:
        group_cols = ['department']
    
    print("\n1. Extracting time features...")
    df = extract_time_features(df)
    
    print("2. Calculating growth rates...")
    df = calculate_growth_rates(df, group_cols)
    
    print("3. Encoding categorical features...")
    df = encode_categorical_features(df)
    
    print("4. Calculating spending ratios...")
    df = calculate_spending_ratios(df)
    
    print("5. Adding lag features...")
    df = add_lag_features(df, group_cols, n_lags=3)
    
    print("6. Adding rolling statistics...")
    df = add_rolling_statistics(df, group_cols, windows=[2, 3])
    
    print("7. Detecting outliers...")
    df = detect_outliers(df, group_cols)
    
    # Add metadata
    df['feature_engineering_date'] = datetime.now().isoformat()
    
    print(f"\nFinal shape: {df.shape}")
    
    # Save to Parquet
    print(f"\nSaving features to {args.output}...")
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    df.to_parquet(args.output, index=False, compression='snappy')
    
    print("✓ Feature engineering complete!")
    print(f"\nFeature summary:")
    print(f"  Total records: {len(df):,}")
    print(f"  Unique departments: {df['department'].nunique()}")
    print(f"  Unique agencies: {df['agency'].nunique()}")
    print(f"  Years: {sorted(df['year'].unique())}")
    
    # Print yearly totals to verify
    print("\nYearly budget totals (in thousands):")
    for year in sorted(df['year'].unique()):
        total = df[df['year'] == year]['amt'].sum()
        print(f"  {year}: {total:,.0f} = {total * 1000 / 1e12:.2f}T")


if __name__ == '__main__':
    main()
