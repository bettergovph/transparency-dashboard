#!/usr/bin/env node
/**
 * Generate sitemap.xml for Procurement pages (Contractors, Organizations, Locations, Categories)
 * 
 * This script fetches data from MeiliSearch indices and generates a sitemap with:
 * - Contractors list: /contractors
 * - Individual contractors: /awardees/{slug}
 * - Organizations list: /organizations
 * - Individual organizations: /organizations/{slug}
 * - Locations list: /locations
 * - Individual locations: /locations/{slug}
 * - Categories list: /categories
 * - Individual categories: /categories/{slug}
 * 
 * The sitemap follows the hierarchy:
 *   Homepage (priority: 1.0)
 *   └── Procurement Pages (priority: 0.9)
 *       ├── Contractors List (priority: 0.8)
 *       │   └── Individual Contractors (priority: 0.6)
 *       ├── Organizations List (priority: 0.8)
 *       │   └── Individual Organizations (priority: 0.6)
 *       ├── Locations List (priority: 0.8)
 *       │   └── Individual Locations (priority: 0.6)
 *       └── Categories List (priority: 0.8)
 *           └── Individual Categories (priority: 0.6)
 * 
 * Usage:
 *     node scripts/generate-procurement-sitemap.mjs
 *     node scripts/generate-procurement-sitemap.mjs --base-url https://yourdomain.com --output public/sitemap-procurement.xml
 */

import { MeiliSearch } from 'meilisearch'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { config } from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
config({ path: join(__dirname, '../.env') })

// Parse command line arguments
const args = process.argv.slice(2)
const getArg = (flag, defaultValue) => {
  const index = args.indexOf(flag)
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue
}

const BASE_URL = getArg('--base-url', 'https://yourdomain.com')
const OUTPUT_FILE = getArg('--output', join(__dirname, '../public/sitemap-procurement.xml'))
const MEILISEARCH_HOST = process.env.VITE_MEILISEARCH_HOST || 'http://localhost:7700'
const MEILISEARCH_API_KEY = process.env.VITE_MEILISEARCH_API_KEY || 'masterKey'

// Initialize MeiliSearch client
const client = new MeiliSearch({
  host: MEILISEARCH_HOST,
  apiKey: MEILISEARCH_API_KEY,
})

/**
 * Convert text to SEO-friendly slug (matches frontend toSlug function)
 */
function toSlug(text) {
  if (!text) return ''
  // Convert to lowercase
  let slug = text.toLowerCase()
  // Replace spaces with hyphens
  slug = slug.replace(/\s+/g, '-')
  // Remove special characters (keep only alphanumeric and hyphens)
  slug = slug.replace(/[^a-z0-9-]/g, '')
  // Replace multiple consecutive hyphens with single hyphen
  slug = slug.replace(/-+/g, '-')
  // Strip hyphens from start and end
  slug = slug.replace(/^-+|-+$/g, '')
  return slug
}

/**
 * Fetch all items from a MeiliSearch index
 */
async function fetchAllFromIndex(indexName, field, limit = 10000) {
  try {
    const index = client.index(indexName)
    const result = await index.search('', {
      limit,
      attributesToRetrieve: [field],
    })

    return result.hits.map(hit => hit[field]).filter(Boolean)
  } catch (error) {
    console.error(`Error fetching from ${indexName}:`, error.message)
    return []
  }
}

/**
 * Generate XML sitemap
 */
function generateSitemap(urls) {
  const lastmod = new Date().toISOString().split('T')[0]

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

  urls.forEach(({ loc, priority, changefreq }) => {
    xml += '  <url>\n'
    xml += `    <loc>${loc}</loc>\n`
    xml += `    <lastmod>${lastmod}</lastmod>\n`
    xml += `    <changefreq>${changefreq || 'weekly'}</changefreq>\n`
    xml += `    <priority>${priority || '0.5'}</priority>\n`
    xml += '  </url>\n'
  })

  xml += '</urlset>\n'

  return xml
}

/**
 * Main function
 */
async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('Procurement Sitemap Generator')
  console.log('='.repeat(60) + '\n')

  console.log(`MeiliSearch Host: ${MEILISEARCH_HOST}`)
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Output: ${OUTPUT_FILE}\n`)

  const urls = []

  // Add homepage
  urls.push({
    loc: BASE_URL,
    priority: '1.0',
    changefreq: 'daily'
  })

  // Fetch data from MeiliSearch
  console.log('Fetching data from MeiliSearch...\n')

  // Contractors (Awardees)
  console.log('→ Fetching contractors...')
  const contractors = await fetchAllFromIndex('philgeps_awardees', 'awardee_name')
  console.log(`  ✓ Found ${contractors.length} contractors`)

  // Add contractors list page
  urls.push({
    loc: `${BASE_URL}/contractors`,
    priority: '0.8',
    changefreq: 'daily'
  })

  // Add individual contractor pages
  contractors.forEach(name => {
    const slug = toSlug(name)
    if (slug) {
      urls.push({
        loc: `${BASE_URL}/awardees/${slug}`,
        priority: '0.6',
        changefreq: 'weekly'
      })
    }
  })

  // Organizations
  console.log('→ Fetching organizations...')
  const organizations = await fetchAllFromIndex('philgeps_organizations', 'organization_name')
  console.log(`  ✓ Found ${organizations.length} organizations`)

  // Add organizations list page
  urls.push({
    loc: `${BASE_URL}/organizations`,
    priority: '0.8',
    changefreq: 'daily'
  })

  // Add individual organization pages
  organizations.forEach(name => {
    const slug = toSlug(name)
    if (slug) {
      urls.push({
        loc: `${BASE_URL}/organizations/${slug}`,
        priority: '0.6',
        changefreq: 'weekly'
      })
    }
  })

  // Locations (Area of Deliveries)
  console.log('→ Fetching locations...')
  const locations = await fetchAllFromIndex('philgeps_area_of_deliveries', 'area_of_delivery')
  console.log(`  ✓ Found ${locations.length} locations`)

  // Add locations list page
  urls.push({
    loc: `${BASE_URL}/locations`,
    priority: '0.8',
    changefreq: 'daily'
  })

  // Add individual location pages
  locations.forEach(name => {
    const slug = toSlug(name)
    if (slug) {
      urls.push({
        loc: `${BASE_URL}/locations/${slug}`,
        priority: '0.6',
        changefreq: 'weekly'
      })
    }
  })

  // Categories (Business Categories)
  console.log('→ Fetching categories...')
  const categories = await fetchAllFromIndex('philgeps_business_categories', 'business_category')
  console.log(`  ✓ Found ${categories.length} categories`)

  // Add categories list page
  urls.push({
    loc: `${BASE_URL}/categories`,
    priority: '0.8',
    changefreq: 'daily'
  })

  // Add individual category pages
  categories.forEach(name => {
    const slug = toSlug(name)
    if (slug) {
      urls.push({
        loc: `${BASE_URL}/categories/${slug}`,
        priority: '0.6',
        changefreq: 'weekly'
      })
    }
  })

  // Generate sitemap XML
  console.log('\nGenerating sitemap...')
  const xml = generateSitemap(urls)

  // Write to file
  console.log(`Writing to ${OUTPUT_FILE}...`)
  writeFileSync(OUTPUT_FILE, xml, 'utf-8')

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('✓ Successfully generated sitemap')
  console.log(`✓ Total URLs: ${urls.length}`)
  console.log(`  - Homepage: 1`)
  console.log(`  - Contractors list: 1`)
  console.log(`  - Individual contractors: ${contractors.length}`)
  console.log(`  - Organizations list: 1`)
  console.log(`  - Individual organizations: ${organizations.length}`)
  console.log(`  - Locations list: 1`)
  console.log(`  - Individual locations: ${locations.length}`)
  console.log(`  - Categories list: 1`)
  console.log(`  - Individual categories: ${categories.length}`)
  console.log(`✓ Output file: ${OUTPUT_FILE}`)
  console.log('='.repeat(60) + '\n')
}

// Run main function
main().catch(error => {
  console.error('Error:', error)
  process.exit(1)
})
