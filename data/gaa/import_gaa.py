import os
import argparse
from pathlib import Path
import pandas as pd
from meilisearch import Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get MeiliSearch configuration from environment
MEILISEARCH_HOST = os.getenv('VITE_MEILISEARCH_HOST', 'http://localhost:7700')
MEILISEARCH_API_KEY = os.getenv('VITE_MEILISEARCH_API_KEY', '')

# Parse command-line arguments
parser = argparse.ArgumentParser(description='Import GAA Parquet file into MeiliSearch')
parser.add_argument('--parquet-file', default='gaa.parquet', help='Parquet file to import (default: gaa.parquet)')
parser.add_argument('--index-name', default='gaa', help='MeiliSearch index name (default: gaa)')
parser.add_argument('--batch-size', type=int, default=10000, help='Batch size for importing (default: 10000)')
args = parser.parse_args()

# Resolve parquet file path
script_dir = Path(__file__).parent
parquet_file = Path(args.parquet_file)
if not parquet_file.is_absolute():
    parquet_file = script_dir / parquet_file

INDEX_NAME = args.index_name
BATCH_SIZE = args.batch_size

print(f"Connecting to MeiliSearch at {MEILISEARCH_HOST}...")
client = Client(MEILISEARCH_HOST, MEILISEARCH_API_KEY)

# Check if parquet file exists
if not parquet_file.exists():
    print(f"✗ Parquet file not found: {parquet_file}")
    print(f"\nPlease run gaa_csv_to_parquet.py first to generate the parquet file.")
    exit(1)

print(f"Reading Parquet file: {parquet_file}")

# Read parquet file
try:
    df = pd.read_parquet(parquet_file)
    total_rows = len(df)
    print(f"✓ Loaded {total_rows:,} records from Parquet")
    print(f"  Columns: {len(df.columns)}")
    print(f"  Years: {sorted(df['year'].unique().tolist())}\n")
except Exception as e:
    print(f"✗ Failed to read Parquet file: {e}")
    exit(1)

# Delete and recreate index
print(f"Recreating MeiliSearch index: {INDEX_NAME}...")
try:
    client.delete_index(INDEX_NAME)
except:
    pass  # Index might not exist

client.create_index(INDEX_NAME, {"primaryKey": "id"})
index = client.index(INDEX_NAME)
print(f"✓ Index created\n")

print(f"Importing {total_rows:,} records into '{INDEX_NAME}' index...")
print(f"Batch size: {BATCH_SIZE:,}\n")

# Convert DataFrame to list of dictionaries and import in batches
total_imported = 0
num_batches = (total_rows + BATCH_SIZE - 1) // BATCH_SIZE

for batch_idx in range(num_batches):
    start_idx = batch_idx * BATCH_SIZE
    end_idx = min(start_idx + BATCH_SIZE, total_rows)
    
    # Get batch as list of dicts
    batch_df = df.iloc[start_idx:end_idx]
    records = batch_df.to_dict('records')
    
    # Import batch
    print(f"[{batch_idx + 1}/{num_batches}] Importing records {start_idx + 1:,} to {end_idx:,}...")
    try:
        index.add_documents(records)
        total_imported += len(records)
        print(f"  ✓ Imported {len(records):,} records\n")
    except Exception as e:
        print(f"  ✗ Failed to import batch: {e}\n")
        continue

print(f"{'='*60}")
print(f"✓ Successfully imported {total_imported:,} total records into '{INDEX_NAME}' index")
print(f"  Host: {MEILISEARCH_HOST}")
print(f"  Source: {parquet_file.name}")
print(f"  Batches: {num_batches}")
print(f"{'='*60}")
