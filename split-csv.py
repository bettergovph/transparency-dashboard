import csv
import os

CSV_FILE = "philgeps.csv"
BATCH_SIZE = 50000
OUTPUT_DIR = "csv_batches"

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Split CSV into smaller files
with open(CSV_FILE, 'r') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames

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