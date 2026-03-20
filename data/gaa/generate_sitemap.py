#!/usr/bin/python3
"""
Generate sitemap.xml for GAA Budget Browser aggregates.

This script reads the aggregate JSON files and generates a sitemap with:
- Homepage: /
- Budget home: /budget
- Departments list: /budget/departments
- Department pages: /budget/departments/{dept-slug}
- Agency pages: /budget/departments/{dept-slug}/agencies/{agency-slug}

The sitemap follows the hierarchy:
  Homepage (priority: 1.0)
  └── Budget Section (priority: 0.9)
      └── Departments List (priority: 0.9)
          └── Individual Departments (priority: 0.8)
              └── Individual Agencies (priority: 0.7)

Usage:
    python3 generate_sitemap.py
    python3 generate_sitemap.py --aggregates-dir ../../public/data/gaa/aggregates --output ../../public/sitemap-budget.xml --base-url https://yourdomain.com

Arguments:
    --aggregates-dir    Directory containing aggregate JSON files (default: ../../public/data/gaa/aggregates)
    --output           Output sitemap file (default: ../../public/sitemap-budget.xml)
    --base-url         Base URL for the site (default: https://yourdomain.com)

Output:
    Creates a sitemap.xml file with all budget pages properly structured.
"""

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom


def create_sitemap(departments, agencies, base_url, last_modified):
    """
    Create sitemap XML with proper hierarchy.
    
    Args:
        departments: List of department objects with slug field
        agencies: List of agency objects with slug field
        base_url: Base URL for the site
        last_modified: Last modification date in ISO format
    """
    # Create root element
    urlset = Element('urlset')
    urlset.set('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
    
    # Track added URLs to avoid duplicates
    added_urls = set()
    
    # Add homepage
    url = SubElement(urlset, 'url')
    SubElement(url, 'loc').text = base_url
    SubElement(url, 'lastmod').text = last_modified
    SubElement(url, 'changefreq').text = 'daily'
    SubElement(url, 'priority').text = '1.0'
    
    # Add budget home
    url = SubElement(urlset, 'url')
    SubElement(url, 'loc').text = f"{base_url}/budget"
    SubElement(url, 'lastmod').text = last_modified
    SubElement(url, 'changefreq').text = 'daily'
    SubElement(url, 'priority').text = '0.9'
    
    # Add departments list page
    url = SubElement(urlset, 'url')
    SubElement(url, 'loc').text = f"{base_url}/budget/departments"
    SubElement(url, 'lastmod').text = last_modified
    SubElement(url, 'changefreq').text = 'daily'
    SubElement(url, 'priority').text = '0.9'
    
    # Create department slug to ID mapping for agencies
    dept_slug_map = {dept['slug']: dept for dept in departments}
    
    # Add department pages
    print(f"\nAdding {len(departments)} department pages...")
    for dept in departments:
        if 'slug' not in dept:
            print(f"  Warning: Department missing slug: {dept.get('description', dept.get('id'))}")
            continue
            
        dept_url = f"{base_url}/budget/departments/{dept['slug']}"
        
        if dept_url not in added_urls:
            url = SubElement(urlset, 'url')
            SubElement(url, 'loc').text = dept_url
            SubElement(url, 'lastmod').text = last_modified
            SubElement(url, 'changefreq').text = 'weekly'
            SubElement(url, 'priority').text = '0.8'
            added_urls.add(dept_url)
    
    # Add agency pages (nested under departments)
    print(f"\nAdding {len(agencies)} agency pages...")
    agency_count = 0
    for agency in agencies:
        if 'slug' not in agency:
            print(f"  Warning: Agency missing slug: {agency.get('description', agency.get('id'))}")
            continue
        
        # Find parent department
        dept_id = agency.get('department_id')
        dept = None
        for d in departments:
            if d['id'] == dept_id:
                dept = d
                break
        
        if not dept or 'slug' not in dept:
            print(f"  Warning: Cannot find department for agency: {agency.get('description')}")
            continue
        
        agency_url = f"{base_url}/budget/departments/{dept['slug']}/agencies/{agency['slug']}"
        
        if agency_url not in added_urls:
            url = SubElement(urlset, 'url')
            SubElement(url, 'loc').text = agency_url
            SubElement(url, 'lastmod').text = last_modified
            SubElement(url, 'changefreq').text = 'weekly'
            SubElement(url, 'priority').text = '0.7'
            added_urls.add(agency_url)
            agency_count += 1
    
    print(f"\n✓ Added {agency_count} unique agency URLs")
    
    return urlset


def prettify_xml(elem):
    """Return a pretty-printed XML string for the Element."""
    rough_string = tostring(elem, encoding='utf-8')
    reparsed = minidom.parseString(rough_string)
    return reparsed.toprettyxml(indent="  ", encoding='utf-8').decode('utf-8')


def main():
    parser = argparse.ArgumentParser(
        description="Generate sitemap.xml for GAA Budget Browser"
    )
    parser.add_argument(
        '--aggregates-dir',
        default='../../public/data/gaa/aggregates',
        help='Directory containing aggregate JSON files (default: ../../public/data/gaa/aggregates)'
    )
    parser.add_argument(
        '--output',
        default='../../public/sitemap-budget.xml',
        help='Output sitemap file (default: ../../public/sitemap-budget.xml)'
    )
    parser.add_argument(
        '--base-url',
        default='https://transparency.bettergov.ph',
        help='Base URL for the site (default: https://transparency.bettergov.ph)'
    )
    args = parser.parse_args()
    
    # Resolve paths
    script_dir = Path(__file__).parent
    aggregates_dir = Path(args.aggregates_dir)
    if not aggregates_dir.is_absolute():
        aggregates_dir = script_dir / aggregates_dir
    
    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = script_dir / output_path
    
    print("\n" + "="*60)
    print("GAA Budget Sitemap Generator")
    print("="*60 + "\n")
    
    # Check if aggregates directory exists
    if not aggregates_dir.exists():
        print(f"✗ Aggregates directory not found: {aggregates_dir}")
        print("\nPlease run create_aggregates_sql.py first.")
        sys.exit(1)
    
    # Load departments
    dept_file = aggregates_dir / 'departments.json'
    if not dept_file.exists():
        print(f"✗ departments.json not found: {dept_file}")
        sys.exit(1)
    
    print(f"Loading departments from: {dept_file}")
    with open(dept_file, 'r', encoding='utf-8') as f:
        dept_data = json.load(f)
        departments = dept_data.get('data', [])
    
    print(f"✓ Loaded {len(departments)} departments")
    
    # Load agencies
    agency_file = aggregates_dir / 'agencies.json'
    if not agency_file.exists():
        print(f"✗ agencies.json not found: {agency_file}")
        sys.exit(1)
    
    print(f"Loading agencies from: {agency_file}")
    with open(agency_file, 'r', encoding='utf-8') as f:
        agency_data = json.load(f)
        agencies = agency_data.get('data', [])
    
    print(f"✓ Loaded {len(agencies)} agencies")
    
    # Get current date for lastmod
    last_modified = datetime.now().strftime('%Y-%m-%d')
    
    # Generate sitemap
    print(f"\nGenerating sitemap...")
    print(f"Base URL: {args.base_url}")
    
    urlset = create_sitemap(departments, agencies, args.base_url, last_modified)
    
    # Write sitemap
    print(f"\nWriting sitemap to: {output_path}")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    xml_string = prettify_xml(urlset)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(xml_string)
    
    # Count total URLs
    total_urls = len(urlset.findall('url'))
    
    print(f"\n{'='*60}")
    print(f"✓ Successfully generated sitemap")
    print(f"✓ Total URLs: {total_urls}")
    print(f"✓ Output file: {output_path}")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
