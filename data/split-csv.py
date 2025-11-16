import csv
import os
import argparse

# Parse command-line arguments
parser = argparse.ArgumentParser(description='Split a large CSV file into smaller batch files')
parser.add_argument('csv_file', nargs='?', default='philgeps.csv', help='Input CSV file path (default: philgeps.csv)')
parser.add_argument('--batch-size', type=int, default=50000, help='Number of rows per batch (default: 50000)')
parser.add_argument('--output-dir', default='philgeps_batches', help='Output directory for batch files (default: philgeps_batches)')
args = parser.parse_args()

CSV_FILE = args.csv_file
BATCH_SIZE = args.batch_size
OUTPUT_DIR = args.output_dir

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Split CSV into smaller files
with open(CSV_FILE, 'r') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    
    if not fieldnames:
        raise ValueError(f"No fieldnames found in {CSV_FILE}")

    batch = []
    file_num = 1

    for row in reader:
        batch.append(row)

        if len(batch) >= BATCH_SIZE:
            output_file = f"{OUTPUT_DIR}/batch_{file_num:04d}.csv"
            with open(output_file, 'w', newline='') as out:
                writer = csv.DictWriter(out, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(batch)
            print(f"Created {output_file}")
            batch = []
            file_num += 1

    # Write remaining records
    if batch:
        output_file = f"{OUTPUT_DIR}/batch_{file_num:04d}.csv"
        with open(output_file, 'w', newline='') as out:
            writer = csv.DictWriter(out, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(batch)
        print(f"Created {output_file}")

print(f"\n✓ Split into {file_num} files in {OUTPUT_DIR}/")