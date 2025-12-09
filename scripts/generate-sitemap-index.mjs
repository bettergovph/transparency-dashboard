#!/usr/bin/env node
/**
 * Generate master sitemap index that references all sub-sitemaps
 * 
 * This script creates a sitemap index (sitemap.xml) that references:
 * - sitemap-budget.xml (Budget pages - departments, agencies)
 * - sitemap-procurement.xml (Procurement pages - contractors, organizations, locations, categories)
 * 
 * Usage:
 *     node scripts/generate-sitemap-index.mjs
 *     node scripts/generate-sitemap-index.mjs --base-url https://yourdomain.com
 */

import { writeFileSync, existsSync, statSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Parse command line arguments
const args = process.argv.slice(2)
const getArg = (flag, defaultValue) => {
  const index = args.indexOf(flag)
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue
}

const BASE_URL = getArg('--base-url', 'https://yourdomain.com')
const OUTPUT_FILE = getArg('--output', join(__dirname, '../public/sitemap.xml'))

/**
 * Generate sitemap index XML
 */
function generateSitemapIndex(sitemaps) {
  const lastmod = new Date().toISOString().split('T')[0]

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

  sitemaps.forEach(({ loc, lastmod: sitemapLastmod }) => {
    xml += '  <sitemap>\n'
    xml += `    <loc>${loc}</loc>\n`
    xml += `    <lastmod>${sitemapLastmod || lastmod}</lastmod>\n`
    xml += '  </sitemap>\n'
  })

  xml += '</sitemapindex>\n'

  return xml
}

/**
 * Get last modified date from file
 */
function getLastModified(filePath) {
  try {
    if (existsSync(filePath)) {
      const stats = statSync(filePath)
      return stats.mtime.toISOString().split('T')[0]
    }
  } catch (error) {
    console.error(`Error getting lastmod for ${filePath}:`, error.message)
  }
  return new Date().toISOString().split('T')[0]
}

/**
 * Main function
 */
function main() {
  console.log('\n' + '='.repeat(60))
  console.log('Master Sitemap Index Generator')
  console.log('='.repeat(60) + '\n')

  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Output: ${OUTPUT_FILE}\n`)

  const publicDir = join(__dirname, '../public')

  const sitemaps = [
    {
      loc: `${BASE_URL}/sitemap-budget.xml`,
      file: join(publicDir, 'sitemap-budget.xml'),
      name: 'Budget Sitemap'
    },
    {
      loc: `${BASE_URL}/sitemap-procurement.xml`,
      file: join(publicDir, 'sitemap-procurement.xml'),
      name: 'Procurement Sitemap'
    }
  ]

  const validSitemaps = []

  console.log('Checking for existing sitemaps...\n')

  sitemaps.forEach(({ loc, file, name }) => {
    if (existsSync(file)) {
      const lastmod = getLastModified(file)
      validSitemaps.push({ loc, lastmod })
      console.log(`  ✓ Found ${name}: ${file}`)
      console.log(`    Last modified: ${lastmod}`)
    } else {
      console.log(`  ⚠ Missing ${name}: ${file}`)
      console.log(`    Please run the corresponding generator script`)
    }
  })

  if (validSitemaps.length === 0) {
    console.log('\n✗ No sitemaps found. Please generate sub-sitemaps first:')
    console.log('  npm run generate:sitemap')
    console.log('  npm run generate:sitemap:procurement')
    process.exit(1)
  }

  console.log('\nGenerating sitemap index...')
  const xml = generateSitemapIndex(validSitemaps)

  console.log(`Writing to ${OUTPUT_FILE}...`)
  writeFileSync(OUTPUT_FILE, xml, 'utf-8')

  console.log('\n' + '='.repeat(60))
  console.log('✓ Successfully generated sitemap index')
  console.log(`✓ Total sub-sitemaps: ${validSitemaps.length}`)
  validSitemaps.forEach(({ loc }) => {
    console.log(`  - ${loc}`)
  })
  console.log(`✓ Output file: ${OUTPUT_FILE}`)
  console.log('='.repeat(60) + '\n')

  console.log('Next steps:')
  console.log('  1. Update base URL in scripts if needed')
  console.log('  2. Upload sitemap.xml and sub-sitemaps to your server')
  console.log(`  3. Submit ${BASE_URL}/sitemap.xml to search engines`)
  console.log(`  4. Add to robots.txt: Sitemap: ${BASE_URL}/sitemap.xml\n`)
}

// Run main function
main()
