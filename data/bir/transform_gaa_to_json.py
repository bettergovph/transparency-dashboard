#!/usr/bin/env python3
"""
Transform GAA (General Appropriations Act) CSV data into JSON format.
The GAA represents the national budget allocated per region.

Usage:
    python transform_gaa_to_json.py
"""

import csv
import json
import sys
from pathlib import Path
from datetime import datetime


def transform_gaa_csv_to_json():
    """
    Transform GAA CSV file into JSON format for dashboard consumption.
    
    CSV Format:
        Year,Region 1,Region 2,...,Region 17,Region 19,Region Unknown
        2020,3453911000.00,3398294000.00,...
    
    Output JSON Format:
    {
      "metadata": {...},
      "data": [
        {
          "year": 2020,
          "regions": [
            {"region": "Region I", "gaa": 3453911000.00},
            ...
          ]
        }
      ]
    }
    """
    script_dir = Path(__file__).parent
    csv_path = script_dir / 'data' / 'gaa_by_region.csv'
    output_path = script_dir.parent.parent / 'public' / 'data' / 'bir' / 'aggregates' / 'gaa_by_region.json'
    
    if not csv_path.exists():
        print(f"Error: GAA CSV file not found at {csv_path}")
        sys.exit(1)
    
    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    print("\n" + "="*60)
    print("GAA to JSON Transformer")
    print("="*60)
    print(f"Input:  {csv_path}")
    print(f"Output: {output_path}\n")
    
    data = []
    total_budget = 0
    years_covered = []
    
    with open(csv_path, 'r', encoding='utf-8-sig') as csvfile:
        reader = csv.DictReader(csvfile)
        headers = reader.fieldnames
        
        # Get region columns (all columns except Year)
        region_columns = [h for h in headers if h and h.strip() not in ['Year', 'year']]
        
        print(f"Found {len(region_columns)} region columns")
        
        for row in reader:
            year_str = row.get('Year', '').strip()
            if not year_str:
                continue
            
            try:
                year = int(year_str)
                years_covered.append(year)
                
                year_data = {
                    'year': year,
                    'regions': []
                }
                
                year_total = 0
                
                for col in region_columns:
                    region_name = col  # Use column name directly (already in correct format)
                    amount_str = row.get(col, '').strip()
                    
                    if not amount_str or amount_str in ['', '-', 'N/A', 'n/a', 'NA', '0', '0.00']:
                        continue
                    
                    try:
                        amount = float(amount_str)
                        if amount > 0:
                            year_data['regions'].append({
                                'region': region_name,
                                'gaa': amount
                            })
                            year_total += amount
                    except ValueError:
                        continue
                
                year_data['total'] = year_total
                data.append(year_data)
                total_budget += year_total
                
                print(f"  ✓ Year {year}: {len(year_data['regions'])} regions, Total: ₱{year_total:,.2f}")
                
            except ValueError:
                print(f"  ✗ Skipping invalid year: {year_str}")
                continue
    
    if not data:
        print("Error: No valid data found in GAA CSV file.")
        sys.exit(1)
    
    # Create output JSON
    output_json = {
        'metadata': {
            'title': 'General Appropriations Act (GAA) by Region',
            'description': 'National budget allocation per region',
            'generated_at': datetime.now().isoformat(),
            'years_covered': f"{min(years_covered)}-{max(years_covered)}",
            'total_years': len(years_covered),
            'source': 'Department of Budget and Management (DBM)',
            'note': 'Values are in Philippine Peso (PHP)'
        },
        'data': data
    }
    
    # Write JSON file
    with open(output_path, 'w', encoding='utf-8') as jsonfile:
        json.dump(output_json, jsonfile, indent=2, ensure_ascii=False)
    
    print(f"\n{'='*60}")
    print(f"✓ Successfully transformed GAA data")
    print(f"✓ Years covered: {min(years_covered)}-{max(years_covered)}")
    print(f"✓ Total budget: ₱{total_budget:,.2f}")
    print(f"✓ Output: {output_path}")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    transform_gaa_csv_to_json()
