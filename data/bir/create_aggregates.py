#!/usr/bin/env python3
"""
Create aggregated JSON files from BIR collection data for visualization dashboards.

This script generates flexible, minimal aggregates that can be further processed
by frontend charts/scripts. Designed to be aware of month/year constraints in the data.

Usage:
    python create_aggregates.py bir_collections.parquet
    python create_aggregates.py bir_collections.parquet --output-dir aggregates/
"""

import duckdb
import sys
import json
from pathlib import Path
from datetime import datetime


def create_aggregates(input_parquet, output_dir='aggregates'):
    """
    Create multiple aggregate JSON files for visualization.
    
    Args:
        input_parquet: Path to source BIR collections Parquet file
        output_dir: Directory to save aggregate JSON files
    """
    
    if not Path(input_parquet).exists():
        print(f"Error: Input file '{input_parquet}' not found.")
        sys.exit(1)
    
    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    print(f"\n{'='*80}")
    print(f"BIR Tax Collection Aggregates Generator (JSON)")
    print(f"{'='*80}\n")
    print(f"Input: {input_parquet}")
    print(f"Output directory: {output_dir}\n")
    
    # Connect to DuckDB
    con = duckdb.connect(':memory:')
    
    # Load source data
    print("Loading source data...")
    con.execute(f"CREATE TABLE bir_collections AS SELECT * FROM '{input_parquet}'")
    
    # Remap Large Taxpayers Service to its own region
    con.execute("""
        UPDATE bir_collections 
        SET region = 'Large Taxpayers Service'
        WHERE area = 'Large Taxpayers Service'
    """)
    
    total_rows = con.execute("SELECT COUNT(*) FROM bir_collections").fetchone()[0]
    print(f"✓ Loaded {total_rows:,} rows")
    print(f"✓ Separated 'Large Taxpayers Service' as independent region\n")
    
    # Get data constraints
    constraints = con.execute("""
        SELECT 
            MIN(year) as min_year,
            MAX(year) as max_year,
            COUNT(DISTINCT year) as total_years,
            COUNT(DISTINCT month) as total_months,
            COUNT(DISTINCT region) as total_regions,
            COUNT(DISTINCT area) as total_areas
        FROM bir_collections
    """).fetchone()
    
    print(f"Data Constraints:")
    print(f"  Years: {constraints[0]} - {constraints[1]} ({constraints[2]} years)")
    print(f"  Months per year: {constraints[3]}")
    print(f"  Regions: {constraints[4]}")
    print(f"  Areas: {constraints[5]}\n")
    
    aggregates_created = []
    
    # ================================================================
    # 1. TOTAL BY REGION
    # ================================================================
    print("Creating regional aggregates...")
    
    result = con.execute("""
        SELECT 
            region,
            SUM(amount) as total,
            COUNT(*) as count,
            AVG(amount) as average
        FROM bir_collections
        GROUP BY region
        ORDER BY total DESC
    """).fetchall()
    
    data = {
        "metadata": {
            "title": "Total Tax Collection by Region",
            "generated_at": datetime.now().isoformat(),
            "years_covered": f"{constraints[0]}-{constraints[1]}",
            "total_records": sum(r[2] for r in result)
        },
        "data": [
            {
                "region": row[0],
                "total": float(row[1]),
                "count": row[2],
                "average": float(row[3])
            }
            for row in result
        ]
    }
    
    filename = f"{output_dir}/total_by_region.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    aggregates_created.append("total_by_region.json")
    print(f"  ✓ total_by_region.json ({len(data['data'])} regions)")
    
    # ================================================================
    # 2. TOTAL BY AREA (with region context)
    # ================================================================
    result = con.execute("""
        SELECT 
            region,
            area,
            SUM(amount) as total,
            COUNT(*) as count,
            AVG(amount) as average
        FROM bir_collections
        GROUP BY region, area
        ORDER BY total DESC
    """).fetchall()
    
    data = {
        "metadata": {
            "title": "Total Tax Collection by Area",
            "generated_at": datetime.now().isoformat(),
            "years_covered": f"{constraints[0]}-{constraints[1]}",
            "total_records": sum(r[3] for r in result)
        },
        "data": [
            {
                "region": row[0],
                "area": row[1],
                "total": float(row[2]),
                "count": row[3],
                "average": float(row[4])
            }
            for row in result
        ]
    }
    
    filename = f"{output_dir}/total_by_area.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    aggregates_created.append("total_by_area.json")
    print(f"  ✓ total_by_area.json ({len(data['data'])} areas)")
    
    # ================================================================
    # 2b. AREA BY YEAR (for year-aware drill-down)
    # ================================================================
    result = con.execute("""
        SELECT 
            region,
            area,
            year,
            SUM(amount) as total,
            COUNT(*) as count,
            AVG(amount) as average
        FROM bir_collections
        GROUP BY region, area, year
        ORDER BY year, region, total DESC
    """).fetchall()
    
    data = {
        "metadata": {
            "title": "Tax Collection by Area and Year",
            "generated_at": datetime.now().isoformat(),
            "years_covered": f"{constraints[0]}-{constraints[1]}",
            "note": "Year-aware area data for drill-down functionality"
        },
        "data": [
            {
                "region": row[0],
                "area": row[1],
                "year": row[2],
                "total": float(row[3]),
                "count": row[4],
                "average": float(row[5])
            }
            for row in result
        ]
    }
    
    filename = f"{output_dir}/area_by_year.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    aggregates_created.append("area_by_year.json")
    print(f"  ✓ area_by_year.json ({len(data['data'])} area-year combinations)")
    
    # ================================================================
    # 3. TOTAL BY MONTH (across all years)
    # ================================================================
    result = con.execute("""
        SELECT 
            month,
            SUM(amount) as total,
            COUNT(*) as count,
            AVG(amount) as average
        FROM bir_collections
        GROUP BY month
        ORDER BY 
            CASE month
                WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3
                WHEN 'April' THEN 4 WHEN 'May' THEN 5 WHEN 'June' THEN 6
                WHEN 'July' THEN 7 WHEN 'August' THEN 8 WHEN 'September' THEN 9
                WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12
            END
    """).fetchall()
    
    data = {
        "metadata": {
            "title": "Total Tax Collection by Month (All Years Combined)",
            "generated_at": datetime.now().isoformat(),
            "years_covered": f"{constraints[0]}-{constraints[1]}",
            "note": "Aggregates same month across multiple years"
        },
        "data": [
            {
                "month": row[0],
                "total": float(row[1]),
                "count": row[2],
                "average": float(row[3])
            }
            for row in result
        ]
    }
    
    filename = f"{output_dir}/total_by_month.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    aggregates_created.append("total_by_month.json")
    print(f"  ✓ total_by_month.json ({len(data['data'])} months)")
    
    # ================================================================
    # 4. TOTAL BY YEAR
    # ================================================================
    result = con.execute("""
        SELECT 
            year,
            SUM(amount) as total,
            COUNT(*) as count,
            AVG(amount) as average
        FROM bir_collections
        GROUP BY year
        ORDER BY year
    """).fetchall()
    
    data = {
        "metadata": {
            "title": "Total Tax Collection by Year",
            "generated_at": datetime.now().isoformat(),
            "years_covered": f"{constraints[0]}-{constraints[1]}"
        },
        "data": [
            {
                "year": row[0],
                "total": float(row[1]),
                "count": row[2],
                "average": float(row[3])
            }
            for row in result
        ]
    }
    
    filename = f"{output_dir}/total_by_year.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    aggregates_created.append("total_by_year.json")
    print(f"  ✓ total_by_year.json ({len(data['data'])} years)")
    
    # ================================================================
    # 5. REGION BY YEAR (time series)
    # ================================================================
    print("\nCreating time series aggregates...")
    
    result = con.execute("""
        SELECT 
            region,
            year,
            SUM(amount) as total,
            COUNT(*) as count
        FROM bir_collections
        GROUP BY region, year
        ORDER BY region, year
    """).fetchall()
    
    # Group by region for easier frontend consumption
    by_region = {}
    for row in result:
        region = row[0]
        if region not in by_region:
            by_region[region] = []
        by_region[region].append({
            "year": row[1],
            "total": float(row[2]),
            "count": row[3]
        })
    
    data = {
        "metadata": {
            "title": "Tax Collection Time Series by Region",
            "generated_at": datetime.now().isoformat(),
            "years_covered": f"{constraints[0]}-{constraints[1]}"
        },
        "data": [
            {
                "region": region,
                "values": values
            }
            for region, values in by_region.items()
        ]
    }
    
    filename = f"{output_dir}/region_by_year.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    aggregates_created.append("region_by_year.json")
    print(f"  ✓ region_by_year.json ({len(data['data'])} regions)")
    
    # ================================================================
    # 6. MONTHLY TIME SERIES (year-month granular data)
    # ================================================================
    result = con.execute("""
        SELECT 
            year,
            month,
            SUM(amount) as total,
            COUNT(*) as count
        FROM bir_collections
        GROUP BY year, month
        ORDER BY year, 
            CASE month
                WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3
                WHEN 'April' THEN 4 WHEN 'May' THEN 5 WHEN 'June' THEN 6
                WHEN 'July' THEN 7 WHEN 'August' THEN 8 WHEN 'September' THEN 9
                WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12
            END
    """).fetchall()
    
    # Get month number for sorting/indexing
    month_to_num = {
        'January': 1, 'February': 2, 'March': 3, 'April': 4,
        'May': 5, 'June': 6, 'July': 7, 'August': 8,
        'September': 9, 'October': 10, 'November': 11, 'December': 12
    }
    
    data = {
        "metadata": {
            "title": "Monthly Tax Collection Time Series",
            "generated_at": datetime.now().isoformat(),
            "years_covered": f"{constraints[0]}-{constraints[1]}",
            "note": "Granular month-by-month data for trend analysis"
        },
        "data": [
            {
                "year": row[0],
                "month": row[1],
                "month_num": month_to_num[row[1]],
                "total": float(row[2]),
                "count": row[3]
            }
            for row in result
        ]
    }
    
    filename = f"{output_dir}/monthly_time_series.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    aggregates_created.append("monthly_time_series.json")
    print(f"  ✓ monthly_time_series.json ({len(data['data'])} data points)")
    
    # ================================================================
    # 7. REGION BY MONTH (seasonal patterns)
    # ================================================================
    result = con.execute("""
        SELECT 
            region,
            month,
            SUM(amount) as total,
            COUNT(*) as count,
            AVG(amount) as average
        FROM bir_collections
        GROUP BY region, month
        ORDER BY region,
            CASE month
                WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3
                WHEN 'April' THEN 4 WHEN 'May' THEN 5 WHEN 'June' THEN 6
                WHEN 'July' THEN 7 WHEN 'August' THEN 8 WHEN 'September' THEN 9
                WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12
            END
    """).fetchall()
    
    # Group by region
    by_region = {}
    for row in result:
        region = row[0]
        if region not in by_region:
            by_region[region] = []
        by_region[region].append({
            "month": row[1],
            "month_num": month_to_num[row[1]],
            "total": float(row[2]),
            "count": row[3],
            "average": float(row[4])
        })
    
    data = {
        "metadata": {
            "title": "Regional Tax Collection by Month (Seasonal Patterns)",
            "generated_at": datetime.now().isoformat(),
            "years_covered": f"{constraints[0]}-{constraints[1]}",
            "note": "Aggregates same month across all years per region"
        },
        "data": [
            {
                "region": region,
                "months": values
            }
            for region, values in by_region.items()
        ]
    }
    
    filename = f"{output_dir}/region_by_month.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    aggregates_created.append("region_by_month.json")
    print(f"  ✓ region_by_month.json ({len(data['data'])} regions)")
    
    # ================================================================
    # 8. TOP AREAS (flexible ranking)
    # ================================================================
    print("\nCreating ranking aggregates...")
    
    result = con.execute("""
        SELECT 
            region,
            area,
            SUM(amount) as total,
            COUNT(*) as count,
            AVG(amount) as average
        FROM bir_collections
        GROUP BY region, area
        ORDER BY total DESC
        LIMIT 100
    """).fetchall()
    
    data = {
        "metadata": {
            "title": "Top 100 Areas by Tax Collection",
            "generated_at": datetime.now().isoformat(),
            "years_covered": f"{constraints[0]}-{constraints[1]}"
        },
        "data": [
            {
                "rank": idx + 1,
                "region": row[0],
                "area": row[1],
                "total": float(row[2]),
                "count": row[3],
                "average": float(row[4])
            }
            for idx, row in enumerate(result)
        ]
    }
    
    filename = f"{output_dir}/top_100_areas.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    aggregates_created.append("top_100_areas.json")
    print(f"  ✓ top_100_areas.json ({len(data['data'])} areas)")
    
    # ================================================================
    # 9. FULL GRANULAR DATA (filtered, for custom aggregation)
    # ================================================================
    print("\nCreating granular data export...")
    
    result = con.execute("""
        SELECT 
            region,
            area,
            month,
            year,
            amount
        FROM bir_collections
        ORDER BY year, 
            CASE month
                WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3
                WHEN 'April' THEN 4 WHEN 'May' THEN 5 WHEN 'June' THEN 6
                WHEN 'July' THEN 7 WHEN 'August' THEN 8 WHEN 'September' THEN 9
                WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12
            END,
            region,
            area
    """).fetchall()
    
    data = {
        "metadata": {
            "title": "Full Granular BIR Collection Data",
            "generated_at": datetime.now().isoformat(),
            "years_covered": f"{constraints[0]}-{constraints[1]}",
            "total_records": len(result),
            "note": "Complete dataset for custom client-side aggregation"
        },
        "data": [
            {
                "region": row[0],
                "area": row[1],
                "month": row[2],
                "month_num": month_to_num[row[2]],
                "year": row[3],
                "amount": float(row[4])
            }
            for row in result
        ]
    }
    
    filename = f"{output_dir}/granular_data.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    aggregates_created.append("granular_data.json")
    print(f"  ✓ granular_data.json ({len(data['data'])} records)")
    
    # ================================================================
    # SUMMARY
    # ================================================================
    print(f"\n{'='*80}")
    print(f"Summary")
    print(f"{'='*80}\n")
    print(f"Created {len(aggregates_created)} aggregate files:")
    for filename in aggregates_created:
        file_path = Path(output_dir) / filename
        file_size = file_path.stat().st_size / 1024  # KB
        print(f"  • {filename:<35} {file_size:>8.2f} KB")
    
    print(f"\n✓ All aggregates saved to: {output_dir}/\n")
    
    con.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python create_aggregates.py <input.parquet> [--output-dir <dir>]")
        print("\nExample:")
        print("  python create_aggregates.py bir_collections.parquet")
        print("  python create_aggregates.py bir_collections.parquet --output-dir aggregates/")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_directory = 'aggregates'
    
    # Parse optional output directory
    if len(sys.argv) >= 4 and sys.argv[2] == '--output-dir':
        output_directory = sys.argv[3]
    
    create_aggregates(input_file, output_directory)
