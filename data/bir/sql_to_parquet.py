#!/usr/bin/env python3
"""
Convert SQL seed file to Parquet format using DuckDB.

This script:
1. Creates a DuckDB in-memory database
2. Executes SQL file to create tables and insert data
3. Exports tables to Parquet files

Usage:
    python sql_to_parquet.py input.sql output.parquet
    python sql_to_parquet.py bir_collections.sql bir_collections.parquet
"""

import duckdb
import sys
from pathlib import Path


def sql_to_parquet(sql_file, parquet_file, table_name='bir_collections'):
    """
    Load SQL file into DuckDB and export to Parquet.
    
    Args:
        sql_file: Path to SQL file with CREATE TABLE and INSERT statements
        parquet_file: Output Parquet file path
        table_name: Name of the table to export (default: bir_collections)
    """
    
    if not Path(sql_file).exists():
        print(f"Error: SQL file '{sql_file}' not found.")
        sys.exit(1)
    
    print(f"Loading SQL file: {sql_file}")
    
    # Create in-memory DuckDB connection
    con = duckdb.connect(':memory:')
    
    try:
        # Read and execute SQL file
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Convert PostgreSQL-specific syntax to DuckDB-compatible syntax
        print("Converting SQL syntax for DuckDB compatibility...")
        
        # Replace SERIAL with VARCHAR for UUID/GUID support
        # We'll generate UUIDs in DuckDB during the copy
        sql_content = sql_content.replace('id SERIAL PRIMARY KEY', 'id VARCHAR PRIMARY KEY')
        sql_content = sql_content.replace('SERIAL PRIMARY KEY', 'VARCHAR PRIMARY KEY')
        sql_content = sql_content.replace('SERIAL', 'INTEGER')
        
        # Remove UNIQUE constraints that might cause issues with duplicates
        # We'll handle uniqueness at the application level
        import re
        sql_content = re.sub(r',\s*UNIQUE\([^)]+\)', '', sql_content)
        
        # Execute the SQL (creates table and inserts data)
        print("Executing SQL statements...")
        
        # First, create a temporary table without the id column
        temp_table = f"{table_name}_temp"
        
        # Modify CREATE TABLE to use temp table name and remove id column
        import re
        
        # Find the CREATE TABLE statement and modify it
        create_table_pattern = r'CREATE TABLE IF NOT EXISTS ' + table_name + r' \((.*?)\);'
        match = re.search(create_table_pattern, sql_content, re.DOTALL)
        
        if match:
            # Create temp table without id column
            columns = match.group(1)
            # Remove the id line and clean up
            columns_lines = [line.strip() for line in columns.split('\n') if line.strip()]
            
            # Filter out lines that start with 'id ' and remove trailing commas
            columns_without_id = []
            for line in columns_lines:
                # Skip id column
                if line.startswith('id '):
                    continue
                # Remove trailing comma
                clean_line = line.rstrip(',')
                columns_without_id.append(clean_line)
            
            # Join with commas and newlines
            temp_columns = ',\n    '.join(columns_without_id)
            
            # Create temporary table
            con.execute(f"""
                CREATE TABLE {temp_table} (
                    {temp_columns}
                );
            """)
            
            # Modify INSERT statements to use temp table
            insert_pattern = r'INSERT INTO ' + table_name + r' \(region, area, month, year, amount\)'
            sql_content_temp = re.sub(insert_pattern, f'INSERT INTO {temp_table} (region, area, month, year, amount)', sql_content)
            
            # Execute only INSERT statements
            insert_statements = re.findall(r'INSERT INTO.*?;', sql_content_temp, re.DOTALL)
            for statement in insert_statements:
                con.execute(statement)
            
            # Get row count from temp table
            row_count = con.execute(f"SELECT COUNT(*) FROM {temp_table}").fetchone()[0]
            print(f"✓ Loaded {row_count:,} rows into temporary table")
            
            # Create final table with UUID/GUID id column
            print("Generating UUIDs for id column...")
            con.execute(f"""
                CREATE TABLE {table_name} AS
                SELECT 
                    uuid() as id,
                    region,
                    area,
                    month,
                    year,
                    amount,
                    CURRENT_TIMESTAMP as created_at
                FROM {temp_table}
            """)
            
            # Drop temp table
            con.execute(f"DROP TABLE {temp_table}")
        else:
            # Fallback: just execute the SQL as-is
            print("Warning: Could not parse CREATE TABLE, executing SQL as-is...")
            con.execute(sql_content)
        
        # Get row count
        row_count = con.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
        print(f"✓ Loaded {row_count:,} rows into {table_name}")
        
        # Export to Parquet
        print(f"Exporting to Parquet: {parquet_file}")
        con.execute(f"""
            COPY {table_name} 
            TO '{parquet_file}' 
            (FORMAT PARQUET, COMPRESSION 'SNAPPY')
        """)
        
        # Get file size
        parquet_path = Path(parquet_file)
        file_size = parquet_path.stat().st_size
        file_size_mb = file_size / (1024 * 1024)
        
        print(f"✓ Successfully created Parquet file")
        print(f"✓ File size: {file_size_mb:.2f} MB")
        print(f"✓ Output: {parquet_file}")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        con.close()


def main():
    if len(sys.argv) < 2:
        print("Usage: python sql_to_parquet.py <input.sql> [output.parquet] [table_name]")
        print("\nExamples:")
        print("  python sql_to_parquet.py bir_collections.sql")
        print("  python sql_to_parquet.py bir_collections.sql bir_data.parquet")
        print("  python sql_to_parquet.py input.sql output.parquet custom_table")
        sys.exit(1)
    
    sql_file = sys.argv[1]
    
    # Default output file: bir_collections.parquet
    if len(sys.argv) > 2:
        parquet_file = sys.argv[2]
    else:
        parquet_file = 'bir_collections.parquet'
    
    # Optional table name
    table_name = sys.argv[3] if len(sys.argv) > 3 else 'bir_collections'
    
    print("\n" + "="*60)
    print("SQL to Parquet Converter (DuckDB)")
    print("="*60 + "\n")
    
    sql_to_parquet(sql_file, parquet_file, table_name)
    
    print("\n" + "="*60)
    print("Conversion complete!")
    print("="*60 + "\n")


if __name__ == '__main__':
    main()
