#!/usr/bin/python3
"""
Test script to validate GAA hierarchy extraction using National Museum of the Philippines as test case.

This script verifies that all 7 levels of the hierarchy are correctly extracted:
1. Department
2. Agency (National Museum of the Philippines)
3. FPAP
4. Operating Unit
5. Fund Sub-Category
6. Expense Category
7. Object

Usage:
    python test_hierarchy.py
    python test_hierarchy.py --parquet-file gaa.parquet
"""

import argparse
import sys
from pathlib import Path
from typing import Dict, Any, List

import pandas as pd


def test_hierarchy_extraction(df: pd.DataFrame, test_agency: str = "National Museum of the Philippines") -> Dict[str, Any]:
    """
    Test hierarchy extraction for a specific agency.
    
    Args:
        df: DataFrame with GAA data
        test_agency: Agency name to test (default: National Museum of the Philippines)
    
    Returns:
        Dictionary with test results
    """
    results = {
        'agency': test_agency,
        'success': True,
        'errors': [],
        'hierarchy': {}
    }
    
    # Filter for test agency
    agency_df = df[df['uacs_agy_dsc'].str.contains(test_agency, na=False, case=False)]
    
    if len(agency_df) == 0:
        results['success'] = False
        results['errors'].append(f"No data found for agency: {test_agency}")
        return results
    
    print(f"\n{'='*80}")
    print(f"Testing Hierarchy Extraction: {test_agency}")
    print(f"{'='*80}\n")
    print(f"Total rows for this agency: {len(agency_df):,}\n")
    
    # Level 1: Department
    print("Level 1: Department")
    departments = agency_df['department'].unique()
    dept_descs = agency_df['uacs_dpt_dsc'].unique()
    print(f"  Found {len(departments)} department(s): {list(departments)}")
    print(f"  Descriptions: {list(dept_descs)}")
    results['hierarchy']['departments'] = {
        'count': len(departments),
        'codes': list(departments),
        'descriptions': list(dept_descs)
    }
    
    # Level 2: Agency
    print("\nLevel 2: Agency")
    agencies = agency_df['agency'].unique()
    agency_descs = agency_df['uacs_agy_dsc'].unique()
    print(f"  Found {len(agencies)} agency code(s): {list(agencies)}")
    print(f"  Descriptions: {list(agency_descs)}")
    results['hierarchy']['agencies'] = {
        'count': len(agencies),
        'codes': list(agencies),
        'descriptions': list(agency_descs)
    }
    
    # Level 3: FPAP
    print("\nLevel 3: FPAP (Financial Plan and Activity Program)")
    fpap_df = agency_df[agency_df['prexc_fpap_id'].notna() & (agency_df['prexc_fpap_id'] != '') & (agency_df['prexc_fpap_id'] != 'nan')]
    fpaps = fpap_df['prexc_fpap_id'].unique() if len(fpap_df) > 0 else []
    fpap_descs = fpap_df['dsc'].unique() if len(fpap_df) > 0 else []
    print(f"  Found {len(fpaps)} FPAP(s)")
    if len(fpaps) > 0:
        print(f"  Sample codes: {list(fpaps)[:5]}")
        print(f"  Sample descriptions: {list(fpap_descs)[:3]}")
    else:
        print("  ⚠ No FPAP codes found (may be expected for some agencies)")
    results['hierarchy']['fpaps'] = {
        'count': len(fpaps),
        'sample_codes': list(fpaps)[:5],
        'sample_descriptions': list(fpap_descs)[:3]
    }
    
    # Level 4: Operating Unit
    print("\nLevel 4: Operating Unit")
    operunit_df = agency_df[
        agency_df['prexc_fpap_id'].notna() & (agency_df['prexc_fpap_id'] != '') & (agency_df['prexc_fpap_id'] != 'nan') &
        agency_df['operunit'].notna() & (agency_df['operunit'] != '') & (agency_df['operunit'] != 'nan')
    ]
    operunits = operunit_df['operunit'].unique() if len(operunit_df) > 0 else []
    operunit_descs = operunit_df['uacs_oper_dsc'].unique() if len(operunit_df) > 0 else []
    print(f"  Found {len(operunits)} operating unit(s)")
    if len(operunits) > 0:
        print(f"  Sample codes: {list(operunits)[:5]}")
        print(f"  Sample descriptions: {list(operunit_descs)[:3]}")
    else:
        print("  ⚠ No operating units found (may be expected for some agencies)")
    results['hierarchy']['operating_units'] = {
        'count': len(operunits),
        'sample_codes': list(operunits)[:5],
        'sample_descriptions': list(operunit_descs)[:3]
    }
    
    # Level 5: Fund Sub-Category
    print("\nLevel 5: Fund Sub-Category")
    fund_df = agency_df[agency_df['fundcd'].notna() & (agency_df['fundcd'] != '') & (agency_df['fundcd'] != 'nan')]
    funds = fund_df['fundcd'].unique() if len(fund_df) > 0 else []
    fund_descs = fund_df['uacs_fundsubcat_dsc'].unique() if len(fund_df) > 0 else []
    print(f"  Found {len(funds)} fund sub-category code(s)")
    if len(funds) > 0:
        print(f"  Codes: {list(funds)[:10]}")
        print(f"  Sample descriptions: {list(fund_descs)[:3]}")
    else:
        print("  ⚠ No fund codes found")
        results['success'] = False
        results['errors'].append("No fund codes found")
    results['hierarchy']['fund_subcategories'] = {
        'count': len(funds),
        'codes': list(funds)[:10],
        'sample_descriptions': list(fund_descs)[:3]
    }
    
    # Level 6: Expense Category
    print("\nLevel 6: Expense Category")
    expense_df = agency_df[agency_df['uacs_exp_cd'].notna() & (agency_df['uacs_exp_cd'] != '') & (agency_df['uacs_exp_cd'] != 'nan')]
    expenses = expense_df['uacs_exp_cd'].unique() if len(expense_df) > 0 else []
    expense_descs = expense_df['uacs_exp_dsc'].unique() if len(expense_df) > 0 else []
    print(f"  Found {len(expenses)} expense category code(s)")
    if len(expenses) > 0:
        print(f"  Sample codes: {list(expenses)[:10]}")
        print(f"  Sample descriptions: {list(expense_descs)[:3]}")
    else:
        print("  ⚠ No expense codes found")
        results['success'] = False
        results['errors'].append("No expense codes found")
    results['hierarchy']['expenses'] = {
        'count': len(expenses),
        'sample_codes': list(expenses)[:10],
        'sample_descriptions': list(expense_descs)[:3]
    }
    
    # Level 7: Object
    print("\nLevel 7: Object")
    object_df = agency_df[agency_df['uacs_sobj_cd'].notna() & (agency_df['uacs_sobj_cd'] != '') & (agency_df['uacs_sobj_cd'] != 'nan')]
    objects = object_df['uacs_sobj_cd'].unique() if len(object_df) > 0 else []
    object_descs = object_df['uacs_sobj_dsc'].unique() if len(object_df) > 0 else []
    print(f"  Found {len(objects)} object code(s)")
    if len(objects) > 0:
        print(f"  Sample codes: {list(objects)[:10]}")
        print(f"  Sample descriptions: {list(object_descs)[:3]}")
    else:
        print("  ⚠ No object codes found")
        results['success'] = False
        results['errors'].append("No object codes found")
    results['hierarchy']['objects'] = {
        'count': len(objects),
        'sample_codes': list(objects)[:10],
        'sample_descriptions': list(object_descs)[:3]
    }
    
    # Test composite key generation
    print(f"\n{'='*80}")
    print("Testing Composite Key Generation")
    print(f"{'='*80}\n")
    
    # Sample composite keys
    if len(agency_df) > 0:
        sample_row = agency_df.iloc[0]
        dept_id = str(sample_row['department'])
        agency_code = str(sample_row['agency'])
        
        print(f"Sample composite keys for first row:")
        print(f"  Department ID: {dept_id}")
        print(f"  Agency ID: {dept_id}-{agency_code}")
        
        if pd.notna(sample_row['prexc_fpap_id']) and sample_row['prexc_fpap_id'] != '' and sample_row['prexc_fpap_id'] != 'nan':
            fpap_code = str(sample_row['prexc_fpap_id'])
            print(f"  FPAP ID: {dept_id}-{agency_code}-{fpap_code}")
            
            if pd.notna(sample_row['operunit']) and sample_row['operunit'] != '' and sample_row['operunit'] != 'nan':
                operunit_code = str(sample_row['operunit'])
                print(f"  Operating Unit ID: {dept_id}-{agency_code}-{fpap_code}-{operunit_code}")
                
                if pd.notna(sample_row['fundcd']) and sample_row['fundcd'] != '' and sample_row['fundcd'] != 'nan':
                    fund_code = str(sample_row['fundcd'])
                    print(f"  Fund ID: {dept_id}-{agency_code}-{fpap_code}-{operunit_code}-{fund_code}")
                    
                    if pd.notna(sample_row['uacs_exp_cd']) and sample_row['uacs_exp_cd'] != '' and sample_row['uacs_exp_cd'] != 'nan':
                        exp_code = str(sample_row['uacs_exp_cd'])
                        print(f"  Expense ID: {dept_id}-{agency_code}-{fpap_code}-{operunit_code}-{fund_code}-{exp_code}")
                        
                        if pd.notna(sample_row['uacs_sobj_cd']) and sample_row['uacs_sobj_cd'] != '' and sample_row['uacs_sobj_cd'] != 'nan':
                            obj_code = str(sample_row['uacs_sobj_cd'])
                            print(f"  Object ID: {dept_id}-{agency_code}-{fpap_code}-{operunit_code}-{fund_code}-{exp_code}-{obj_code}")
        
        # Display sample row
        print(f"\n{'='*80}")
        print("Sample Row Data")
        print(f"{'='*80}\n")
        print(f"Department: {sample_row['department']} - {sample_row['uacs_dpt_dsc']}")
        print(f"Agency: {sample_row['agency']} - {sample_row['uacs_agy_dsc']}")
        print(f"FPAP: {sample_row['prexc_fpap_id']} - {sample_row['dsc']}")
        print(f"Operating Unit: {sample_row['operunit']} - {sample_row['uacs_oper_dsc']}")
        print(f"Fund: {sample_row['fundcd']} - {sample_row['uacs_fundsubcat_dsc']}")
        print(f"Expense: {sample_row['uacs_exp_cd']} - {sample_row['uacs_exp_dsc']}")
        print(f"Object: {sample_row['uacs_sobj_cd']} - {sample_row['uacs_sobj_dsc']}")
        print(f"Amount: {sample_row['amt']}")
        print(f"Year: {sample_row['year']}")
    
    return results


def main():
    parser = argparse.ArgumentParser(
        description="Test GAA hierarchy extraction with National Museum as test case"
    )
    parser.add_argument(
        '--parquet-file',
        default='gaa.parquet',
        help='Input Parquet file (default: gaa.parquet)'
    )
    parser.add_argument(
        '--test-agency',
        default='National Museum of the Philippines',
        help='Agency name to test (default: National Museum of the Philippines)'
    )
    args = parser.parse_args()
    
    # Resolve paths
    script_dir = Path(__file__).parent
    parquet_path = Path(args.parquet_file)
    if not parquet_path.is_absolute():
        parquet_path = script_dir / parquet_path
    
    print("\n" + "="*80)
    print("GAA Hierarchy Extraction Test")
    print("="*80 + "\n")
    
    # Check if parquet file exists
    if not parquet_path.exists():
        print(f"✗ Parquet file not found: {parquet_path}")
        print("\nPlease run gaa_csv_to_parquet.py first to generate the parquet file.")
        sys.exit(1)
    
    # Load parquet file
    print(f"Loading parquet file: {parquet_path}")
    try:
        df = pd.read_parquet(parquet_path)
        print(f"✓ Loaded {len(df):,} rows")
        print(f"✓ Columns: {df.columns.tolist()}\n")
    except Exception as e:
        print(f"✗ Failed to load parquet file: {e}")
        sys.exit(1)
    
    # Run test
    results = test_hierarchy_extraction(df, args.test_agency)
    
    # Print summary
    print(f"\n{'='*80}")
    print("Test Summary")
    print(f"{'='*80}\n")
    
    if results['success']:
        print("✓ All hierarchy levels successfully extracted!")
        print("\nHierarchy Summary:")
        for level, data in results['hierarchy'].items():
            print(f"  {level}: {data['count']} items")
    else:
        print("✗ Test failed with errors:")
        for error in results['errors']:
            print(f"  - {error}")
    
    print(f"\n{'='*80}\n")
    
    # Return exit code
    sys.exit(0 if results['success'] else 1)


if __name__ == '__main__':
    main()
