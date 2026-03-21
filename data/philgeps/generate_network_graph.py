#!/usr/bin/env python3
"""
Generate network graph data from PhilGEPS procurement records.

This script reads PhilGEPS data from a parquet file and produces a JSON network
graph showing relationships between contractors, organizations, regions, and
business categories.

Usage:
    python generate_network_graph.py [--input philgeps.parquet] [--output ../../public/data/network/ocds_network.json]

The output JSON has the structure:
{
  "nodes": [{ "id": "...", "name": "...", "type": "contractor"|"organization"|"region"|"category", "val": number }],
  "links": [{ "source": "...", "target": "...", "value": number }]
}
"""

import argparse
import json
import sys
from collections import defaultdict

try:
    import duckdb
except ImportError:
    print("DuckDB is required. Install with: pip install duckdb")
    sys.exit(1)


def generate_network_graph(input_path: str, output_path: str, top_n: int = 50):
    """Generate network graph JSON from PhilGEPS parquet data."""

    con = duckdb.connect()

    # Read the parquet file
    print(f"Reading data from {input_path}...")
    df = con.execute(f"""
        SELECT
            awardee_name,
            organization_name,
            area_of_delivery,
            business_category,
            contract_amount
        FROM read_parquet('{input_path}')
        WHERE awardee_name IS NOT NULL
          AND organization_name IS NOT NULL
          AND area_of_delivery IS NOT NULL
          AND business_category IS NOT NULL
          AND contract_amount > 0
    """).fetchdf()

    print(f"Loaded {len(df)} records")

    # Get top entities by total contract value
    top_contractors = df.groupby('awardee_name')['contract_amount'].agg(['sum', 'count']).nlargest(top_n, 'sum')
    top_orgs = df.groupby('organization_name')['contract_amount'].agg(['sum', 'count']).nlargest(top_n, 'sum')
    top_regions = df.groupby('area_of_delivery')['contract_amount'].agg(['sum', 'count']).nlargest(30, 'sum')
    top_categories = df.groupby('business_category')['contract_amount'].agg(['sum', 'count']).nlargest(20, 'sum')

    # Create node sets
    contractor_set = set(top_contractors.index)
    org_set = set(top_orgs.index)
    region_set = set(top_regions.index)
    category_set = set(top_categories.index)

    # Filter data to only include top entities
    filtered = df[
        (df['awardee_name'].isin(contractor_set)) |
        (df['organization_name'].isin(org_set)) |
        (df['area_of_delivery'].isin(region_set)) |
        (df['business_category'].isin(category_set))
    ]

    print(f"Filtered to {len(filtered)} records involving top entities")

    # Build nodes
    nodes = []
    node_ids = set()

    def add_node(prefix, name, total_value, count):
        node_id = f"{prefix}:{name}"
        if node_id not in node_ids:
            node_ids.add(node_id)
            nodes.append({
                "id": node_id,
                "name": name,
                "type": prefix,
                "val": round(float(total_value), 2),
                "count": int(count)
            })

    for name, row in top_contractors.iterrows():
        add_node("contractor", name, row['sum'], row['count'])

    for name, row in top_orgs.iterrows():
        add_node("organization", name, row['sum'], row['count'])

    for name, row in top_regions.iterrows():
        add_node("region", name, row['sum'], row['count'])

    for name, row in top_categories.iterrows():
        add_node("category", name, row['sum'], row['count'])

    # Build links (edges) from co-occurrences in contracts
    link_map = defaultdict(lambda: {"value": 0, "count": 0})

    for _, row in filtered.iterrows():
        awardee = row['awardee_name']
        org = row['organization_name']
        region = row['area_of_delivery']
        category = row['business_category']
        amount = float(row['contract_amount'])

        # Contractor <-> Organization
        if awardee in contractor_set and org in org_set:
            key = (f"contractor:{awardee}", f"organization:{org}")
            link_map[key]["value"] += amount
            link_map[key]["count"] += 1

        # Organization <-> Region
        if org in org_set and region in region_set:
            key = (f"organization:{org}", f"region:{region}")
            link_map[key]["value"] += amount
            link_map[key]["count"] += 1

        # Contractor <-> Region
        if awardee in contractor_set and region in region_set:
            key = (f"contractor:{awardee}", f"region:{region}")
            link_map[key]["value"] += amount
            link_map[key]["count"] += 1

        # Contractor <-> Category
        if awardee in contractor_set and category in category_set:
            key = (f"contractor:{awardee}", f"category:{category}")
            link_map[key]["value"] += amount
            link_map[key]["count"] += 1

        # Organization <-> Category
        if org in org_set and category in category_set:
            key = (f"organization:{org}", f"category:{category}")
            link_map[key]["value"] += amount
            link_map[key]["count"] += 1

    links = []
    for (source, target), data in link_map.items():
        if source in node_ids and target in node_ids:
            links.append({
                "source": source,
                "target": target,
                "value": round(data["value"], 2),
                "count": data["count"]
            })

    # Sort links by value and keep top connections to avoid visual clutter
    links.sort(key=lambda x: x["value"], reverse=True)
    links = links[:500]

    graph = {
        "nodes": nodes,
        "links": links,
        "metadata": {
            "totalRecords": len(df),
            "filteredRecords": len(filtered),
            "nodeCount": len(nodes),
            "linkCount": len(links),
            "topN": top_n
        }
    }

    with open(output_path, 'w') as f:
        json.dump(graph, f, indent=2)

    print(f"Generated network graph: {len(nodes)} nodes, {len(links)} links")
    print(f"Output saved to {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate OCDS network graph data")
    parser.add_argument("--input", default="philgeps.parquet", help="Input parquet file")
    parser.add_argument("--output", default="../../public/data/network/ocds_network.json", help="Output JSON file")
    parser.add_argument("--top-n", type=int, default=50, help="Number of top entities per type")
    args = parser.parse_args()

    generate_network_graph(args.input, args.output, args.top_n)
