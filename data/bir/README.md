# BIR Collection Data Import

This directory contains scripts to transform BIR (Bureau of Internal Revenue) collection data from CSV format into SQL seed files, Parquet files, and JSON aggregates for visualization.

You can download the excel file from the Bureau of Internal Revenue (BIR) website. https://www.bir.gov.ph/collection-statistics

Data transformation has been done for you by removing the empty rows, totals, and other unnecessary data. You can find the transformed SQL files in the `data/bir/data/` directory.

## 📈 Interactive Dashboard

View the **BIR Tax Collection Dashboard** at:
- **Route:** `/bir`
- **URL:** http://localhost:5176/bir (when dev server is running)

### Dashboard Features

✨ **Interactive Visualizations:**
- 📊 **Regional Distribution Bar Chart** - Compare collections across regions
- 📈 **Monthly Trend Line Chart** - Track collection patterns over time  
- 🥧 **Regional Distribution Pie Chart** - See percentage breakdown
- 📉 **Top Areas Horizontal Bar Chart** - Identify highest collecting areas
- 📋 **Detailed Summary Table** - Full regional breakdown with rankings

🎛️ **Smart Filters:**
- **Region Filter:** View all regions or drill down to specific region
- **Top N Areas:** Customize to show top 5, 10, 15, or 20 areas
- **Year Filter:** Filter by specific year or view all years (ready for multi-year data)

📱 **Mobile Responsive:** Fully optimized for desktop, tablet, and mobile devices

💎 **Key Metrics:**
- Total collection across all regions (₱11.39M for 2024)
- Total records/data points (6,000)
- Number of regions covered (18)
- Number of areas/districts (103)

## Overview

The transformation script converts monthly BIR collection data from a wide CSV format (with month columns) into a normalized SQL format with one row per month.

### CSV Input Format

The script expects a CSV file with the following structure:

```csv
region,area,January,February,March,April,May,June,July,August,September,October,November,December,year
Region 1,Manila,1000000,1200000,1100000,1300000,1250000,1400000,1350000,1450000,1500000,1600000,1650000,1700000,2024
Region 1,Quezon City,800000,850000,900000,920000,950000,980000,1000000,1050000,1100000,1150000,1200000,1250000,2024
```

**Supported column variations:**
- Regions: `region`, `reg`
- Areas: `area`, `district`, `location`
- Months: `Jan`, `January`, `Feb`, `February`, etc. (case-insensitive)
- Year: `year`, `yr` (or defaults to 2024 if not present)

### SQL Output Format

The script generates SQL with:

```sql
CREATE TABLE bir_collections (
    id SERIAL PRIMARY KEY,
    region VARCHAR(255) NOT NULL,
    area VARCHAR(255) NOT NULL,
    month VARCHAR(20) NOT NULL,
    year INTEGER NOT NULL,
    amount NUMERIC(20, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(region, area, month, year)
);

INSERT INTO bir_collections (region, area, month, year, amount) VALUES
('Region 1', 'Manila', 'January', 2024, 1000000.00),
('Region 1', 'Manila', 'February', 2024, 1200000.00),
...
```

## Usage

Download the data first from huggingface.com/bettergovph

Put all the csv files in data/bir/data

Run

```
./process_bir_data.sh
```

### Option 1: Process All CSV Files in data/bir/data/ (Recommended)

This is the easiest method - just place your CSV files in the `data/bir/data/` directory and run:

```bash
# Navigate to the bir directory
cd data/bir

# Run the transformation (processes all CSV files in data/)
python transform_bir_collection.py
```

The script will:
- Automatically find all `.csv` files in `data/bir/data/`
- Process each file and combine the data
- Generate a single SQL file with timestamp: `bir_collections_YYYYMMDD_HHMMSS.sql`

### Option 2: Process a Specific File

```bash
python transform_bir_collection.py 2024_bir_collection.csv
```

### Option 3: Custom Input and Output

```bash
python transform_bir_collection.py input.csv custom_output.sql
```

## Features

- **Automatic column detection**: Intelligently identifies region, area, month, and year columns
- **Data cleaning**: 
  - Removes commas, currency symbols (₱, PHP)
  - Handles empty values, dashes, and N/A entries
  - Validates numeric amounts
- **Batch inserts**: Groups INSERT statements in batches of 500 for better performance
- **Error handling**: Warns about invalid data and skips problematic rows
- **SQL safety**: Escapes single quotes in region/area names
- **Idempotent**: Uses `CREATE TABLE IF NOT EXISTS` and unique constraints

## Data Validation

The script performs several validation checks:
- Skips rows with missing region or area
- Skips months with no amount or invalid amounts
- Only includes positive amounts
- Reports statistics: total rows, unique regions, unique areas

## Example Output

### Processing Multiple Files

```
============================================================
BIR Collection Data Transformer
Processing all CSV files in data/bir/data/
============================================================

Found 3 CSV file(s) in data/bir/data:
  - 2024_bir_q1.csv
  - 2024_bir_q2.csv
  - 2024_bir_q3.csv

Processing: 2024_bir_q1.csv
  ✓ Extracted 416 rows

Processing: 2024_bir_q2.csv
  ✓ Extracted 416 rows

Processing: 2024_bir_q3.csv
  ✓ Extracted 416 rows

Writing combined SQL file: bir_collections_20241130_143052.sql

============================================================
✓ Successfully processed 3 file(s)
✓ Total rows: 1248
✓ Unique regions: 18
✓ Unique areas: 104
✓ Output file: /path/to/bir_collections_20241130_143052.sql
============================================================
```

### Processing Single File

```
Transforming: 2024_bir_collection.csv -> bir_collections.sql

✓ Successfully created SQL file: bir_collections.sql
✓ Total rows: 1248
✓ Unique regions: 18
✓ Unique areas: 104
```

## Requirements

- Python 3.6+
- No external dependencies (uses only standard library)

## Directory Structure

```
data/bir/
├── data/                           # Place your CSV files here
│   ├── 2024_bir_q1.csv
│   ├── 2024_bir_q2.csv
│   └── 2024_bir_q3.csv
├── aggregates/                     # Generated JSON aggregates
│   ├── total_by_region.json
│   ├── total_by_area.json
│   ├── monthly_time_series.json
│   ├── total_by_year.json
│   ├── region_by_year.json
│   ├── region_by_month.json
│   ├── top_100_areas.json
│   └── granular_data.json
├── transform_bir_collection.py     # CSV to SQL transformation script
├── sql_to_parquet.py              # SQL to Parquet conversion script
├── create_aggregates.py           # Parquet to JSON aggregates script
├── README.md                       # This file
├── bir_collections_*.sql           # Generated SQL files (timestamped)
└── bir_collections.parquet         # Generated Parquet file
```

## Converting SQL to Parquet

After generating the SQL file, you can convert it to Parquet format for efficient storage and querying:

### Installation

First, install DuckDB:

```bash
pip install duckdb>=0.9.0
```

### Usage

```bash
# Basic usage (auto-generates output filename)
python sql_to_parquet.py bir_collections_20241130_143052.sql

# Custom output filename
python sql_to_parquet.py bir_collections.sql bir_data.parquet

# Custom table name (if different from 'bir_collections')
python sql_to_parquet.py input.sql output.parquet custom_table_name
```

### Features

- **In-memory processing**: Uses DuckDB for fast conversion
- **Snappy compression**: Efficient storage with Snappy compression
- **Automatic schema detection**: Reads table structure from SQL file
- **Progress reporting**: Shows row counts and file sizes

### Example Output

```
============================================================
SQL to Parquet Converter (DuckDB)
============================================================

Loading SQL file: bir_collections_20241130_143052.sql
Executing SQL statements...
✓ Loaded 1,248 rows into bir_collections
Exporting to Parquet: bir_collections_20241130_143052.parquet
✓ Successfully created Parquet file
✓ File size: 0.15 MB
✓ Output: bir_collections_20241130_143052.parquet

============================================================
Conversion complete!
============================================================
```

### Why Parquet?

- **Efficient storage**: Columnar format with compression (typically 10-100x smaller than CSV)
- **Fast queries**: Optimized for analytical queries
- **Schema preservation**: Maintains data types and column information
- **Wide compatibility**: Works with Pandas, DuckDB, Apache Spark, etc.

## Creating JSON Aggregates for Visualization

After generating the Parquet file, you can create JSON aggregates optimized for frontend visualization:

### Usage

```bash
# Basic usage (outputs to aggregates/ directory)
python3 create_aggregates.py bir_collections.parquet

# Custom output directory
python3 create_aggregates.py bir_collections.parquet --output-dir custom_aggregates/
```

### Generated Aggregates

The script creates 9 JSON files optimized for different visualizations:

1. **`total_by_region.json`** (2.6 KB) - Total collections per region
2. **`total_by_area.json`** (17.6 KB) - Total collections per area with region context
3. **`total_by_month.json`** (1.6 KB) - Monthly totals across all years (seasonal patterns)
4. **`total_by_year.json`** (0.3 KB) - Yearly totals (year-over-year trends)
5. **`region_by_year.json`** (3.4 KB) - Time series data grouped by region
6. **`monthly_time_series.json`** (1.7 KB) - Granular month-by-month data points
7. **`region_by_month.json`** (35.3 KB) - Seasonal patterns per region
8. **`top_100_areas.json`** (18.7 KB) - Rankings of top 100 performing areas
9. **`granular_data.json`** (1.1 MB) - Full dataset for custom client-side aggregation

### Features

- **Flexible structure**: Minimal server-side aggregation, allowing charts to do further processing
- **Month/year aware**: Includes `month_num` for easy sorting and filtering
- **Metadata included**: Each file has context about date ranges and data coverage
- **Grouped formats**: Data pre-grouped where it makes sense (e.g., region_by_year)
- **Frontend-ready**: JSON format with proper numeric types for direct consumption

### Example Output

```
================================================================================
BIR Tax Collection Aggregates Generator (JSON)
================================================================================

Input: bir_collections.parquet
Output directory: aggregates

Loading source data...
✓ Loaded 6,000 rows

Data Constraints:
  Years: 2024 - 2024 (1 years)
  Months per year: 12
  Regions: 18
  Areas: 103

Creating regional aggregates...
  ✓ total_by_region.json (18 regions)
  ✓ total_by_area.json (103 areas)
  ✓ total_by_month.json (12 months)
  ✓ total_by_year.json (1 years)

Creating time series aggregates...
  ✓ region_by_year.json (18 regions)
  ✓ monthly_time_series.json (12 data points)
  ✓ region_by_month.json (18 regions)

Creating ranking aggregates...
  ✓ top_100_areas.json (100 areas)

Creating granular data export...
  ✓ granular_data.json (6000 records)

✓ All aggregates saved to: aggregates/
```

### Complete Workflow

```bash
# 1. Transform CSV to SQL
python3 transform_bir_collection.py

# 2. Convert SQL to Parquet
python3 sql_to_parquet.py bir_collections_20241202_103032.sql

# 3. Create JSON aggregates for dashboard
python3 create_aggregates.py bir_collections.parquet

# 4. Copy aggregates to public directory (for web access)
cp aggregates/*.json ../../public/data/bir/aggregates/

# 5. View dashboard at http://localhost:5176/bir
```

## Integration

After generating the SQL file, you can import it into your database:

```bash
# PostgreSQL
psql -U username -d database_name -f bir_collections.sql

# MySQL
mysql -u username -p database_name < bir_collections.sql
```

## Troubleshooting

### "File not found" error
Make sure the CSV file is in the same directory or provide the full path.

### "Could not find month columns" error
Check that your CSV has month columns (Jan, January, Feb, February, etc.). The script is case-insensitive.

### Invalid amount warnings
The script will warn about invalid amounts but continue processing. Check the CSV for non-numeric values in month columns.

## Data Structure

Each row in the output represents:
- **region**: Geographic region (e.g., "NCR", "Region 1")
- **area**: Specific area/district within the region
- **month**: Full month name (January, February, etc.)
- **year**: Collection year
- **amount**: Collection amount in Philippine Peso (₱)

## Notes

- The script automatically creates indexes on region, area, year, and month for query performance
- A unique constraint prevents duplicate entries for the same region/area/month/year combination
- Timestamps are automatically added for audit purposes
