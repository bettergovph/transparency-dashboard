# PhilGEPS Data Setup

This guide explains how to set up and import PhilGEPS procurement data into MeiliSearch.

## Prerequisites

- [DuckDB](https://duckdb.org/) installed
- Python 3.x with pip
- MeiliSearch instance running
- MeiliSearch master API key (for write access)

## Step 1: Download the Data

Download the `philgeps.parquet` file from Hugging Face:

```bash
# Visit or download from:
https://huggingface.co/datasets/bettergovph/philgeps-data/tree/main
```

Save the file to the `data/philgeps/` directory.

## Step 2: Extract Data with DuckDB

Use DuckDB to extract and prepare the aggregated data using the provided SQL script:

```bash
cd data/philgeps
duckdb < philgeps.parquet
```

This will create the necessary parquet files for aggregated data (area_of_deliveries, awardees, business_categories, organizations).

## Step 3: Split CSV into Batches

**Important:** For large datasets, the CSV file must be split into smaller batch files before importing to MeiliSearch. This prevents memory issues and allows for more efficient processing.

Convert the parquet file to CSV and split it into batches:

```bash
cd data

# First, export the parquet to CSV using DuckDB
duckdb -c "COPY (SELECT uuid() as id, * FROM 'philgeps/philgeps.parquet') TO 'philgeps/philgeps.csv' (HEADER, DELIMITER ',')"

# Split the CSV into batch files (50,000 rows per batch)
python split-csv.py philgeps/philgeps.csv --batch-size 50000 --output-dir philgeps/philgeps_batches
```

This creates smaller CSV files in `philgeps/philgeps_batches/` directory (e.g., `batch_0001.csv`, `batch_0002.csv`, etc.).

**Note:** You can adjust the `--batch-size` parameter based on your system's memory. Larger batches = faster import but more memory usage.

## Step 4: Set Environment Variables

Create a `.env` file in the project root with your MeiliSearch configuration:

```bash
VITE_MEILISEARCH_HOST=http://localhost:7700
VITE_MEILISEARCH_API_KEY=your_master_api_key_here
VITE_MEILISEARCH_INDEX_NAME=philgeps
```

**Important:** You need the MeiliSearch **master key** for write access to create and populate indexes.

## Step 5: Install Python Dependencies

Install the required Python packages:

```bash
cd data
pip install -r requirements.txt
```

## Step 6: Import Main PhilGEPS Data

Run the main import script to load PhilGEPS contracts data into MeiliSearch.

**Option A: Import from batch files (Recommended for large datasets)**

```bash
cd data/philgeps

# Import each batch file
for batch in philgeps_batches/batch_*.csv; do
    python import.py "$batch" --batch-size 50000
done
```

**Option B: Import single CSV file (Only for smaller datasets)**

```bash
cd data/philgeps
python import.py philgeps.csv --batch-size 50000
```

This will:
- Create the main `philgeps` index
- Import all contract records
- Configure searchable attributes and filters

## Step 7: Import Aggregated Data

Run the extras import script to load pre-aggregated filter data:

```bash
cd data/philgeps
python import_extras.py
```

This will create filter indexes for:
- `philgeps_area_of_deliveries` - Location/area aggregates
- `philgeps_awardees` - Contractor/awardee aggregates
- `philgeps_business_categories` - Category aggregates
- `philgeps_organizations` - Organization aggregates

Each index includes pre-computed `count` and `total` values for efficient filtering and statistics.

## Verification

Once complete, you can verify the import by checking MeiliSearch:

```bash
curl http://localhost:7700/indexes \
  -H "Authorization: Bearer your_master_api_key_here"
```

You should see all 5 indexes listed.

## Troubleshooting

- **Connection errors**: Ensure MeiliSearch is running and accessible at the configured host
- **Permission errors**: Verify you're using the master API key, not a read-only key
- **Import fails**: Check that CSV files were generated correctly in step 2
- **Memory issues**: Consider using the `--batch-size` parameter to reduce memory usage

## Step 8: Generate OC4IDS Data

You can generate an [OC4IDS](https://standard.open-contracting.org/infrastructure/) (Open Contracting for Infrastructure Data Standard) compliant JSON dataset from the PhilGEPS data. This filters for construction and infrastructure-related projects.

```bash
cd data
duckdb < convert_oc4ids.sql
```

This will create `philgeps/oc4ids.json` (approx. 1GB).


## Notes

- The import process may take several minutes to hours depending on data size
- Ensure sufficient disk space for both the parquet files and MeiliSearch indexes
- The `.env` file should not be committed to version control
