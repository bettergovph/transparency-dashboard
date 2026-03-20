#!/usr/bin/env python3
"""
Aggregate Treasury COR data by line item across all time periods.

This script creates a JSON file with total values for each line item
(category > subcategory > line_item hierarchy) aggregated across all
years and months in the cor_data.csv file.

Output: /public/data/treasury/alltime_aggregates.json

Values remain in thousands of PHP (as in source data).
"""

import csv
import json
from pathlib import Path
from collections import defaultdict
from datetime import datetime

def main():
    # Paths
    script_dir = Path(__file__).parent
    input_csv = script_dir / 'cor_data.csv'
    output_json = script_dir.parent.parent / 'public' / 'data' / 'treasury' / 'alltime_aggregates.json'
    
    # Ensure output directory exists
    output_json.parent.mkdir(parents=True, exist_ok=True)
    
    print("=" * 80)
    print("Treasury All-Time Aggregates Generator")
    print("=" * 80)
    print(f"\nInput: {input_csv}")
    print(f"Output: {output_json}\n")
    
    if not input_csv.exists():
        print(f"Error: Input file not found: {input_csv}")
        return 1
    
    # Data structures for aggregation
    # Key: (category, subcategory, line_item)
    aggregates = defaultdict(float)
    years_seen = set()
    months_seen = set()
    order_map = {}  # Track first occurrence order
    order_index = 0
    
    # Read and aggregate
    print("Reading and aggregating data...")
    with open(input_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            year = int(row['year'])
            month = row['month']
            category = row['category']
            subcategory = row['subcategory']
            line_item = row['line_item']
            value = float(row['value'])
            
            years_seen.add(year)
            months_seen.add(month)
            
            # Create hierarchical key
            key = (category, subcategory, line_item)
            
            # Track order of first occurrence
            if key not in order_map:
                order_map[key] = order_index
                order_index += 1
            
            aggregates[key] += value
    
    print(f"✓ Processed {len(aggregates)} unique line items")
    print(f"  Years: {min(years_seen)} - {max(years_seen)} ({len(years_seen)} years)")
    print(f"  Months: {len(months_seen)} unique months")
    
    # Convert to structured list
    print("\nBuilding structured output...")
    data_list = []
    
    for (category, subcategory, line_item), total in aggregates.items():
        data_list.append({
            'category': category,
            'subcategory': subcategory,
            'line_item': line_item,
            'total': round(total, 2),
            '_order': order_map[(category, subcategory, line_item)]  # Temporary field for sorting
        })
    
    # Sort by original order of appearance
    data_list.sort(key=lambda x: x['_order'])
    
    # Remove temporary order field
    for item in data_list:
        del item['_order']
    
    # Build output structure
    output = {
        'metadata': {
            'title': 'Treasury All-Time Aggregates',
            'source': 'Bureau of Treasury - Cash Operations Report (COR)',
            'description': 'Total values for each line item aggregated across all years and months',
            'generated_at': datetime.now().isoformat(),
            'date_range': {
                'start_year': min(years_seen),
                'end_year': max(years_seen),
                'total_years': len(years_seen)
            },
            'total_line_items': len(data_list),
            'scale': 'Values in thousands of Philippine Pesos',
            'note': 'To get actual PHP amounts, multiply values by 1,000'
        },
        'data': data_list
    }
    
    # Calculate summary statistics
    print("\nCalculating summary statistics...")
    categories = defaultdict(lambda: {'total': 0, 'count': 0})
    
    for item in data_list:
        cat = item['category']
        categories[cat]['total'] += item['total']
        categories[cat]['count'] += 1
    
    # Add category summaries to metadata
    category_summary = []
    for cat, stats in sorted(categories.items()):
        category_summary.append({
            'category': cat,
            'total': round(stats['total'], 2),
            'line_item_count': stats['count']
        })
    
    output['metadata']['category_summary'] = category_summary
    
    # Write output
    print(f"\nWriting output to: {output_json}")
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    # Print summary
    print("\n" + "=" * 80)
    print("Summary")
    print("=" * 80)
    
    for cat_sum in category_summary:
        print(f"\n{cat_sum['category']}:")
        print(f"  Total: ₱{cat_sum['total']:,.2f} (thousands)")
        print(f"  Line Items: {cat_sum['line_item_count']}")
    
    file_size = output_json.stat().st_size / 1024  # KB
    print(f"\n✓ Output file: {output_json.name} ({file_size:.1f} KB)")
    print(f"✓ Total line items: {len(data_list)}")
    print("\nDone!\n")
    
    return 0

if __name__ == '__main__':
    exit(main())
