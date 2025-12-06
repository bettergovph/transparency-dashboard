#!/usr/bin/python3
"""
Combine GAA CSV batches into a single Parquet file with a 'year' column.

This script:
1. Reads all CSV files from a directory
2. Infers year from filename or uses provided default
3. Adds 'year' column to each CSV
4. Combines all data into a single Parquet file

Usage:
    python gaa_csv_to_parquet.py
    python gaa_csv_to_parquet.py --csv-dir csv_batches --output gaa.parquet
    python gaa_csv_to_parquet.py --default-year 2024
"""

import argparse
import glob
import os
import re
import sys
from pathlib import Path
from typing import Optional, List

import pandas as pd


def clean_numeric_value(val: str) -> float:
    """
    Clean and convert numeric values from CSV to float.
    
    Handles:
    - Commas in numbers (543,636)
    - Parentheses for negatives ((4,450) = -4,450)
    - Plain negative numbers (-301,259)
    - Empty/null/nan values
    - Special cases like " -   "
    
    Args:
        val: String value from CSV
        
    Returns:
        Cleaned float value, or 0.0 if invalid
    """
    if not isinstance(val, str):
        return 0.0
    
    val = val.strip()
    
    # Handle empty, nan, or dash-only values
    if val in ('', 'nan', 'NaN', '-', ' -   ', 'null', 'NULL'):
        return 0.0
    
    # Handle accounting format with parentheses (negative)
    if val.startswith('(') and val.endswith(')'):
        val = '-' + val[1:-1].replace(',', '').replace(' ', '')
    else:
        val = val.replace(',', '').replace(' ', '')
    
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0


def extract_year_from_filename(filename: str) -> Optional[int]:
    """
    Try to extract a 4-digit year (2000-2099) from the filename.
    
    Args:
        filename: Name of the file to extract year from
        
    Returns:
        Year as integer if found, None otherwise
    """
    m = re.search(r'(20\d{2})', os.path.basename(filename))
    return int(m.group(1)) if m else None


def load_csv_with_year(csv_path: str, default_year: Optional[int]) -> Optional[pd.DataFrame]:
    """
    Load a CSV file and ensure it has a 'year' column.
    
    If 'year' column is missing or has invalid values:
    - First tries to infer year from filename
    - Falls back to default_year if provided
    - Returns None if year cannot be determined
    
    Args:
        csv_path: Path to CSV file
        default_year: Fallback year to use if not in CSV or filename
        
    Returns:
        DataFrame with valid integer 'year' column, or None if year cannot be determined
    """
    try:
        # Read CSV with error handling and type inference disabled for mixed columns
        df = pd.read_csv(
            csv_path, 
            encoding='utf-8-sig',
            low_memory=False,  # Disable low_memory to avoid dtype warnings
            on_bad_lines='skip',  # Skip bad lines instead of failing
            dtype=str  # Read all columns as strings to avoid type issues
        )
    except Exception as e:
        print(f"  ✗ Failed to read {os.path.basename(csv_path)}: {e}")
        return None

    # Clean column names (strip whitespace and BOM)
    df.columns = df.columns.str.strip().str.replace('\ufeff', '')
    
    # Lowercase all column names
    df.columns = df.columns.str.lower()

    # Look for existing year column (case-insensitive)
    year_col = None
    for candidate in ['year', 'Year', 'YEAR', 'yr', 'Yr', 'YR']:
        if candidate in df.columns:
            year_col = candidate
            break

    # Try to infer year from filename
    inferred_year = extract_year_from_filename(csv_path)

    if year_col:
        # Year column exists - coerce to numeric and fill missing values
        df['year'] = pd.to_numeric(df[year_col], errors='coerce').astype('Int64')
        if df['year'].isna().any():
            fill_val = inferred_year if inferred_year is not None else default_year
            if fill_val is not None:
                df['year'] = df['year'].fillna(fill_val).astype('Int64')
    else:
        # No year column - must use inferred or default
        fill_val = inferred_year if inferred_year is not None else default_year
        if fill_val is None:
            print(f"  ✗ No 'year' column and could not infer year for {os.path.basename(csv_path)}")
            return None
        df['year'] = int(fill_val)

    # Ensure final 'year' column is integer type
    try:
        df['year'] = df['year'].astype(int)
    except Exception:
        print(f"  ✗ Invalid year values in {os.path.basename(csv_path)}")
        return None

    # Convert all columns to strings except year to avoid Parquet type conversion issues
    # Exception: 'amt' column should be converted to float for proper aggregation
    for col in df.columns:
        if col == 'year':
            continue  # year is already int
        elif col == 'amt':
            # Clean and convert amt column to float
            print(f"    Converting 'amt' column to numeric...")
            df[col] = df[col].apply(clean_numeric_value)
        else:
            # Keep other columns as strings for consistency
            df[col] = df[col].astype(str)

    return df


def main():
    parser = argparse.ArgumentParser(
        description="Combine GAA CSV batches into a single Parquet file with a 'year' column."
    )
    parser.add_argument(
        '--csv-dir',
        default='csv_batches',
        help='Directory containing CSV files (default: csv_batches)'
    )
    parser.add_argument(
        '--output',
        default='gaa.parquet',
        help='Output Parquet file path (default: gaa.parquet)'
    )
    parser.add_argument(
        '--default-year',
        type=int,
        default=None,
        help='Fallback year if not present in CSV or filename'
    )
    args = parser.parse_args()

    # Resolve paths relative to script directory
    script_dir = Path(__file__).parent
    csv_dir = Path(args.csv_dir)
    if not csv_dir.is_absolute():
        csv_dir = script_dir / csv_dir

    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = script_dir / output_path

    print("\n" + "="*60)
    print("GAA CSV to Parquet Converter")
    print("="*60 + "\n")
    print(f"Searching CSV files in: {csv_dir}")

    # Find all CSV files
    csv_files = sorted(glob.glob(str(csv_dir / '*.csv')))
    
    if not csv_files:
        print(f"⚠ No CSV files found in {csv_dir}/")
        sys.exit(1)

    print(f"Found {len(csv_files)} CSV files to process\n")

    # Process each CSV file
    dataframes: List[pd.DataFrame] = []
    total_rows = 0
    
    for idx, csv_file in enumerate(csv_files, 1):
        print(f"[{idx}/{len(csv_files)}] Processing: {os.path.basename(csv_file)}")
        df = load_csv_with_year(csv_file, args.default_year)
        
        if df is None:
            print("  ✗ Skipped (missing/invalid year or read error)\n")
            continue
            
        dataframes.append(df)
        total_rows += len(df)
        year_val = df['year'].iloc[0] if len(df) > 0 else 'N/A'
        print(f"  ✓ Loaded {len(df):,} rows (year: {year_val})\n")

    if not dataframes:
        print("✗ No valid CSVs were processed. Aborting.")
        sys.exit(1)

    # Combine all dataframes
    print(f"Combining {len(dataframes)} dataframes...")
    combined = pd.concat(dataframes, ignore_index=True)
    
    # Add incrementing ID column as the first column
    print("Generating incrementing IDs...")
    combined.insert(0, 'id', range(1, len(combined) + 1))

    # Write to Parquet using pyarrow with snappy compression
    print(f"Writing Parquet: {output_path}")
    try:
        combined.to_parquet(
            output_path,
            engine='pyarrow',
            compression='snappy',
            index=False
        )
    except Exception as e:
        print(f"✗ Failed to write Parquet: {e}")
        sys.exit(1)

    # Get file size
    try:
        size_mb = output_path.stat().st_size / (1024 * 1024)
    except FileNotFoundError:
        size_mb = 0

    print(f"\n{'='*60}")
    print(f"✓ Successfully wrote {total_rows:,} rows to Parquet")
    print(f"✓ Output: {output_path}")
    print(f"✓ Size: {size_mb:.2f} MB")
    print(f"✓ Files processed: {len(dataframes)}/{len(csv_files)}")
    print(f"✓ Years included: {sorted(combined['year'].unique().tolist())}")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
