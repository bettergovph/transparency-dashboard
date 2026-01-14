#!/usr/bin/env python3
"""
Generate aggregated JSON files from DPWH infrastructure project data.

This script creates aggregates for:
- Categories (infrastructure types)
- Provinces
- Regions
- Contractors
- Program Names
- Years

Usage:
    python create_aggregates.py
    python create_aggregates.py --parquet-file dpwh_transparency_data.parquet --output-dir ../../public/data/dpwh/aggregates
"""

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List

import pandas as pd


def create_category_aggregates(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Create category aggregates with project counts and budget totals.
    
    Returns list of:
    {
      "category": category_name,
      "project_count": count,
      "total_budget": sum_budget,
      "total_paid": sum_paid,
      "avg_budget": avg_budget,
      "avg_progress": avg_progress,
      "statuses": { "Completed": X, "On-Going": Y, ... }
    }
    """
    print("  → Creating category aggregates...")
    
    # Group by category
    grouped = df.groupby('category').agg({
        'contractId': 'count',
        'budget': ['sum', 'mean'],
        'amountPaid': 'sum',
        'progress': 'mean'
    }).reset_index()
    
    # Flatten columns
    grouped.columns = ['category', 'project_count', 'total_budget', 'avg_budget', 'total_paid', 'avg_progress']
    
    # Get status breakdown for each category
    status_breakdown = df.groupby(['category', 'status']).size().reset_index(name='count')
    
    result = []
    for _, row in grouped.iterrows():
        category = row['category']
        statuses = {}
        
        # Get status counts for this category
        cat_statuses = status_breakdown[status_breakdown['category'] == category]
        for _, status_row in cat_statuses.iterrows():
            statuses[status_row['status']] = int(status_row['count'])
        
        result.append({
            'category': category,
            'project_count': int(row['project_count']),
            'total_budget': float(row['total_budget']),
            'total_paid': float(row['total_paid']),
            'avg_budget': float(row['avg_budget']),
            'avg_progress': float(row['avg_progress']),
            'statuses': statuses
        })
    
    # Sort by total budget descending
    result = sorted(result, key=lambda x: x['total_budget'], reverse=True)
    print(f"    ✓ Generated {len(result)} categories")
    return result


def create_province_aggregates(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Create province aggregates with regional context.
    """
    print("  → Creating province aggregates...")
    
    # Extract province and region from location dict
    df_expanded = df.copy()
    df_expanded['province'] = df_expanded['location'].apply(lambda x: x['province'])
    df_expanded['region'] = df_expanded['location'].apply(lambda x: x['region'])
    
    # Group by province and region
    grouped = df_expanded.groupby(['province', 'region']).agg({
        'contractId': 'count',
        'budget': ['sum', 'mean'],
        'amountPaid': 'sum',
        'progress': 'mean'
    }).reset_index()
    
    grouped.columns = ['province', 'region', 'project_count', 'total_budget', 'avg_budget', 'total_paid', 'avg_progress']
    
    # Get top categories per province
    category_by_province = df_expanded.groupby(['province', 'category']).size().reset_index(name='count')
    
    result = []
    for _, row in grouped.iterrows():
        province = row['province']
        
        # Get top 3 categories for this province
        prov_categories = category_by_province[category_by_province['province'] == province]
        top_categories = prov_categories.nlargest(3, 'count')[['category', 'count']].to_dict('records')
        
        result.append({
            'province': province,
            'region': row['region'],
            'project_count': int(row['project_count']),
            'total_budget': float(row['total_budget']),
            'total_paid': float(row['total_paid']),
            'avg_budget': float(row['avg_budget']),
            'avg_progress': float(row['avg_progress']),
            'top_categories': [
                {'category': cat['category'], 'count': int(cat['count'])} 
                for cat in top_categories
            ]
        })
    
    result = sorted(result, key=lambda x: x['total_budget'], reverse=True)
    print(f"    ✓ Generated {len(result)} provinces")
    return result


def create_region_aggregates(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Create region aggregates.
    """
    print("  → Creating region aggregates...")
    
    # Extract region from location dict
    df_expanded = df.copy()
    df_expanded['region'] = df_expanded['location'].apply(lambda x: x['region'])
    
    # Group by region
    grouped = df_expanded.groupby('region').agg({
        'contractId': 'count',
        'budget': ['sum', 'mean'],
        'amountPaid': 'sum',
        'progress': 'mean'
    }).reset_index()
    
    grouped.columns = ['region', 'project_count', 'total_budget', 'avg_budget', 'total_paid', 'avg_progress']
    
    # Get province count per region
    province_counts = df_expanded.groupby('region')['location'].apply(
        lambda x: x.apply(lambda loc: loc['province']).nunique()
    ).reset_index(name='province_count')
    
    # Get top categories per region
    category_by_region = df_expanded.groupby(['region', 'category']).size().reset_index(name='count')
    
    result = []
    for _, row in grouped.iterrows():
        region = row['region']
        
        # Get province count
        prov_count = province_counts[province_counts['region'] == region]['province_count'].values[0]
        
        # Get top 5 categories for this region
        reg_categories = category_by_region[category_by_region['region'] == region]
        top_categories = reg_categories.nlargest(5, 'count')[['category', 'count']].to_dict('records')
        
        result.append({
            'region': region,
            'province_count': int(prov_count),
            'project_count': int(row['project_count']),
            'total_budget': float(row['total_budget']),
            'total_paid': float(row['total_paid']),
            'avg_budget': float(row['avg_budget']),
            'avg_progress': float(row['avg_progress']),
            'top_categories': [
                {'category': cat['category'], 'count': int(cat['count'])} 
                for cat in top_categories
            ]
        })
    
    result = sorted(result, key=lambda x: x['total_budget'], reverse=True)
    print(f"    ✓ Generated {len(result)} regions")
    return result


def create_contractor_aggregates(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Create contractor aggregates for ALL contractors (complete transparency).
    """
    print("  → Creating contractor aggregates...")
    
    # Group by contractor
    grouped = df.groupby('contractor').agg({
        'contractId': 'count',
        'budget': ['sum', 'mean'],
        'amountPaid': 'sum',
        'progress': 'mean'
    }).reset_index()
    
    grouped.columns = ['contractor', 'project_count', 'total_budget', 'avg_budget', 'total_paid', 'avg_progress']
    
    # Sort by total budget descending
    grouped = grouped.sort_values('total_budget', ascending=False)
    
    result = []
    for idx, row in grouped.iterrows():
        result.append({
            'contractor': row['contractor'],
            'project_count': int(row['project_count']),
            'total_budget': float(row['total_budget']),
            'total_paid': float(row['total_paid']),
            'avg_budget': float(row['avg_budget']),
            'avg_progress': float(row['avg_progress'])
        })
    
    print(f"    ✓ Generated {len(result)} contractors (complete list)")
    return result


def create_program_aggregates(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Create program name aggregates.
    """
    print("  → Creating program name aggregates...")
    
    # Group by program name
    grouped = df.groupby('programName').agg({
        'contractId': 'count',
        'budget': ['sum', 'mean'],
        'amountPaid': 'sum',
        'progress': 'mean'
    }).reset_index()
    
    grouped.columns = ['program_name', 'project_count', 'total_budget', 'avg_budget', 'total_paid', 'avg_progress']
    
    result = []
    for _, row in grouped.iterrows():
        result.append({
            'program_name': row['program_name'],
            'project_count': int(row['project_count']),
            'total_budget': float(row['total_budget']),
            'total_paid': float(row['total_paid']),
            'avg_budget': float(row['avg_budget']),
            'avg_progress': float(row['avg_progress'])
        })
    
    result = sorted(result, key=lambda x: x['total_budget'], reverse=True)
    print(f"    ✓ Generated {len(result)} programs")
    return result


def create_year_aggregates(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Create year aggregates.
    """
    print("  → Creating year aggregates...")
    
    # Group by infrastructure year
    grouped = df.groupby('infraYear').agg({
        'contractId': 'count',
        'budget': ['sum', 'mean'],
        'amountPaid': 'sum',
        'progress': 'mean'
    }).reset_index()
    
    grouped.columns = ['year', 'project_count', 'total_budget', 'avg_budget', 'total_paid', 'avg_progress']
    
    # Get status breakdown per year
    status_by_year = df.groupby(['infraYear', 'status']).size().reset_index(name='count')
    
    result = []
    for _, row in grouped.iterrows():
        year = row['year']
        statuses = {}
        
        # Get status counts for this year
        year_statuses = status_by_year[status_by_year['infraYear'] == year]
        for _, status_row in year_statuses.iterrows():
            statuses[status_row['status']] = int(status_row['count'])
        
        result.append({
            'year': year,
            'project_count': int(row['project_count']),
            'total_budget': float(row['total_budget']),
            'total_paid': float(row['total_paid']),
            'avg_budget': float(row['avg_budget']),
            'avg_progress': float(row['avg_progress']),
            'statuses': statuses
        })
    
    result = sorted(result, key=lambda x: x['year'])
    print(f"    ✓ Generated {len(result)} years")
    return result


def create_status_aggregates(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Create status aggregates.
    """
    print("  → Creating status aggregates...")
    
    # Group by status
    grouped = df.groupby('status').agg({
        'contractId': 'count',
        'budget': ['sum', 'mean'],
        'amountPaid': 'sum',
        'progress': 'mean'
    }).reset_index()
    
    grouped.columns = ['status', 'project_count', 'total_budget', 'avg_budget', 'total_paid', 'avg_progress']
    
    result = []
    for _, row in grouped.iterrows():
        result.append({
            'status': row['status'],
            'project_count': int(row['project_count']),
            'total_budget': float(row['total_budget']),
            'total_paid': float(row['total_paid']),
            'avg_budget': float(row['avg_budget']),
            'avg_progress': float(row['avg_progress'])
        })
    
    result = sorted(result, key=lambda x: x['total_budget'], reverse=True)
    print(f"    ✓ Generated {len(result)} statuses")
    return result


def main():
    parser = argparse.ArgumentParser(
        description="Generate aggregated JSON files from DPWH infrastructure project data"
    )
    parser.add_argument(
        '--parquet-file',
        default='dpwh_transparency_data.parquet',
        help='Input Parquet file (default: dpwh_transparency_data.parquet)'
    )
    parser.add_argument(
        '--output-dir',
        default='../../public/data/dpwh/aggregates',
        help='Output directory for JSON files (default: ../../public/data/dpwh/aggregates)'
    )
    args = parser.parse_args()
    
    # Resolve paths
    script_dir = Path(__file__).parent
    parquet_path = Path(args.parquet_file)
    if not parquet_path.is_absolute():
        parquet_path = script_dir / parquet_path
    
    output_dir = Path(args.output_dir)
    if not output_dir.is_absolute():
        output_dir = script_dir / output_dir
    
    print("\n" + "="*60)
    print("DPWH Aggregate Generator")
    print("="*60 + "\n")
    
    # Check if parquet file exists
    if not parquet_path.exists():
        print(f"✗ Parquet file not found: {parquet_path}")
        sys.exit(1)
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Output directory: {output_dir}\n")
    
    # Load parquet file
    print(f"Loading parquet file: {parquet_path.name}")
    try:
        df = pd.read_parquet(parquet_path)
        print(f"✓ Loaded {len(df):,} projects\n")
    except Exception as e:
        print(f"✗ Failed to load parquet file: {e}")
        sys.exit(1)
    
    # Generate all aggregates
    print("Generating aggregates...\n")
    
    aggregates = {
        'categories.json': create_category_aggregates(df),
        'provinces.json': create_province_aggregates(df),
        'regions.json': create_region_aggregates(df),
        'contractors.json': create_contractor_aggregates(df),
        'programs.json': create_program_aggregates(df),
        'years.json': create_year_aggregates(df),
        'statuses.json': create_status_aggregates(df)
    }
    
    # Calculate overall statistics
    total_budget = float(df['budget'].sum())
    total_paid = float(df['amountPaid'].sum())
    avg_progress = float(df['progress'].mean())
    
    # Write JSON files
    print("\nWriting JSON files...")
    for filename, data in aggregates.items():
        output_path = output_dir / filename
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump({
                    'metadata': {
                        'title': f"DPWH {filename.replace('.json', '').replace('_', ' ').title()}",
                        'source': 'Department of Public Works and Highways',
                        'generated_at': datetime.now().isoformat(),
                        'total_items': len(data),
                        'total_projects': len(df),
                        'total_budget': total_budget,
                        'total_paid': total_paid,
                        'avg_progress': avg_progress
                    },
                    'data': data
                }, f, ensure_ascii=False, indent=2)
            print(f"  ✓ {filename} ({len(data)} items)")
        except Exception as e:
            print(f"  ✗ Failed to write {filename}: {e}")
    
    print(f"\n{'='*60}")
    print("✓ Successfully generated all aggregates")
    print(f"✓ Output directory: {output_dir}")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
