#!/bin/bash

# Configure MeiliSearch index for DPWH infrastructure projects
# This script sets up searchable, filterable, and sortable attributes

set -e

# Load environment variables
if [ -f ../../.env ]; then
    export $(cat ../../.env | grep -v '^#' | xargs)
elif [ -f ../.env ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
fi

MEILISEARCH_HOST=${VITE_MEILISEARCH_HOST:-http://localhost:7700}
MEILISEARCH_API_KEY=${VITE_MEILISEARCH_API_KEY:-}
INDEX_NAME=${1:-dpwh}

echo "Configuring MeiliSearch index: $INDEX_NAME"
echo "Host: $MEILISEARCH_HOST"
echo ""

# Build the curl command with optional API key
CURL_CMD="curl -X PATCH"
if [ -n "$MEILISEARCH_API_KEY" ]; then
    CURL_CMD="$CURL_CMD -H 'Authorization: Bearer $MEILISEARCH_API_KEY'"
fi

# Configure index settings
eval $CURL_CMD \
  "'${MEILISEARCH_HOST}/indexes/${INDEX_NAME}/settings'" \
  -H "'Content-Type: application/json'" \
  --data-binary @- << EOF
{
  "searchableAttributes": [
    "contractId",
    "description",
    "category",
    "componentCategories",
    "location.province",
    "location.region",
    "contractor",
    "programName",
    "sourceOfFunds"
  ],
  "filterableAttributes": [
    "contractId",
    "category",
    "componentCategories",
    "status",
    "location.province",
    "location.region",
    "infraYear",
    "programName",
    "isLive",
    "hasSatelliteImage",
    "progress",
    "budget",
    "amountPaid"
  ],
  "sortableAttributes": [
    "budget",
    "amountPaid",
    "progress",
    "startDate",
    "completionDate",
    "infraYear",
    "reportCount"
  ],
  "displayedAttributes": [
    "contractId",
    "description",
    "category",
    "componentCategories",
    "status",
    "budget",
    "amountPaid",
    "progress",
    "location",
    "contractor",
    "startDate",
    "completionDate",
    "infraYear",
    "programName",
    "sourceOfFunds",
    "isLive",
    "livestreamUrl",
    "latitude",
    "longitude",
    "reportCount",
    "hasSatelliteImage"
  ],
  "rankingRules": [
    "words",
    "typo",
    "proximity",
    "attribute",
    "sort",
    "exactness"
  ],
  "stopWords": [],
  "separatorTokens": [" ", "-", "|", "/", ","],
  "nonSeparatorTokens": [".", "&", "'", "(", ")"],
  "pagination": {
    "maxTotalHits": 10000
  }
}
EOF

echo ""
echo "✓ Index configuration updated successfully"
echo ""
echo "Configured attributes:"
echo "  - Searchable: contractId, description, category, location, contractor, etc."
echo "  - Filterable: category, status, region, province, year, isLive, etc."
echo "  - Sortable: budget, amountPaid, progress, dates, reportCount"
