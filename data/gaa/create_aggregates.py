#!/usr/bin/python3
"""
Generate hierarchical JSON aggregates from GAA Parquet data.

This script creates year-by-year aggregations for:
- Departments (with their IDs and descriptions)
- Agencies (linked to parent departments)
- Fund Sub-Categories (linked to parent department and agency)
- Expense Categories (linked to parent department and agency)
- Objects (linked to parent department and agency)

Output format for each aggregate follows:
{
  "id": <id_field>,
  "description": <description_field>,
  "years": {
    "2025": { "count": <count>, "amount": <amount> },
    "2024": { "count": <count>, "amount": <amount> }
  },
  "parent_id": <parent_id> (if applicable)
}

Usage:
    python create_aggregates.py
    python create_aggregates.py --parquet-file gaa.parquet --output-dir ../../public/data/gaa/aggregates
"""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Dict, Any, List

import pandas as pd


def to_slug(text: str) -> str:
    """Convert text to SEO-friendly slug with lowercase and hyphens."""
    # Convert to lowercase
    slug = text.lower()
    # Replace spaces with hyphens
    slug = slug.replace(' ', '-')
    # Remove special characters (keep only alphanumeric and hyphens)
    slug = re.sub(r'[^a-z0-9-]', '', slug)
    # Replace multiple consecutive hyphens with single hyphen
    slug = re.sub(r'-+', '-', slug)
    # Strip hyphens from start and end
    slug = slug.strip('-')
    return slug


def is_department_name(desc: str) -> bool:
    """
    Check if a description looks like a department/agency name.
    Philippine government entities typically use pattern: "Entity Name (ABBREV)"
    or start with "Department of", "Office of", etc.
    """
    if not desc or str(desc).lower() == 'nan':
        return False
    desc = str(desc)
    # Check for common patterns
    patterns = [
        '(' in desc and ')' in desc,  # Has abbreviation like "Office of the President (OP)"
        desc.startswith('Department of'),
        desc.startswith('Office of'),
        desc.startswith('Commission on'),
        desc.startswith('The '),
        'University' in desc or 'College' in desc,
        'Congress' in desc,
        'Judiciary' in desc,
        'Automatic Appropriations' in desc,  # Special case - this IS a dept name
        'Budgetary Support' in desc,
        'Allocations to' in desc,
    ]
    return any(patterns)


def create_department_aggregates(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Create department aggregates grouped by year.
    
    Note: Aggregates by department ID only (not description) to handle cases
    where the same department has multiple description variations in the data.
    Uses smart selection: prefers descriptions that look like department names,
    falls back to highest amount if no department-like name found.
    
    Returns list of:
    {
      "id": department_id,
      "description": department_description,
      "years": { "2025": { "count": X, "amount": Y }, ... }
    }
    """
    print("  → Creating department aggregates...")
    
    # First, find the best description for each department
    # Priority: 1) Department-like names by amount, 2) Any name by amount
    dept_descriptions = {}
    for dept_id in df['department'].unique():
        dept_data = df[df['department'] == dept_id]
        # Get total amount by description
        desc_amounts = dept_data.groupby('uacs_dpt_dsc')['amt'].sum().sort_values(ascending=False)
        
        # First pass: look for department-like names
        for desc, amount in desc_amounts.items():
            if is_department_name(desc):
                dept_descriptions[str(dept_id)] = str(desc)
                break
        
        # Fallback: use highest amount non-nan description
        if str(dept_id) not in dept_descriptions:
            for desc, amount in desc_amounts.items():
                if desc and str(desc).lower() != 'nan' and str(desc).strip():
                    dept_descriptions[str(dept_id)] = str(desc)
                    break
        
        # Final fallback
        if str(dept_id) not in dept_descriptions:
            dept_descriptions[str(dept_id)] = str(dept_data['uacs_dpt_dsc'].iloc[0])
    
    # Group by department and year only (aggregate across all description variations)
    grouped = df.groupby(['department', 'year']).agg({
        'amt': ['count', 'sum']
    }).reset_index()
    
    # Flatten multi-level columns
    grouped.columns = ['department', 'year', 'count', 'amount']
    
    # Build nested structure
    departments = {}
    for _, row in grouped.iterrows():
        dept_id = str(row['department'])
        if dept_id not in departments:
            description = dept_descriptions.get(dept_id, dept_id)
            departments[dept_id] = {
                'id': dept_id,
                'slug': to_slug(description),
                'description': description,
                'years': {}
            }
        
        year = str(int(row['year']))
        departments[dept_id]['years'][year] = {
            'count': int(row['count']),
            'amount': float(row['amount'])
        }
    
    result = sorted(departments.values(), key=lambda x: x['id'])
    print(f"    ✓ Generated {len(result)} departments")
    return result


def create_agency_aggregates(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Create agency aggregates grouped by year, with parent department reference.
    
    Note: Agency IDs are not unique across departments, so we use composite keys.
    Aggregates by department+agency ID only (not description) to handle cases
    where the same agency has multiple description variations in the data.
    
    Returns list of:
    {
      "id": "department_id-agency_id" (composite key),
      "agency_code": agency_id (original code),
      "description": agency_description,
      "department_id": parent_department_id,
      "years": { "2025": { "count": X, "amount": Y }, ... }
    }
    """
    print("  → Creating agency aggregates...")
    
    # First, find the best description for each agency
    # Priority: 1) Agency-like names by amount, 2) Any name by amount
    agency_descriptions = {}
    for (dept_id, agency_code), group in df.groupby(['department', 'agency']):
        composite_id = f"{dept_id}-{agency_code}"
        # Get total amount by description
        desc_amounts = group.groupby('uacs_agy_dsc')['amt'].sum().sort_values(ascending=False)
        
        # First pass: look for agency-like names (reuse department name checker)
        for desc, amount in desc_amounts.items():
            if is_department_name(desc):  # Same patterns work for agencies
                agency_descriptions[composite_id] = str(desc)
                break
        
        # Fallback: use highest amount non-nan description
        if composite_id not in agency_descriptions:
            for desc, amount in desc_amounts.items():
                if desc and str(desc).lower() != 'nan' and str(desc).strip():
                    agency_descriptions[composite_id] = str(desc)
                    break
        
        # Final fallback
        if composite_id not in agency_descriptions:
            agency_descriptions[composite_id] = str(group['uacs_agy_dsc'].iloc[0])
    
    # Group by agency, department, and year only (aggregate across all description variations)
    grouped = df.groupby(['agency', 'department', 'year']).agg({
        'amt': ['count', 'sum']
    }).reset_index()
    
    grouped.columns = ['agency', 'department', 'year', 'count', 'amount']
    
    # Build nested structure with composite keys
    agencies = {}
    for _, row in grouped.iterrows():
        dept_id = str(row['department'])
        agency_code = str(row['agency'])
        composite_id = f"{dept_id}-{agency_code}"  # Composite key
        
        if composite_id not in agencies:
            description = agency_descriptions.get(composite_id, agency_code)
            agencies[composite_id] = {
                'id': composite_id,
                'slug': to_slug(description),
                'agency_code': agency_code,
                'description': description,
                'department_id': dept_id,
                'years': {}
            }
        
        year = str(int(row['year']))
        agencies[composite_id]['years'][year] = {
            'count': int(row['count']),
            'amount': float(row['amount'])
        }
    
    result = sorted(agencies.values(), key=lambda x: (x['department_id'], x['agency_code']))
    print(f"    ✓ Generated {len(result)} agencies")
    return result


def create_fund_subcategory_aggregates(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Create fund sub-category aggregates with parent references.
    Uses composite keys since fund subcategories may repeat across dept/agency combos.
    """
    print("  → Creating fund sub-category aggregates...")
    
    # Filter out null/empty fund sub-categories
    df_filtered = df[df['uacs_fundsubcat_dsc'].notna() & (df['uacs_fundsubcat_dsc'] != '')]
    
    grouped = df_filtered.groupby([
        'uacs_fundsubcat_dsc', 'department', 'agency', 'year'
    ]).agg({
        'amt': ['count', 'sum']
    }).reset_index()
    
    grouped.columns = ['uacs_fundsubcat_dsc', 'department', 'agency', 'year', 'count', 'amount']
    
    # Build nested structure with composite keys
    fund_subcats = {}
    for _, row in grouped.iterrows():
        dept_id = str(row['department'])
        agency_code = str(row['agency'])
        fund_desc = row['uacs_fundsubcat_dsc']
        composite_id = f"{dept_id}-{agency_code}-{fund_desc}"  # Composite key
        
        if composite_id not in fund_subcats:
            fund_subcats[composite_id] = {
                'id': composite_id,
                'slug': to_slug(fund_desc),
                'description': fund_desc,
                'department_id': dept_id,
                'agency_id': f"{dept_id}-{agency_code}",  # Reference to agency composite ID
                'years': {}
            }
        
        year = str(int(row['year']))
        fund_subcats[composite_id]['years'][year] = {
            'count': int(row['count']),
            'amount': float(row['amount'])
        }
    
    result = sorted(fund_subcats.values(), key=lambda x: (x['department_id'], x['agency_id'], x['description']))
    print(f"    ✓ Generated {len(result)} fund sub-categories")
    return result


def create_expense_aggregates(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Create expense category aggregates with parent references.
    Uses composite keys since expense codes may repeat across dept/agency combos.
    """
    print("  → Creating expense category aggregates...")
    
    # Filter out null/empty expense descriptions
    df_filtered = df[df['uacs_exp_dsc'].notna() & (df['uacs_exp_dsc'] != '')]
    
    grouped = df_filtered.groupby([
        'uacs_exp_cd', 'uacs_exp_dsc', 'department', 'agency', 'year'
    ]).agg({
        'amt': ['count', 'sum']
    }).reset_index()
    
    grouped.columns = ['uacs_exp_cd', 'uacs_exp_dsc', 'department', 'agency', 'year', 'count', 'amount']
    
    # Build nested structure with composite keys
    expenses = {}
    for _, row in grouped.iterrows():
        dept_id = str(row['department'])
        agency_code = str(row['agency'])
        exp_code = str(row['uacs_exp_cd'])
        composite_id = f"{dept_id}-{agency_code}-{exp_code}"  # Composite key
        
        if composite_id not in expenses:
            expenses[composite_id] = {
                'id': composite_id,
                'slug': to_slug(row['uacs_exp_dsc']),
                'expense_code': exp_code,
                'description': row['uacs_exp_dsc'],
                'department_id': dept_id,
                'agency_id': f"{dept_id}-{agency_code}",  # Reference to agency composite ID
                'years': {}
            }
        
        year = str(int(row['year']))
        expenses[composite_id]['years'][year] = {
            'count': int(row['count']),
            'amount': float(row['amount'])
        }
    
    result = sorted(expenses.values(), key=lambda x: (x['department_id'], x['agency_id'], x['expense_code']))
    print(f"    ✓ Generated {len(result)} expense categories")
    return result


def create_object_aggregates(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Create object aggregates with parent references.
    Uses composite keys since object codes may repeat across dept/agency combos.
    
    Note: The parquet file is pre-normalized by gaa_csv_to_parquet.py,
    so all years use uacs_sobj_cd/uacs_sobj_dsc consistently.
    """
    print("  → Creating object aggregates...")
    
    # Filter out null/empty object descriptions
    df_filtered = df[df['uacs_sobj_dsc'].notna() & (df['uacs_sobj_dsc'] != '') & (df['uacs_sobj_dsc'] != 'nan')]
    
    grouped = df_filtered.groupby([
        'uacs_sobj_cd', 'uacs_sobj_dsc', 'department', 'agency', 'year'
    ]).agg({
        'amt': ['count', 'sum']
    }).reset_index()
    
    grouped.columns = ['uacs_sobj_cd', 'uacs_sobj_dsc', 'department', 'agency', 'year', 'count', 'amount']
    
    # Build nested structure with composite keys
    objects = {}
    for _, row in grouped.iterrows():
        dept_id = str(row['department'])
        agency_code = str(row['agency'])
        obj_code = str(row['uacs_sobj_cd'])
        composite_id = f"{dept_id}-{agency_code}-{obj_code}"  # Composite key
        
        if composite_id not in objects:
            objects[composite_id] = {
                'id': composite_id,
                'slug': to_slug(row['uacs_sobj_dsc']),
                'object_code': obj_code,
                'description': row['uacs_sobj_dsc'],
                'department_id': dept_id,
                'agency_id': f"{dept_id}-{agency_code}",  # Reference to agency composite ID
                'years': {}
            }
        
        year = str(int(row['year']))
        objects[composite_id]['years'][year] = {
            'count': int(row['count']),
            'amount': float(row['amount'])
        }
    
    result = sorted(objects.values(), key=lambda x: (x['department_id'], x['agency_id'], x['object_code']))
    print(f"    ✓ Generated {len(result)} objects")
    return result


def create_yearly_totals(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Create year-by-year total aggregates.
    
    Returns list of:
    {
      "year": 2025,
      "count": total_count,
      "amount": total_amount
    }
    """
    print("  → Creating yearly totals...")
    
    grouped = df.groupby('year').agg({
        'amt': ['count', 'sum']
    }).reset_index()
    
    grouped.columns = ['year', 'count', 'amount']
    
    result = [
        {
            'year': int(row['year']),
            'count': int(row['count']),
            'amount': float(row['amount'])
        }
        for _, row in grouped.iterrows()
    ]
    
    result = sorted(result, key=lambda x: x['year'])
    print(f"    ✓ Generated {len(result)} years")
    return result


def main():
    parser = argparse.ArgumentParser(
        description="Generate hierarchical JSON aggregates from GAA Parquet data"
    )
    parser.add_argument(
        '--parquet-file',
        default='gaa.parquet',
        help='Input Parquet file (default: gaa.parquet)'
    )
    parser.add_argument(
        '--output-dir',
        default='../../public/data/gaa/aggregates',
        help='Output directory for JSON files (default: ../../public/data/gaa/aggregates)'
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
    print("GAA Aggregate Generator")
    print("="*60 + "\n")
    
    # Check if parquet file exists
    if not parquet_path.exists():
        print(f"✗ Parquet file not found: {parquet_path}")
        print("\nPlease run gaa_csv_to_parquet.py first to generate the parquet file.")
        sys.exit(1)
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Output directory: {output_dir}\n")
    
    # Load parquet file
    print(f"Loading parquet file: {parquet_path}")
    try:
        df = pd.read_parquet(parquet_path)
        print(f"✓ Loaded {len(df):,} rows\n")
    except Exception as e:
        print(f"✗ Failed to load parquet file: {e}")
        sys.exit(1)
    
    # Ensure amt column is numeric (should already be numeric from gaa_csv_to_parquet.py)
    if 'amt' in df.columns:
        if df['amt'].dtype == 'object':
            print("⚠ WARNING: 'amt' column is object type (should be numeric from import)")
            print("  Converting to numeric with error handling...")
            df['amt'] = pd.to_numeric(df['amt'], errors='coerce').fillna(0)
        else:
            print(f"✓ 'amt' column is already numeric ({df['amt'].dtype})")
    else:
        print("✗ 'amt' column not found in parquet file")
        sys.exit(1)
    
    # Generate all aggregates
    print("Generating aggregates...\n")
    
    aggregates = {
        'departments.json': create_department_aggregates(df),
        'agencies.json': create_agency_aggregates(df),
        'fund_subcategories.json': create_fund_subcategory_aggregates(df),
        'expenses.json': create_expense_aggregates(df),
        'objects.json': create_object_aggregates(df),
        'yearly_totals.json': create_yearly_totals(df)
    }
    
    # Write JSON files
    print("\nWriting JSON files...")
    for filename, data in aggregates.items():
        output_path = output_dir / filename
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump({
                    'metadata': {
                        'title': f"GAA {filename.replace('.json', '').replace('_', ' ').title()}",
                        'source': 'General Appropriations Act',
                        'total_items': len(data)
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
