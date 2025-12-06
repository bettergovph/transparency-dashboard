#!/usr/bin/python3
"""
Generate hierarchical JSON aggregates from GAA Parquet data using SQL (DuckDB).

This is an SQL-based version for debugging purposes. It produces the same output
as create_aggregates.py but uses SQL queries instead of pandas groupby operations.

Usage:
    python create_aggregates_sql.py
    python create_aggregates_sql.py --parquet-file gaa.parquet --output-dir ../../public/data/gaa/aggregates
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, Any, List

try:
    import duckdb
except ImportError:
    print("✗ DuckDB is required. Install with: pip install duckdb")
    sys.exit(1)


# SQL function to clean and convert amt values
# Note: amt should already be numeric from gaa_csv_to_parquet.py
# This is kept as fallback for legacy data or debugging
CLEAN_AMT_SQL = """
CASE 
    WHEN TYPEOF(amt) IN ('DOUBLE', 'FLOAT', 'INTEGER', 'BIGINT') THEN CAST(amt AS DOUBLE)
    WHEN TRIM(COALESCE(CAST(amt AS VARCHAR), '')) IN ('', 'nan', '-', ' -   ') THEN 0
    WHEN TRIM(CAST(amt AS VARCHAR)) LIKE '(%' THEN -1 * CAST(REPLACE(REPLACE(REPLACE(TRIM(CAST(amt AS VARCHAR)), '(', ''), ')', ''), ',', '') AS DOUBLE)
    ELSE TRY_CAST(REPLACE(TRIM(CAST(amt AS VARCHAR)), ',', '') AS DOUBLE)
END
"""


def create_department_aggregates(con: duckdb.DuckDBPyConnection) -> List[Dict[str, Any]]:
    """
    Create department aggregates grouped by year using SQL.
    Groups by uacs_dpt_dsc (description) as the unique identifier since department codes are NOT unique.
    """
    print("  → Creating department aggregates...")
    
    query = f"""
    SELECT 
        uacs_dpt_dsc,
        MIN(department) as dept_code,
        year,
        COUNT(*) as count,
        SUM({CLEAN_AMT_SQL}) as amount
    FROM gaa_data
    WHERE uacs_dpt_dsc IS NOT NULL 
      AND uacs_dpt_dsc != 'nan'
      AND uacs_dpt_dsc != ''
    GROUP BY uacs_dpt_dsc, year
    ORDER BY uacs_dpt_dsc, year
    """
    
    result = con.execute(query).fetchall()
    
    # Build nested structure
    departments = {}
    for row in result:
        dept_desc = row[0]
        dept_code = str(row[1])
        year = str(int(row[2]))
        count = int(row[3])
        amount = float(row[4])
        
        if dept_desc not in departments:
            departments[dept_desc] = {
                'id': dept_desc,  # Use description as ID
                'code': dept_code,  # Store code for reference
                'description': dept_desc,
                'years': {}
            }
        
        departments[dept_desc]['years'][year] = {
            'count': count,
            'amount': amount
        }
    
    result_list = sorted(departments.values(), key=lambda x: x['description'])
    print(f"    ✓ Generated {len(result_list)} departments")
    
    # Print debug info for first department
    if result_list:
        print(f"    DEBUG: First department: {result_list[0]['code']} - {result_list[0]['description'][:50]}")
        print(f"    DEBUG: Years: {list(result_list[0]['years'].keys())}")
        first_year = list(result_list[0]['years'].keys())[0] if result_list[0]['years'] else None
        if first_year:
            print(f"    DEBUG: {first_year} - count: {result_list[0]['years'][first_year]['count']:,}, amount: {result_list[0]['years'][first_year]['amount']:,.2f}")
    
    return result_list


def create_agency_aggregates(con: duckdb.DuckDBPyConnection) -> List[Dict[str, Any]]:
    """
    Create agency aggregates grouped by year using SQL.
    Groups by uacs_dpt_dsc + uacs_agy_dsc as composite key since codes are NOT unique.
    """
    print("  → Creating agency aggregates...")
    
    query = f"""
    SELECT 
        uacs_dpt_dsc,
        uacs_agy_dsc,
        MIN(department) as dept_code,
        MIN(agency) as agency_code,
        year,
        COUNT(*) as count,
        SUM({CLEAN_AMT_SQL}) as amount
    FROM gaa_data
    WHERE uacs_dpt_dsc IS NOT NULL 
      AND uacs_dpt_dsc != 'nan'
      AND uacs_dpt_dsc != ''
      AND uacs_agy_dsc IS NOT NULL 
      AND uacs_agy_dsc != 'nan'
      AND uacs_agy_dsc != ''
    GROUP BY uacs_dpt_dsc, uacs_agy_dsc, year
    ORDER BY uacs_dpt_dsc, uacs_agy_dsc, year
    """
    
    result = con.execute(query).fetchall()
    
    # Build nested structure with description-based composite keys
    agencies = {}
    for row in result:
        dept_desc = row[0]
        agency_desc = row[1]
        dept_code = str(row[2])
        agency_code = str(row[3])
        year = str(int(row[4]))
        count = int(row[5])
        amount = float(row[6])
        
        composite_id = f"{dept_desc}::{agency_desc}"  # Composite key using descriptions
        
        if composite_id not in agencies:
            agencies[composite_id] = {
                'id': composite_id,
                'agency_code': agency_code,
                'description': agency_desc,
                'department_id': dept_desc,  # Reference to department description
                'department_code': dept_code,
                'years': {}
            }
        
        agencies[composite_id]['years'][year] = {
            'count': count,
            'amount': amount
        }
    
    result_list = sorted(agencies.values(), key=lambda x: (x['department_id'], x['description']))
    print(f"    ✓ Generated {len(result_list)} agencies")
    
    # Print debug info
    if result_list:
        print(f"    DEBUG: First agency: {result_list[0]['agency_code']} - {result_list[0]['description'][:40]}")
        first_year = list(result_list[0]['years'].keys())[0] if result_list[0]['years'] else None
        if first_year:
            print(f"    DEBUG: {first_year} - count: {result_list[0]['years'][first_year]['count']:,}, amount: {result_list[0]['years'][first_year]['amount']:,.2f}")
    
    return result_list


def create_fund_subcategory_aggregates(con: duckdb.DuckDBPyConnection) -> List[Dict[str, Any]]:
    """
    Create fund sub-category aggregates using SQL.
    Groups by department_desc + agency_desc + fund_desc as composite key.
    """
    print("  → Creating fund sub-category aggregates...")
    
    query = f"""
    SELECT 
        uacs_dpt_dsc,
        uacs_agy_dsc,
        uacs_fundsubcat_dsc,
        year,
        COUNT(*) as count,
        SUM({CLEAN_AMT_SQL}) as amount
    FROM gaa_data
    WHERE uacs_dpt_dsc IS NOT NULL AND uacs_dpt_dsc != 'nan' AND uacs_dpt_dsc != ''
      AND uacs_agy_dsc IS NOT NULL AND uacs_agy_dsc != 'nan' AND uacs_agy_dsc != ''
      AND uacs_fundsubcat_dsc IS NOT NULL AND uacs_fundsubcat_dsc != 'nan' AND uacs_fundsubcat_dsc != ''
    GROUP BY uacs_dpt_dsc, uacs_agy_dsc, uacs_fundsubcat_dsc, year
    ORDER BY uacs_dpt_dsc, uacs_agy_dsc, uacs_fundsubcat_dsc, year
    """
    
    result = con.execute(query).fetchall()
    
    # Build nested structure with description-based composite keys
    fund_subcats = {}
    for row in result:
        dept_desc = row[0]
        agency_desc = row[1]
        fund_desc = row[2]
        year = str(int(row[3]))
        count = int(row[4])
        amount = float(row[5])
        
        composite_id = f"{dept_desc}::{agency_desc}::{fund_desc}"  # Triple composite key
        
        if composite_id not in fund_subcats:
            fund_subcats[composite_id] = {
                'id': composite_id,
                'description': fund_desc,
                'department_id': dept_desc,
                'agency_id': f"{dept_desc}::{agency_desc}",  # Reference to agency composite ID
                'years': {}
            }
        
        fund_subcats[composite_id]['years'][year] = {
            'count': count,
            'amount': amount
        }
    
    result_list = sorted(fund_subcats.values(), key=lambda x: (x['department_id'], x['agency_id'], x['description']))
    print(f"    ✓ Generated {len(result_list)} fund sub-categories")
    
    return result_list


def create_expense_aggregates(con: duckdb.DuckDBPyConnection) -> List[Dict[str, Any]]:
    """
    Create expense category aggregates using SQL.
    Groups by department_desc + agency_desc + expense_desc as composite key.
    """
    print("  → Creating expense category aggregates...")
    
    query = f"""
    SELECT 
        uacs_dpt_dsc,
        uacs_agy_dsc,
        uacs_exp_cd,
        uacs_exp_dsc,
        year,
        COUNT(*) as count,
        SUM({CLEAN_AMT_SQL}) as amount
    FROM gaa_data
    WHERE uacs_dpt_dsc IS NOT NULL AND uacs_dpt_dsc != 'nan' AND uacs_dpt_dsc != ''
      AND uacs_agy_dsc IS NOT NULL AND uacs_agy_dsc != 'nan' AND uacs_agy_dsc != ''
      AND uacs_exp_dsc IS NOT NULL AND uacs_exp_dsc != 'nan' AND uacs_exp_dsc != ''
    GROUP BY uacs_dpt_dsc, uacs_agy_dsc, uacs_exp_cd, uacs_exp_dsc, year
    ORDER BY uacs_dpt_dsc, uacs_agy_dsc, uacs_exp_cd, year
    """
    
    result = con.execute(query).fetchall()
    
    # Build nested structure with description-based composite keys
    expenses = {}
    for row in result:
        dept_desc = row[0]
        agency_desc = row[1]
        exp_code = str(row[2])
        exp_desc = row[3]
        year = str(int(row[4]))
        count = int(row[5])
        amount = float(row[6])
        
        composite_id = f"{dept_desc}::{agency_desc}::{exp_desc}"  # Triple composite key
        
        if composite_id not in expenses:
            expenses[composite_id] = {
                'id': composite_id,
                'expense_code': exp_code,
                'description': exp_desc,
                'department_id': dept_desc,
                'agency_id': f"{dept_desc}::{agency_desc}",  # Reference to agency composite ID
                'years': {}
            }
        
        expenses[composite_id]['years'][year] = {
            'count': count,
            'amount': amount
        }
    
    result_list = sorted(expenses.values(), key=lambda x: (x['department_id'], x['agency_id'], x['expense_code']))
    print(f"    ✓ Generated {len(result_list)} expense categories")
    
    return result_list


def create_object_aggregates(con: duckdb.DuckDBPyConnection) -> List[Dict[str, Any]]:
    """
    Create object aggregates using SQL.
    Groups by department_desc + agency_desc + object_desc as composite key.
    """
    print("  → Creating object aggregates...")
    
    query = f"""
    SELECT 
        uacs_dpt_dsc,
        uacs_agy_dsc,
        uacs_sobj_cd,
        uacs_sobj_dsc,
        year,
        COUNT(*) as count,
        SUM({CLEAN_AMT_SQL}) as amount
    FROM gaa_data
    WHERE uacs_dpt_dsc IS NOT NULL AND uacs_dpt_dsc != 'nan' AND uacs_dpt_dsc != ''
      AND uacs_agy_dsc IS NOT NULL AND uacs_agy_dsc != 'nan' AND uacs_agy_dsc != ''
      AND uacs_sobj_dsc IS NOT NULL AND uacs_sobj_dsc != 'nan' AND uacs_sobj_dsc != ''
    GROUP BY uacs_dpt_dsc, uacs_agy_dsc, uacs_sobj_cd, uacs_sobj_dsc, year
    ORDER BY uacs_dpt_dsc, uacs_agy_dsc, uacs_sobj_cd, year
    """
    
    result = con.execute(query).fetchall()
    
    # Build nested structure with description-based composite keys
    objects = {}
    for row in result:
        dept_desc = row[0]
        agency_desc = row[1]
        obj_code = str(row[2])
        obj_desc = row[3]
        year = str(int(row[4]))
        count = int(row[5])
        amount = float(row[6])
        
        composite_id = f"{dept_desc}::{agency_desc}::{obj_desc}"  # Triple composite key
        
        if composite_id not in objects:
            objects[composite_id] = {
                'id': composite_id,
                'object_code': obj_code,
                'description': obj_desc,
                'department_id': dept_desc,
                'agency_id': f"{dept_desc}::{agency_desc}",  # Reference to agency composite ID
                'years': {}
            }
        
        objects[composite_id]['years'][year] = {
            'count': count,
            'amount': amount
        }
    
    result_list = sorted(objects.values(), key=lambda x: (x['department_id'], x['agency_id'], x['object_code']))
    print(f"    ✓ Generated {len(result_list)} objects")
    
    return result_list


def create_yearly_totals(con: duckdb.DuckDBPyConnection) -> List[Dict[str, Any]]:
    """
    Create year-by-year total aggregates using SQL.
    """
    print("  → Creating yearly totals...")
    
    query = f"""
    SELECT 
        year,
        COUNT(*) as count,
        SUM({CLEAN_AMT_SQL}) as amount
    FROM gaa_data
    GROUP BY year
    ORDER BY year
    """
    
    result = con.execute(query).fetchall()
    
    result_list = [
        {
            'year': int(row[0]),
            'count': int(row[1]),
            'amount': float(row[2])
        }
        for row in result
    ]
    
    print(f"    ✓ Generated {len(result_list)} years")
    
    # Print debug info for yearly totals
    for row in result_list:
        print(f"    DEBUG: Year {row['year']} - count: {row['count']:,}, amount: {row['amount']:,.2f}")
    
    return result_list


def print_data_sample(con: duckdb.DuckDBPyConnection):
    """
    Print sample data for debugging.
    """
    print("\n  → Data type validation:")
    
    # Check amt column type
    type_query = """
    SELECT TYPEOF(amt) as amt_type, COUNT(*) as count
    FROM gaa_data
    GROUP BY TYPEOF(amt)
    ORDER BY count DESC
    """
    
    type_results = con.execute(type_query).fetchall()
    print("    amt column types:")
    for row in type_results:
        print(f"      {row[0]}: {row[1]:,} rows")
    
    # Check if amt is properly numeric
    if len(type_results) == 1 and type_results[0][0] in ('DOUBLE', 'FLOAT', 'INTEGER', 'BIGINT'):
        print("    ✓ amt column is properly numeric!")
    else:
        print("    ⚠ WARNING: amt column has mixed or non-numeric types")
    
    print("\n  → Sample data from parquet:")
    
    query = """
    SELECT 
        year,
        department,
        uacs_dpt_dsc,
        agency,
        uacs_agy_dsc,
        amt,
        TYPEOF(amt) as amt_type
    FROM gaa_data
    LIMIT 5
    """
    
    result = con.execute(query).fetchall()
    
    for i, row in enumerate(result, 1):
        print(f"    Row {i}:")
        print(f"      Year: {row[0]}, Dept: {row[1]} ({row[2]})")
        print(f"      Agency: {row[3]} ({row[4]})")
        print(f"      Amount: {row[5]} (type: {row[6]})")
    
    # Check for problematic values (only relevant if amt is VARCHAR)
    print("\n  → Checking for problematic amt values:")
    
    # Check if amt is numeric type first
    if type_results and type_results[0][0] in ('DOUBLE', 'FLOAT', 'INTEGER', 'BIGINT'):
        print("    ✓ Skipping - amt is already numeric type")
    else:
        problem_query = """
        SELECT DISTINCT amt
        FROM gaa_data
        WHERE TRY_CAST(REPLACE(REPLACE(REPLACE(TRIM(COALESCE(CAST(amt AS VARCHAR), '0')), ',', ''), ' ', ''), '-', '0') AS DOUBLE) IS NULL
           OR CAST(amt AS VARCHAR) LIKE '%-%'
           OR amt = ''
           OR amt IS NULL
        LIMIT 20
        """
        
        problem_values = con.execute(problem_query).fetchall()
        if problem_values:
            print(f"    Found {len(problem_values)} problematic values:")
            for val in problem_values:
                print(f"      '{val[0]}'")
        else:
            print("    No problematic values found")
    
    # Check for data type issues
    print("\n  → Checking data types and statistics:")
    
    stats_query = f"""
    SELECT 
        COUNT(*) as total_rows,
        COUNT(DISTINCT year) as unique_years,
        COUNT(DISTINCT department) as unique_departments,
        COUNT(DISTINCT agency) as unique_agencies,
        MIN({CLEAN_AMT_SQL}) as min_amount,
        MAX({CLEAN_AMT_SQL}) as max_amount,
        AVG({CLEAN_AMT_SQL}) as avg_amount,
        SUM({CLEAN_AMT_SQL}) as total_amount
    FROM gaa_data
    """
    
    stats = con.execute(stats_query).fetchone()
    print(f"    Total rows: {stats[0]:,}")
    print(f"    Unique years: {stats[1]}")
    print(f"    Unique departments: {stats[2]}")
    print(f"    Unique agencies: {stats[3]}")
    print(f"    Min amount: {stats[4]:,.2f}")
    print(f"    Max amount: {stats[5]:,.2f}")
    print(f"    Avg amount: {stats[6]:,.2f}")
    print(f"    Total amount: {stats[7]:,.2f}")


def main():
    parser = argparse.ArgumentParser(
        description="Generate hierarchical JSON aggregates from GAA Parquet data using SQL"
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
    parser.add_argument(
        '--debug-only',
        action='store_true',
        help='Only print debug information without generating files'
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
    print("GAA Aggregate Generator (SQL Version)")
    print("="*60 + "\n")
    
    # Check if parquet file exists
    if not parquet_path.exists():
        print(f"✗ Parquet file not found: {parquet_path}")
        print("\nPlease run gaa_csv_to_parquet.py first to generate the parquet file.")
        sys.exit(1)
    
    # Create DuckDB connection
    print(f"Loading parquet file: {parquet_path}")
    con = duckdb.connect(':memory:')
    
    try:
        # Load parquet into DuckDB
        con.execute(f"CREATE TABLE gaa_data AS SELECT * FROM read_parquet('{parquet_path}')")
        row_count = con.execute("SELECT COUNT(*) FROM gaa_data").fetchone()[0]
        print(f"✓ Loaded {row_count:,} rows into DuckDB\n")
    except Exception as e:
        print(f"✗ Failed to load parquet file: {e}")
        sys.exit(1)
    
    # Print sample data for debugging
    print_data_sample(con)
    
    if args.debug_only:
        print("\n" + "="*60)
        print("Debug mode - no files generated")
        print("="*60 + "\n")
        return
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"\nOutput directory: {output_dir}\n")
    
    # Generate all aggregates
    print("Generating aggregates...\n")
    
    aggregates = {
        'departments.json': create_department_aggregates(con),
        'agencies.json': create_agency_aggregates(con),
        'fund_subcategories.json': create_fund_subcategory_aggregates(con),
        'expenses.json': create_expense_aggregates(con),
        'objects.json': create_object_aggregates(con),
        'yearly_totals.json': create_yearly_totals(con)
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
                        'source': 'General Appropriations Act (SQL Version)',
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
