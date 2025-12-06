#!/bin/bash

# MeiliSearch Configuration Script for GAA Index
# This script configures filterable and sortable attributes for the 'gaa' index

# Load environment variables from .env file if it exists
if [ -f ../../.env ]; then
  export $(cat ../../.env | grep -v '^#' | xargs)
fi

# Set default values if not provided
MEILISEARCH_HOST="${VITE_MEILISEARCH_HOST:-http://localhost:7700}"
MEILISEARCH_API_KEY="${VITE_MEILISEARCH_API_KEY:-masterKey}"
INDEX_NAME="gaa"

echo "=========================================="
echo "MeiliSearch GAA Index Configuration"
echo "=========================================="
echo "Host: $MEILISEARCH_HOST"
echo "Index: $INDEX_NAME"
echo ""

# Configure filterable attributes
echo "Configuring filterable attributes..."
curl -X PUT "${MEILISEARCH_HOST}/indexes/${INDEX_NAME}/settings/filterable-attributes" \
  -H "Authorization: Bearer ${MEILISEARCH_API_KEY}" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "year",
    "department",
    "uacs_dpt_dsc",
    "agency",
    "uacs_agy_dsc",
    "uacs_oper_dsc",
    "uacs_fundsubcat_dsc",
    "uacs_exp_cd",
    "uacs_exp_dsc",
    "uacs_sobj_cd",
    "uacs_sobj_dsc",
    "uacs_div_dsc",
    "amt"
  ]'

echo -e "\n"

# Configure sortable attributes
echo "Configuring sortable attributes..."
curl -X PUT "${MEILISEARCH_HOST}/indexes/${INDEX_NAME}/settings/sortable-attributes" \
  -H "Authorization: Bearer ${MEILISEARCH_API_KEY}" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "year",
    "amt"
  ]'

echo -e "\n"

# Configure searchable attributes (fields to search in)
echo "Configuring searchable attributes..."
curl -X PUT "${MEILISEARCH_HOST}/indexes/${INDEX_NAME}/settings/searchable-attributes" \
  -H "Authorization: Bearer ${MEILISEARCH_API_KEY}" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "dsc",
    "uacs_dpt_dsc",
    "uacs_agy_dsc",
    "uacs_oper_dsc",
    "uacs_fundsubcat_dsc",
    "uacs_exp_dsc",
    "uacs_sobj_dsc",
    "uacs_div_dsc"
  ]'

echo -e "\n"

# Configure displayed attributes (optional - all by default)
echo "Configuring displayed attributes..."
curl -X PUT "${MEILISEARCH_HOST}/indexes/${INDEX_NAME}/settings/displayed-attributes" \
  -H "Authorization: Bearer ${MEILISEARCH_API_KEY}" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "*"
  ]'

echo -e "\n"

# Get current settings to verify
echo "Verifying current settings..."
curl -X GET "${MEILISEARCH_HOST}/indexes/${INDEX_NAME}/settings" \
  -H "Authorization: Bearer ${MEILISEARCH_API_KEY}" \
  | python3 -m json.tool

echo -e "\n=========================================="
echo "Configuration completed!"
echo "=========================================="
echo ""
echo "Note: MeiliSearch will process these changes asynchronously."
echo "Large indices may take a few minutes to reindex."
echo ""
