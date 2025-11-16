import csv
import os
import argparse
import glob
from meilisearch import Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get MeiliSearch configuration from environment
MEILISEARCH_HOST = os.getenv('VITE_MEILISEARCH_HOST', 'http://localhost:7700')
MEILISEARCH_API_KEY = os.getenv('VITE_MEILISEARCH_API_KEY', '')

# Parse command-line arguments
parser = argparse.ArgumentParser(description='Import GAA CSV files into MeiliSearch')
parser.add_argument('--csv-dir', default='csv_batches', help='Directory containing CSV files (default: csv_batches)')
parser.add_argument('--index-name', default='gaa', help='MeiliSearch index name (default: gaa)')
args = parser.parse_args()

CSV_DIR = args.csv_dir
INDEX_NAME = args.index_name

print(f"Connecting to MeiliSearch at {MEILISEARCH_HOST}...")
client = Client(MEILISEARCH_HOST, MEILISEARCH_API_KEY)

client.delete_index(INDEX_NAME)

client.create_index(INDEX_NAME, { "primaryKey": "id" })

# Get or create index
index = client.index(INDEX_NAME)

print(f"Importing GAA data from {CSV_DIR}/*.csv...")
print(f"Target index: {INDEX_NAME}\n")

# Get all CSV files in the directory
csv_files = sorted(glob.glob(os.path.join(CSV_DIR, '*.csv')))

if not csv_files:
    print(f"⚠ No CSV files found in {CSV_DIR}/")
    exit(1)

print(f"Found {len(csv_files)} CSV files to process\n")

total_imported = 0

# Process each CSV file
for file_idx, csv_file in enumerate(csv_files, 1):
    print(f"[{file_idx}/{len(csv_files)}] Processing: {os.path.basename(csv_file)}")
    
    # Read entire CSV file
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        records = list(reader)
        
        # Import all records from this file
        if records:
            index.add_documents(records)
            total_imported += len(records)
            print(f"  ✓ Imported {len(records)} records\n")

print(f"{'='*60}")
print(f"✓ Successfully imported {total_imported} total records into '{INDEX_NAME}' index")
print(f"  Host: {MEILISEARCH_HOST}")
print(f"  Files processed: {len(csv_files)}")
print(f"{'='*60}")
