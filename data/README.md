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

Use DuckDB to extract and prepare the data using the provided SQL script:

```bash
cd data/philgeps
duckdb < philgeps-extract.sql
```

This will create the necessary CSV files from the parquet data.

## Step 3: Set Environment Variables

Create a `.env` file in the project root with your MeiliSearch configuration:

```bash
VITE_MEILISEARCH_HOST=http://localhost:7700
VITE_MEILISEARCH_API_KEY=your_master_api_key_here
VITE_MEILISEARCH_INDEX_NAME=philgeps
```

**Important:** You need the MeiliSearch **master key** for write access to create and populate indexes.

## Step 4: Install Python Dependencies

Install the required Python packages:

```bash
cd data
pip install -r requirements.txt
```

## Step 5: Import Main PhilGEPS Data

Run the main import script to load PhilGEPS contracts data into MeiliSearch:

```bash
cd data/philgeps
python import.py
```

This will:
- Create the main `philgeps` index
- Import all contract records
- Configure searchable attributes and filters

## Step 6: Import Aggregated Data

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

## Notes

- The import process may take several minutes to hours depending on data size
- Ensure sufficient disk space for both the parquet files and MeiliSearch indexes
- The `.env` file should not be committed to version control
