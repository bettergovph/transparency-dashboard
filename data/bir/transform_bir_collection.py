#!/usr/bin/env python3
"""
Transform BIR collection CSV data into SQL seed file.
Each row represents monthly collection data for a region/area.

Usage:
    # Process a specific file
    python transform_bir_collection.py input.csv output.sql
    
    # Process all CSV files in data/bir/data directory
    python transform_bir_collection.py
"""

import csv
import sys
import os
import re
from pathlib import Path
from datetime import datetime


def process_directory(data_dir='data'):
    """
    Process all CSV files in the data/bir/data directory.
    Combines all data into a single SQL file.
    """
    script_dir = Path(__file__).parent
    data_path = script_dir / data_dir
    
    if not data_path.exists():
        print(f"Error: Directory '{data_path}' does not exist.")
        sys.exit(1)
    
    # Find all CSV files
    csv_files = list(data_path.glob('*.csv'))
    
    if not csv_files:
        print(f"Error: No CSV files found in '{data_path}'")
        print("\nPlease place your BIR collection CSV files in data/bir/data/")
        sys.exit(1)
    
    print(f"\nFound {len(csv_files)} CSV file(s) in {data_path}:")
    for csv_file in csv_files:
        print(f"  - {csv_file.name}")
    print()
    
    # Output file - fixed filename
    output_sql = script_dir / 'bir_collections.sql'
    
    all_rows = []
    total_files_processed = 0
    
    # Process each CSV file
    for csv_file in sorted(csv_files):
        print(f"Processing: {csv_file.name}")
        try:
            # Extract year from filename (e.g., 2024_bir_collection.csv -> 2024)
            year_match = re.search(r'(\d{4})', csv_file.name)
            file_year = year_match.group(1) if year_match else '2024'
            
            rows = parse_csv_file(csv_file, default_year=file_year)
            all_rows.extend(rows)
            total_files_processed += 1
            print(f"  ✓ Extracted {len(rows)} rows (year: {file_year})\n")
        except Exception as e:
            print(f"  ✗ Error processing {csv_file.name}: {e}\n")
            continue
    
    if not all_rows:
        print("Error: No valid data found in any CSV files.")
        sys.exit(1)
    
    # Write combined SQL file
    print(f"\nWriting combined SQL file: {output_sql.name}")
    write_sql_file(all_rows, output_sql)
    
    print(f"\n{'='*60}")
    print(f"✓ Successfully processed {total_files_processed} file(s)")
    print(f"✓ Total rows: {len(all_rows)}")
    print(f"✓ Unique regions: {len(set(r['region'] for r in all_rows))}")
    print(f"✓ Unique areas: {len(set(r['area'] for r in all_rows))}")
    print(f"✓ Output file: {output_sql}")
    print(f"{'='*60}\n")


def parse_csv_file(csv_path, default_year='2024'):
    """
    Parse a single CSV file and return list of row dictionaries.
    Returns: List of dicts with keys: region, area, month, year, amount
    
    Args:
        csv_path: Path to CSV file
        default_year: Year to use if not found in file (extracted from filename)
    """
    month_names = {
        'jan': 'January', 'january': 'January',
        'feb': 'February', 'february': 'February',
        'mar': 'March', 'march': 'March',
        'apr': 'April', 'april': 'April',
        'may': 'May',
        'jun': 'June', 'june': 'June',
        'jul': 'July', 'july': 'July',
        'aug': 'August', 'august': 'August',
        'sep': 'September', 'september': 'September',
        'oct': 'October', 'october': 'October',
        'nov': 'November', 'november': 'November',
        'dec': 'December', 'december': 'December'
    }
    
    rows = []
    
    with open(csv_path, 'r', encoding='utf-8-sig') as csvfile:  # utf-8-sig handles BOM
        reader = csv.DictReader(csvfile)
        headers = reader.fieldnames
        
        if not headers:
            raise ValueError("CSV file is empty or has no headers")
        
        # Clean headers: strip whitespace and remove BOM
        cleaned_headers = {h: h.strip().replace('\ufeff', '') for h in headers if h}
        
        # Identify columns (case-insensitive and whitespace-tolerant)
        region_col = None
        area_col = None
        year_col = None
        month_cols = []
        
        for original_header, cleaned_header in cleaned_headers.items():
            header_lower = cleaned_header.lower().strip()
            
            if header_lower in ['region', 'reg']:
                region_col = original_header
            elif header_lower in ['area', 'district', 'location', 'office', 'particulars']:
                area_col = original_header
            elif header_lower in ['year', 'yr']:
                year_col = original_header
            elif header_lower in month_names:
                month_cols.append((original_header, month_names[header_lower]))
        
        if not region_col:
            raise ValueError(f"Missing 'region' column. Found headers: {list(cleaned_headers.values())}")
        
        if not area_col:
            raise ValueError(f"Missing 'area' column. Found headers: {list(cleaned_headers.values())}")
        
        if not month_cols:
            raise ValueError(f"No month columns found. Found headers: {list(cleaned_headers.values())}")
        
        # Process rows
        for row_num, row in enumerate(reader, start=2):
            region = row.get(region_col, '').strip()
            area = row.get(area_col, '').strip()
            year = row.get(year_col, '').strip() if year_col else default_year
            
            # Skip empty rows or rows without region/area
            if not region or not area:
                continue
            
            # Skip header-like rows (sometimes CSVs have sub-headers)
            if region.lower() in ['region', 'total', 'grand total'] or area.lower() in ['area', 'particulars', 'total']:
                continue
            
            # Process each month
            for month_col_name, month_full_name in month_cols:
                amount_str = row.get(month_col_name, '').strip()
                
                if not amount_str or amount_str in ['', '-', 'N/A', 'n/a', 'NA']:
                    continue
                
                # Clean amount: remove commas, currency symbols, parentheses, whitespace
                amount_str = (amount_str.replace(',', '')
                                       .replace('₱', '')
                                       .replace('PHP', '')
                                       .replace('(', '-')
                                       .replace(')', '')
                                       .strip())
                
                try:
                    amount = float(amount_str)
                    if amount > 0:
                        rows.append({
                            'region': region,
                            'area': area,
                            'month': month_full_name,
                            'year': year,
                            'amount': amount
                        })
                except ValueError:
                    continue
    
    return rows


def write_sql_file(rows, output_path):
    """
    Write rows to SQL file with proper schema and inserts.
    """
    with open(output_path, 'w', encoding='utf-8') as sqlfile:
        # Write header
        sqlfile.write("-- BIR Collection Data\n")
        sqlfile.write(f"-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        sqlfile.write(f"-- Total rows: {len(rows)}\n")
        sqlfile.write("-- Format: region, area, month, year, amount\n\n")
        
        # Create table
        sqlfile.write("""-- Create table
CREATE TABLE IF NOT EXISTS bir_collections (
    id SERIAL PRIMARY KEY,
    region VARCHAR(255) NOT NULL,
    area VARCHAR(255) NOT NULL,
    month VARCHAR(20) NOT NULL,
    year INTEGER NOT NULL,
    amount NUMERIC(20, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(region, area, month, year)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_bir_collections_region ON bir_collections(region);
CREATE INDEX IF NOT EXISTS idx_bir_collections_area ON bir_collections(area);
CREATE INDEX IF NOT EXISTS idx_bir_collections_year ON bir_collections(year);
CREATE INDEX IF NOT EXISTS idx_bir_collections_month ON bir_collections(month);

""")
        
        if not rows:
            sqlfile.write("-- No data to insert\n")
            return
        
        # Write INSERT statements in batches
        batch_size = 500
        total_rows = len(rows)
        
        for i in range(0, total_rows, batch_size):
            batch = rows[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (total_rows + batch_size - 1) // batch_size
            
            sqlfile.write(f"-- Batch {batch_num}/{total_batches}\n")
            sqlfile.write("INSERT INTO bir_collections (region, area, month, year, amount) VALUES\n")
            
            for idx, row in enumerate(batch):
                region = row['region'].replace("'", "''")
                area = row['area'].replace("'", "''")
                month = row['month']
                year = row['year']
                amount = row['amount']
                
                line = f"('{region}', '{area}', '{month}', {year}, {amount:.2f})"
                
                if idx < len(batch) - 1:
                    line += ","
                else:
                    line += ";"
                
                sqlfile.write(f"  {line}\n")
            
            sqlfile.write("\n")


def main():
    if len(sys.argv) == 1:
        # No arguments - process all files in data/bir/data directory
        print("\n" + "="*60)
        print("BIR Collection Data Transformer")
        print("Processing all CSV files in data/bir/data/")
        print("="*60)
        process_directory('data')
    elif len(sys.argv) >= 2:
        # Arguments provided - process specific file
        input_csv = sys.argv[1]
        output_sql = sys.argv[2] if len(sys.argv) > 2 else 'bir_collections.sql'
        
        print(f"\nTransforming: {input_csv} -> {output_sql}")
        
        if not Path(input_csv).exists():
            print(f"Error: File '{input_csv}' not found.")
            sys.exit(1)
        
        # Extract year from filename
        year_match = re.search(r'(\d{4})', input_csv)
        file_year = year_match.group(1) if year_match else '2024'
        
        rows = parse_csv_file(Path(input_csv), default_year=file_year)
        write_sql_file(rows, Path(output_sql))
        
        print(f"\n✓ Successfully created SQL file: {output_sql}")
        print(f"✓ Total rows: {len(rows)}")
        print(f"✓ Unique regions: {len(set(r['region'] for r in rows))}")
        print(f"✓ Unique areas: {len(set(r['area'] for r in rows))}\n")
    else:
        print("Usage:")
        print("  python transform_bir_collection.py                    # Process all CSV files in data/")
        print("  python transform_bir_collection.py input.csv          # Process specific file")
        print("  python transform_bir_collection.py input.csv out.sql  # Process with custom output")
        sys.exit(1)


if __name__ == '__main__':
    main()
