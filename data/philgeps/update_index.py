import csv
import os
import argparse
from meilisearch import Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get MeiliSearch configuration from environment
MEILISEARCH_HOST = os.getenv('VITE_MEILISEARCH_HOST', 'http://localhost:7700')
MEILISEARCH_API_KEY = os.getenv('VITE_MEILISEARCH_API_KEY', '')
MEILISEARCH_INDEX = os.getenv('VITE_MEILISEARCH_INDEX_NAME', 'philgeps')

# Parse command-line arguments
parser = argparse.ArgumentParser(description='Import CSV data into MeiliSearch')
parser.add_argument('csv_file', nargs='?', default='philgeps.csv', help='CSV file to import (default: philgeps.csv)')
parser.add_argument('--batch-size', type=int, default=50000, help='Number of records per batch (default: 1000)')
args = parser.parse_args()

CSV_FILE = args.csv_file
BATCH_SIZE = args.batch_size

print(f"Connecting to MeiliSearch at {MEILISEARCH_HOST}...")
client = Client(MEILISEARCH_HOST, MEILISEARCH_API_KEY)

# Get or create index
index = client.index(MEILISEARCH_INDEX)

index.update_settings({"searchableAttributes": ["*"], 
                       "filterableAttributes": ["awardee_name", "organization_name", 
                                                "area_of_delivery", "business_category", "award_date"], 
                       "sortableAttributes": ["contract_amount"]})


print(f"\n✓ Updating index settings '{MEILISEARCH_INDEX}'")
print(f"  Host: {MEILISEARCH_HOST}")
