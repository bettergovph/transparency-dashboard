#!/bin/bash

# MeiliSearch Configuration Script for PhilGEPS Index
# This script updates index settings to handle special characters in filters

# Load environment variables from .env file if it exists
if [ -f ../../.env ]; then
  export $(cat ../../.env | grep -v '^#' | xargs)
fi

# Set default values if not provided
MEILISEARCH_HOST="${VITE_MEILISEARCH_HOST:-http://localhost:7700}"
MEILISEARCH_API_KEY="${VITE_MEILISEARCH_API_KEY:-masterKey}"
INDEX_NAME="${VITE_MEILISEARCH_INDEX_NAME:-philgeps}"

echo "=========================================="
echo "MeiliSearch PhilGEPS Index Configuration"
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
    "awardee_name",
    "organization_name",
    "area_of_delivery",
    "business_category"
  ]'

echo -e "\n"

# Configure sortable attributes
echo "Configuring sortable attributes..."
curl -X PUT "${MEILISEARCH_HOST}/indexes/${INDEX_NAME}/settings/sortable-attributes" \
  -H "Authorization: Bearer ${MEILISEARCH_API_KEY}" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "contract_amount",
    "award_date"
  ]'

echo -e "\n"

# Configure separator tokens (characters that WILL split words)
echo "Configuring separator tokens..."
curl -X PUT "${MEILISEARCH_HOST}/indexes/${INDEX_NAME}/settings/separator-tokens" \
  -H "Authorization: Bearer ${MEILISEARCH_API_KEY}" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    " ",
    "-",
    "|",
    "/"
  ]'

echo -e "\n"

# Configure non-separator tokens (characters that will NOT split words - important for filtering!)
echo "Configuring non-separator tokens..."
curl -X PUT "${MEILISEARCH_HOST}/indexes/${INDEX_NAME}/settings/non-separator-tokens" \
  -H "Authorization: Bearer ${MEILISEARCH_API_KEY}" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    ".",
    "&",
    ",",
    "'\''"
  ]'

echo -e "\n"

# Configure pagination settings for larger result sets
echo "Configuring pagination settings..."
curl -X PATCH "${MEILISEARCH_HOST}/indexes/${INDEX_NAME}/settings" \
  -H "Authorization: Bearer ${MEILISEARCH_API_KEY}" \
  -H 'Content-Type: application/json' \
  --data-binary '{
    "pagination": {
      "maxTotalHits": 10000
    }
  }'

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
echo "You can check the task status at: ${MEILISEARCH_HOST}/tasks"
echo ""
