#!/usr/bin/env python3
"""
Generate the 3D procurement network graph data from PhilGEPS contract awards.

The full dataset (~5.5M contracts) is far too large to render at once, so the
graph is sharded by business category:

  public/data/network/index.json
      Category catalogue + an overview graph linking every category to its
      top departments, contractors and regions.

  public/data/network/categories/<slug>.json
      One graph per business category:
        category -> regions -> provinces -> departments -> contractors

Nodes are stored as [type, name, value, count] and links as
[sourceIndex, targetIndex, value, count] to keep the files small.

Usage:
    # download philgeps.parquet from https://huggingface.co/datasets/bettergovph/philgeps-data
    python generate_network_graph.py --input philgeps.parquet
"""

import argparse
import json
import os
import re
import shutil
import sys
from datetime import datetime, timezone

try:
    import duckdb
except ImportError:
    print("DuckDB is required. Install with: pip install duckdb")
    sys.exit(1)


REGION_PROVINCES = {
    "NCR": ["Metro Manila"],
    "CAR": ["Abra", "Apayao", "Benguet", "Ifugao", "Kalinga", "Mountain Province"],
    "Region I - Ilocos": ["Ilocos Norte", "Ilocos Sur", "La Union", "Pangasinan"],
    "Region II - Cagayan Valley": ["Batanes", "Cagayan", "Isabela", "Nueva Vizcaya", "Quirino"],
    "Region III - Central Luzon": ["Aurora", "Bataan", "Bulacan", "Nueva Ecija", "Pampanga", "Tarlac", "Zambales"],
    "Region IV-A - CALABARZON": ["Batangas", "Cavite", "Laguna", "Quezon", "Rizal"],
    "MIMAROPA": ["Marinduque", "Occidental Mindoro", "Oriental Mindoro", "Palawan", "Romblon"],
    "Region V - Bicol": ["Albay", "Camarines Norte", "Camarines Sur", "Catanduanes", "Masbate", "Sorsogon"],
    "Region VI - Western Visayas": ["Aklan", "Antique", "Capiz", "Guimaras", "Iloilo", "Negros Occidental"],
    "Region VII - Central Visayas": ["Bohol", "Cebu", "Negros Oriental", "Siquijor"],
    "Region VIII - Eastern Visayas": ["Biliran", "Eastern Samar", "Leyte", "Northern Samar", "Samar", "Southern Leyte"],
    "Region IX - Zamboanga Peninsula": ["Zamboanga Del Norte", "Zamboanga Del Sur", "Zamboanga Sibugay"],
    "Region X - Northern Mindanao": ["Bukidnon", "Camiguin", "Lanao Del Norte", "Misamis Occidental", "Misamis Oriental"],
    "Region XI - Davao": ["Compostela Valley", "Davao de Oro (Compos. Valley)", "Davao Del Norte", "Davao Del Sur",
                          "Davao Occidental", "Davao Oriental"],
    "Region XII - SOCCSKSARGEN": ["Cotabato", "Sarangani", "South Cotabato", "Sultan Kudarat"],
    "Caraga": ["Agusan Del Norte", "Agusan Del Sur", "Dinagat Islands", "Dinagat Island", "Surigao Del Norte",
               "Surigao Del Sur"],
    "BARMM": ["Basilan", "Lanao Del Sur", "Maguindanao", "Sulu", "Tawi-Tawi", "Special Geographic Area"],
}

# Spelling variants in area_of_delivery that refer to the same province
PROVINCE_ALIASES = {
    "Compostela Valley": "Davao de Oro",
    "Davao de Oro (Compos. Valley)": "Davao de Oro",
    "Dinagat Island": "Dinagat Islands",
}


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or "category"


class GraphBuilder:
    def __init__(self):
        self.nodes = []
        self.index = {}
        self.links = {}

    def node(self, node_type, name, value, count):
        key = (node_type, name)
        if key not in self.index:
            self.index[key] = len(self.nodes)
            self.nodes.append([node_type, name, round(float(value)), int(count)])
        return self.index[key]

    def has(self, node_type, name):
        return (node_type, name) in self.index

    def link(self, a, b, value, count):
        key = (a, b)
        if key not in self.links:
            self.links[key] = [a, b, round(float(value)), int(count)]

    def to_json(self):
        return {"nodes": self.nodes, "links": list(self.links.values())}


def top_per_group(rows, group_idx, per_group):
    """rows sorted by value desc; keep the first `per_group` rows for each group key."""
    seen = {}
    out = []
    for row in rows:
        key = row[group_idx]
        if seen.get(key, 0) < per_group:
            seen[key] = seen.get(key, 0) + 1
            out.append(row)
    return out


def build_category_graph(con, category, args):
    cat = con.execute("SELECT total, n FROM cat_totals WHERE business_category = ?", [category]).fetchone()
    g = GraphBuilder()
    root = g.node("category", category, cat[0], cat[1])

    # Regions and provinces
    for region, total, n in con.execute(
        "SELECT region, SUM(total), SUM(n) FROM cat_province WHERE business_category = ? AND region IS NOT NULL "
        "GROUP BY 1 ORDER BY 2 DESC", [category]).fetchall():
        g.link(root, g.node("region", region, total, n), total, n)

    for province, region, total, n in con.execute(
        "SELECT province, region, total, n FROM cat_province WHERE business_category = ? AND region IS NOT NULL "
        "ORDER BY total DESC", [category]).fetchall():
        p = g.node("province", province, total, n)
        g.link(g.index[("region", region)], p, total, n)

    # Contractors: top N by value within the category
    contractors = con.execute(
        "SELECT awardee_name, total, n FROM cat_awardee WHERE business_category = ? ORDER BY total DESC LIMIT ?",
        [category, args.contractors]).fetchall()
    contractor_names = [c[0] for c in contractors]

    # Departments: top N by value, plus the main buyer of every selected contractor
    orgs = con.execute(
        "SELECT organization_name, total, n FROM cat_org WHERE business_category = ? ORDER BY total DESC LIMIT ?",
        [category, args.organizations]).fetchall()
    org_names = {o[0] for o in orgs}

    pair_rows = con.execute(
        "SELECT awardee_name, organization_name, total, n FROM cat_pair "
        "WHERE business_category = ? AND awardee_name IN (SELECT UNNEST(?)) ORDER BY total DESC",
        [category, contractor_names]).fetchall()
    for awardee, org, _, _ in top_per_group(pair_rows, 0, 1):
        org_names.add(org)

    org_rows = con.execute(
        "SELECT organization_name, total, n FROM cat_org WHERE business_category = ? "
        "AND organization_name IN (SELECT UNNEST(?)) ORDER BY total DESC",
        [category, list(org_names)]).fetchall()
    for name, total, n in org_rows:
        g.node("organization", name, total, n)
    for name, total, n in contractors:
        g.node("contractor", name, total, n)

    # Department -> province (where it delivers)
    op_rows = con.execute(
        "SELECT organization_name, province, total, n FROM cat_org_province WHERE business_category = ? "
        "AND organization_name IN (SELECT UNNEST(?)) ORDER BY total DESC",
        [category, list(org_names)]).fetchall()
    op_rows = [r for r in op_rows if g.has("province", r[1])]
    kept = top_per_group(op_rows, 0, 2) + op_rows[: args.max_org_province_links]
    for org, province, total, n in kept:
        g.link(g.index[("province", province)], g.index[("organization", org)], total, n)

    # Contractor -> department (who awarded them)
    pair_rows = [r for r in pair_rows if g.has("organization", r[1])]
    kept = top_per_group(pair_rows, 0, 3) + pair_rows[: args.max_award_links]
    for awardee, org, total, n in kept:
        g.link(g.index[("organization", org)], g.index[("contractor", awardee)], total, n)

    # Departments whose deliveries have no known province still need an anchor
    linked = {l[1] for l in g.links.values()} | {l[0] for l in g.links.values()}
    for i, node in enumerate(g.nodes):
        if i not in linked and node[0] == "organization":
            g.link(root, i, node[2], node[3])

    return g.to_json(), cat


def build_overview(con, args):
    g = GraphBuilder()
    cats = con.execute("SELECT business_category, total, n FROM cat_totals ORDER BY total DESC").fetchall()
    for name, total, n in cats:
        g.node("category", name, total, n)

    for region, total, n in con.execute(
        "SELECT region, SUM(total), SUM(n) FROM cat_province WHERE region IS NOT NULL GROUP BY 1").fetchall():
        g.node("region", region, total, n)
    rc = con.execute(
        "SELECT business_category, region, SUM(total) t, SUM(n) FROM cat_province WHERE region IS NOT NULL "
        "GROUP BY 1, 2 ORDER BY t DESC").fetchall()
    for cat, region, total, n in top_per_group(rc, 0, 3):
        g.link(g.index[("category", cat)], g.index[("region", region)], total, n)

    orgs = con.execute(
        "SELECT organization_name, SUM(total) t, SUM(n) FROM cat_org GROUP BY 1 ORDER BY t DESC LIMIT ?",
        [args.overview_organizations]).fetchall()
    for name, total, n in orgs:
        g.node("organization", name, total, n)
    oc = con.execute(
        "SELECT organization_name, business_category, total, n FROM cat_org "
        "WHERE organization_name IN (SELECT UNNEST(?)) ORDER BY total DESC", [[o[0] for o in orgs]]).fetchall()
    for org, cat, total, n in top_per_group(oc, 0, 3):
        g.link(g.index[("category", cat)], g.index[("organization", org)], total, n)

    contractors = con.execute(
        "SELECT awardee_name, SUM(total) t, SUM(n) FROM cat_awardee GROUP BY 1 ORDER BY t DESC LIMIT ?",
        [args.overview_contractors]).fetchall()
    for name, total, n in contractors:
        g.node("contractor", name, total, n)
    names = [c[0] for c in contractors]
    ac = con.execute(
        "SELECT awardee_name, business_category, total, n FROM cat_awardee "
        "WHERE awardee_name IN (SELECT UNNEST(?)) ORDER BY total DESC", [names]).fetchall()
    for awardee, cat, total, n in top_per_group(ac, 0, 2):
        g.link(g.index[("category", cat)], g.index[("contractor", awardee)], total, n)
    ao = con.execute(
        "SELECT awardee_name, organization_name, SUM(total) t, SUM(n) FROM cat_pair "
        "WHERE awardee_name IN (SELECT UNNEST(?)) GROUP BY 1, 2 ORDER BY t DESC", [names]).fetchall()
    ao = [r for r in ao if g.has("organization", r[1])]
    for awardee, org, total, n in top_per_group(ao, 0, 2):
        g.link(g.index[("organization", org)], g.index[("contractor", awardee)], total, n)

    return g.to_json()


def main():
    parser = argparse.ArgumentParser(description="Generate sharded procurement network graph data")
    parser.add_argument("--input", default="philgeps.parquet", help="PhilGEPS parquet file")
    parser.add_argument("--output", default="../../public/data/network", help="Output directory")
    parser.add_argument("--contractors", type=int, default=400, help="Max contractors per category graph")
    parser.add_argument("--organizations", type=int, default=200, help="Top departments per category graph")
    parser.add_argument("--max-award-links", type=int, default=2500)
    parser.add_argument("--max-org-province-links", type=int, default=800)
    parser.add_argument("--overview-contractors", type=int, default=250)
    parser.add_argument("--overview-organizations", type=int, default=150)
    args = parser.parse_args()

    con = duckdb.connect()
    print(f"Reading {args.input}...")
    con.execute(f"""
        CREATE TABLE contracts AS
        SELECT awardee_name, organization_name, business_category, contract_amount,
               TRIM(area_of_delivery) AS area_of_delivery
        FROM read_parquet('{args.input}')
        WHERE awardee_name IS NOT NULL AND organization_name IS NOT NULL
          AND business_category IS NOT NULL AND contract_amount > 0
    """)

    province_rows = []
    for region, provinces in REGION_PROVINCES.items():
        for p in provinces:
            province_rows.append((p, PROVINCE_ALIASES.get(p, p), region))
    con.execute("CREATE TABLE province_map (area VARCHAR, province VARCHAR, region VARCHAR)")
    con.executemany("INSERT INTO province_map VALUES (?, ?, ?)", province_rows)

    con.execute("""
        CREATE TABLE c AS
        SELECT k.*, m.province, m.region FROM contracts k
        LEFT JOIN province_map m ON lower(k.area_of_delivery) = lower(m.area)
    """)
    for sql in [
        "CREATE TABLE cat_totals AS SELECT business_category, SUM(contract_amount) total, COUNT(*) n, "
        "COUNT(DISTINCT awardee_name) contractors, COUNT(DISTINCT organization_name) organizations "
        "FROM c GROUP BY 1",
        "CREATE TABLE cat_awardee AS SELECT business_category, awardee_name, SUM(contract_amount) total, COUNT(*) n "
        "FROM c GROUP BY 1, 2",
        "CREATE TABLE cat_org AS SELECT business_category, organization_name, SUM(contract_amount) total, COUNT(*) n "
        "FROM c GROUP BY 1, 2",
        "CREATE TABLE cat_pair AS SELECT business_category, awardee_name, organization_name, "
        "SUM(contract_amount) total, COUNT(*) n FROM c GROUP BY 1, 2, 3",
        "CREATE TABLE cat_province AS SELECT business_category, province, region, SUM(contract_amount) total, "
        "COUNT(*) n FROM c WHERE province IS NOT NULL GROUP BY 1, 2, 3",
        "CREATE TABLE cat_org_province AS SELECT business_category, organization_name, province, "
        "SUM(contract_amount) total, COUNT(*) n FROM c WHERE province IS NOT NULL GROUP BY 1, 2, 3",
    ]:
        con.execute(sql)

    out_dir = args.output
    cat_dir = os.path.join(out_dir, "categories")
    shutil.rmtree(cat_dir, ignore_errors=True)
    os.makedirs(cat_dir, exist_ok=True)

    categories = []
    used_slugs = set()
    rows = con.execute(
        "SELECT business_category, total, n, contractors, organizations FROM cat_totals ORDER BY total DESC"
    ).fetchall()
    for name, total, n, n_contractors, n_orgs in rows:
        slug = slugify(name)
        while slug in used_slugs:
            slug += "-x"
        used_slugs.add(slug)

        graph, _ = build_category_graph(con, name, args)
        graph["category"] = name
        with open(os.path.join(cat_dir, f"{slug}.json"), "w") as f:
            json.dump(graph, f, separators=(",", ":"), ensure_ascii=False)

        categories.append({
            "name": name, "slug": slug, "total": round(total), "count": n,
            "contractors": n_contractors, "organizations": n_orgs,
            "nodes": len(graph["nodes"]), "links": len(graph["links"]),
        })
        print(f"  {name}: {len(graph['nodes'])} nodes, {len(graph['links'])} links")

    totals = con.execute(
        "SELECT SUM(contract_amount), COUNT(*), COUNT(DISTINCT awardee_name), COUNT(DISTINCT organization_name) FROM c"
    ).fetchone()
    index = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "PhilGEPS contract awards (huggingface.co/datasets/bettergovph/philgeps-data)",
        "totals": {"value": round(totals[0]), "contracts": totals[1], "contractors": totals[2],
                   "organizations": totals[3]},
        "categories": categories,
        "overview": build_overview(con, args),
    }
    with open(os.path.join(out_dir, "index.json"), "w") as f:
        json.dump(index, f, separators=(",", ":"), ensure_ascii=False)

    print(f"Wrote {len(categories)} category graphs and index.json to {out_dir}")


if __name__ == "__main__":
    main()
