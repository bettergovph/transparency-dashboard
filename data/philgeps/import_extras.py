import os
import argparse
from meilisearch import Client
from dotenv import load_dotenv
import pandas as pd

# Load environment variables from .env file
load_dotenv()

# Get MeiliSearch configuration from environment
MEILISEARCH_HOST = os.getenv('VITE_MEILISEARCH_HOST', 'http://localhost:7700')
MEILISEARCH_API_KEY = os.getenv('VITE_MEILISEARCH_API_KEY', '')

# Parse command-line arguments
parser = argparse.ArgumentParser(description='Import parquet files into MeiliSearch with philgeps_ prefix')
parser.add_argument('--batch-size', type=int, default=5000, help='Number of records per batch (default: 5000)')
parser.add_argument('--data-dir', default='.', help='Directory containing parquet files (default: current directory)')
args = parser.parse_args()

BATCH_SIZE = args.batch_size
DATA_DIR = args.data_dir

# Define parquet files and their corresponding index names
PARQUET_FILES = [
    ('area_of_deliveries.parquet', 'philgeps_area_of_deliveries'),
    ('awardees.parquet', 'philgeps_awardees'),
    ('business_categories.parquet', 'philgeps_business_categories'),
    ('organizations.parquet', 'philgeps_organizations')
]

print(f"Connecting to MeiliSearch at {MEILISEARCH_HOST}...")
client = Client(MEILISEARCH_HOST, MEILISEARCH_API_KEY)

def import_parquet_to_index(file_path, index_name):
    """Import a parquet file into a MeiliSearch index"""
    if not os.path.exists(file_path):
        print(f"⚠ Skipping {file_path} - file not found")
        return 0
    
    print(f"\n{'='*60}")
    print(f"Processing: {os.path.basename(file_path)}")
    print(f"Index: {index_name}")
    print(f"{'='*60}")
    
    # Read parquet file
    df = pd.read_parquet(file_path)
    total_records = len(df)
    print(f"Found {total_records} records")
    
    # Convert to list of dictionaries
    records = df.to_dict('records')
    
    # Delete the index to be sure
    # client.delete_index(index_name) 
  
    # Get or create index
    index = client.index(index_name)
    
    # Import in batches
    batch = []
    total_imported = 0
    
    for record in records:
        # Convert any bytes to string (handles UUID bytes)
        for key, value in record.items():
            if isinstance(value, bytes):
                import uuid
                try:
                    record[key] = str(uuid.UUID(bytes=value))
                except:
                    record[key] = value.hex()  # fallback to hex string
        
        batch.append(record)
        
        if len(batch) >= BATCH_SIZE:
            index.add_documents(batch)
            total_imported += len(batch)
            print(f"  Imported {total_imported}/{total_records} records...")
            batch = []
    
    # Import remaining records
    if batch:
        # Convert any bytes to string in remaining batch
        for record in batch:
            for key, value in record.items():
                if isinstance(value, bytes):
                    import uuid
                    try:
                        record[key] = str(uuid.UUID(bytes=value))
                    except:
                        record[key] = value.hex()
        
        index.add_documents(batch)
        total_imported += len(batch)
        print(f"  Imported {total_imported}/{total_records} records...")
    
    print(f"✓ Successfully imported {total_imported} records into '{index_name}'")
    return total_imported

# Process all parquet files
total_all = 0
for parquet_file, index_name in PARQUET_FILES:
    file_path = os.path.join(DATA_DIR, parquet_file)
    count = import_parquet_to_index(file_path, index_name)
    total_all += count

print(f"\n{'='*60}")
print(f"✓ COMPLETE - Imported {total_all} total records")
print(f"  Host: {MEILISEARCH_HOST}")
print(f"{'='*60}")
print("\nCreated indexes:")
for _, index_name in PARQUET_FILES:
    print(f"  - {index_name}")
