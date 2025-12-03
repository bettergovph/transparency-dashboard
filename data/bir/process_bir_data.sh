#!/bin/bash

# BIR Data Processing Pipeline
# Automates: CSV → SQL → Parquet → JSON Aggregates
# Usage: ./process_bir_data.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Use explicit python3 path
PYTHON="/usr/bin/python3"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   BIR Data Processing Pipeline                ║${NC}"
echo -e "${BLUE}║   CSV → SQL → Parquet → JSON Aggregates       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Transform CSV to SQL
echo -e "${YELLOW}[1/4] Transforming CSV files to SQL...${NC}"
if $PYTHON transform_bir_collection.py; then
    echo -e "${GREEN}✓ CSV to SQL conversion complete${NC}"
    echo -e "${GREEN}  Output: bir_collections.sql${NC}"
else
    echo -e "${RED}✗ CSV to SQL conversion failed${NC}"
    exit 1
fi
echo ""

# Step 2: Convert SQL to Parquet
echo -e "${YELLOW}[2/4] Converting SQL to Parquet...${NC}"
if $PYTHON sql_to_parquet.py bir_collections.sql bir_collections.parquet; then
    echo -e "${GREEN}✓ SQL to Parquet conversion complete${NC}"
    echo -e "${GREEN}  Output: bir_collections.parquet${NC}"
else
    echo -e "${RED}✗ SQL to Parquet conversion failed${NC}"
    exit 1
fi
echo ""

# Step 3: Create JSON Aggregates
echo -e "${YELLOW}[3/4] Generating JSON aggregates...${NC}"
if $PYTHON create_aggregates.py bir_collections.parquet --output-dir ../../public/data/bir/aggregates; then
    echo -e "${GREEN}✓ JSON aggregates generated${NC}"
    echo -e "${GREEN}  Output directory: public/data/bir/aggregates/${NC}"
else
    echo -e "${RED}✗ Aggregate generation failed${NC}"
    exit 1
fi
echo ""

# Step 4: Verify outputs
echo -e "${YELLOW}[4/4] Verifying outputs...${NC}"

# Check SQL file
if [ -f "bir_collections.sql" ]; then
    SQL_SIZE=$(ls -lh bir_collections.sql | awk '{print $5}')
    echo -e "${GREEN}✓ bir_collections.sql (${SQL_SIZE})${NC}"
else
    echo -e "${RED}✗ bir_collections.sql not found${NC}"
    exit 1
fi

# Check Parquet file
if [ -f "bir_collections.parquet" ]; then
    PARQUET_SIZE=$(ls -lh bir_collections.parquet | awk '{print $5}')
    echo -e "${GREEN}✓ bir_collections.parquet (${PARQUET_SIZE})${NC}"
else
    echo -e "${RED}✗ bir_collections.parquet not found${NC}"
    exit 1
fi

# Check aggregates directory
if [ -d "../../public/data/bir/aggregates" ]; then
    JSON_COUNT=$(ls -1 ../../public/data/bir/aggregates/*.json 2>/dev/null | wc -l)
    echo -e "${GREEN}✓ public/data/bir/aggregates/ directory (${JSON_COUNT} JSON files)${NC}"
    
    # List all JSON files
    if [ $JSON_COUNT -gt 0 ]; then
        echo -e "${BLUE}  Generated aggregates:${NC}"
        for json_file in ../../public/data/bir/aggregates/*.json; do
            if [ -f "$json_file" ]; then
                FILE_SIZE=$(ls -lh "$json_file" | awk '{print $5}')
                FILE_NAME=$(basename "$json_file")
                echo -e "${BLUE}    • ${FILE_NAME} (${FILE_SIZE})${NC}"
            fi
        done
    fi
else
    echo -e "${RED}✗ public/data/bir/aggregates/ directory not found${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✓ Pipeline Complete!                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "  • Processed CSV files from multiple years (2020-2024)"
echo -e "  • Generated unified SQL file: ${GREEN}bir_collections.sql${NC}"
echo -e "  • Created Parquet file: ${GREEN}bir_collections.parquet${NC}"
echo -e "  • Generated ${GREEN}${JSON_COUNT}${NC} JSON aggregate files"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  • View the dashboard at ${GREEN}/bir${NC} route"
echo -e "  • Aggregates are ready for visualization"
echo ""
