/**
 * scraper/taj-scraper.js
 *
 * Scrapes Taj Hotels and SeleQtions for room prices.
 * Uses Playwright (headless Chromium) since tajhotels.com is JS-rendered.
 *
 * Run: node taj-scraper.js
 * Output: writes to ../public/hotels-data.json
 */

import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── CONFIG ─────────────────────────────────────────────────────────────────
const CONFIG = {
  checkIn: process.env.CHECK_IN || getTomorrowDate(),
  checkOut: process.env.CHECK_OUT || getDayAfterDate(),
  guests: 2,
  cities: ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Goa', 'Jaipur'],
  outputPath: path.resolve(__dirname, '../public/hotels-data.json'),
}

function getTomorrowDate() {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}
function getDayAfterDate() {
  const d = new Date(); d.setDate(d.getDate() + 2)
  return d.toISOString().split('T')[0]
}

// ── TAJ HOTELS ──────────────────────────────────────────────────────────────
// Taj uses a search URL format:
// https://www.tajhotels.com/en-in/results/?destination=Mumbai&checkIn=2025-06-15&checkOut=2025-06-16&adults=2
async function scrapeTajCity(page, city) {
  const url = `https://www.tajhotels.com/en-in/results/?destination=${encodeURIComponent(city)}&checkIn=${CONFIG.checkIn}&checkOut=${CONFIG.checkOut}&adults=${CONFIG.guests}`
  console.log(`  Taj → ${city}: ${url}`)

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    // Wait for hotel cards to load
    await page.waitForSelector('[class*="hotel-card"], [class*="HotelCard"], [data-testid*="hotel"]', { timeout: 15000 }).catch(() => {})

    const hotels = await page.evaluate((city) => {
      const results = []

      // Taj's DOM structure — adjust selectors if they change their markup
      const cards = document.querySelectorAll('[class*="hotel-card"], [class*="HotelCard"], article[class*="hotel"]')

      cards.forEach((card, i) => {
        const nameEl = card.querySelector('[class*="hotel-name"], [class*="HotelName"], h2, h3')
        const priceEl = card.querySelector('[class*="price"], [class*="Price"], [class*="rate"]')
        const roomEl = card.querySelector('[class*="room-type"], [class*="RoomType"]')
        const linkEl = card.querySelector('a[href*="tajhotels"]') || card.closest('a')
        const brandEl = card.querySelector('[class*="brand"], [class*="Brand"]')

        const name = nameEl?.textContent?.trim()
        const priceText = priceEl?.textContent?.trim() || ''
        const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0

        if (name && price > 0) {
          results.push({
            id: `t_${city}_${i}`,
            brand: brandEl?.textContent?.toLowerCase().includes('seleqtions') ? 'SeleQtions' : 'Taj',
            name,
            city,
            price,
            currency: 'INR',
            room_type: roomEl?.textContent?.trim() || 'Standard Room',
            url: linkEl?.href || `https://www.tajhotels.com/en-in/results/?destination=${city}`,
          })
        }
      })

      return results
    }, city)

    console.log(`    Found ${hotels.length} Taj/SeleQtions hotels in ${city}`)
    return hotels
  } catch (err) {
    console.warn(`    Failed to scrape Taj for ${city}: ${err.message}`)
    return []
  }
}

// ── MARRIOTT ────────────────────────────────────────────────────────────────
// Marriott search: https://www.marriott.com/search/findHotels.mi?city=Bengaluru&...
async function scrapeMarriottCity(page, city) {
  // Marriott uses a different approach — their points are shown on the hotel page
  // We scrape the search results page for cash prices, then estimate points from category
  const url = `https://www.marriott.com/search/findHotels.mi?city=${encodeURIComponent(city)}&countryCode=IN&checkInDate=${CONFIG.checkIn}&checkOutDate=${CONFIG.checkOut}&numberOfRooms=1&guestCount=${CONFIG.guests}`
  console.log(`  Marriott → ${city}`)

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForSelector('[class*="hotel-card"], [data-testid="property-card"], [class*="l-property"]', { timeout: 15000 }).catch(() => {})

    const hotels = await page.evaluate((city, checkIn, checkOut) => {
      const results = []
      // Marriott DOM — adjust selectors as needed
      const cards = document.querySelectorAll('[data-testid="property-card"], [class*="l-property-card"], [class*="propertyCard"]')

      // Points redemption category map (approximate 2025 Bonvoy chart)
      const categoryPoints = { 1: 5000, 2: 12500, 3: 17500, 4: 25000, 5: 35000, 6: 50000, 7: 70000, 8: 85000 }

      cards.forEach((card, i) => {
        const nameEl = card.querySelector('[class*="property-name"], [class*="t-line-clamp"], h3, h2')
        const priceEl = card.querySelector('[class*="price"], [class*="t-price"]')
        const catEl = card.querySelector('[class*="category"], [data-category]')
        const linkEl = card.querySelector('a')

        const name = nameEl?.textContent?.trim()
        const priceText = priceEl?.textContent?.trim() || ''
        const cashPrice = parseInt(priceText.replace(/[^0-9]/g, '')) || 0
        const category = parseInt(catEl?.dataset?.category || catEl?.textContent?.match(/\d/)?.[0] || '3')
        const points = categoryPoints[category] || 17500

        if (name) {
          results.push({
            id: `m_${city}_${i}`,
            brand: 'Marriott',
            name,
            city,
            points,
            cash_price: cashPrice,
            room_type: 'Standard Room',
            category: category || 3,
            url: linkEl?.href || `https://www.marriott.com/search/findHotels.mi?city=${city}`,
          })
        }
      })

      return results
    }, city, CONFIG.checkIn, CONFIG.checkOut)

    console.log(`    Found ${hotels.length} Marriott hotels in ${city}`)
    return hotels
  } catch (err) {
    console.warn(`    Failed to scrape Marriott for ${city}: ${err.message}`)
    return []
  }
}

// ── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🏨 Hotel Scraper starting...')
  console.log(`   Dates: ${CONFIG.checkIn} → ${CONFIG.checkOut}`)
  console.log(`   Cities: ${CONFIG.cities.join(', ')}`)

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  })

  const page = await context.newPage()

  const allTaj = []
  const allSeleqtions = []
  const allMarriott = []

  // Scrape Taj + SeleQtions
  console.log('\n📍 Scraping Taj Hotels + SeleQtions...')
  for (const city of CONFIG.cities) {
    const results = await scrapeTajCity(page, city)
    allTaj.push(...results.filter(h => h.brand === 'Taj'))
    allSeleqtions.push(...results.filter(h => h.brand === 'SeleQtions'))
    await page.waitForTimeout(2000) // polite delay
  }

  // Scrape Marriott
  console.log('\n📍 Scraping Marriott Bonvoy...')
  for (const city of CONFIG.cities) {
    const results = await scrapeMarriottCity(page, city)
    allMarriott.push(...results)
    await page.waitForTimeout(2000)
  }

  await browser.close()

  // Build output
  const output = {
    last_updated: new Date().toISOString(),
    search_params: {
      cities: CONFIG.cities,
      check_in: CONFIG.checkIn,
      check_out: CONFIG.checkOut,
      guests: CONFIG.guests,
    },
    taj: allTaj,
    seleqtions: allSeleqtions,
    marriott: allMarriott,
  }

  // If scraper got nothing (site blocked, selectors changed), keep existing data
  const totalFound = allTaj.length + allSeleqtions.length + allMarriott.length
  if (totalFound === 0) {
    console.warn('\n⚠️  No hotels scraped — selectors may need updating. Keeping existing data.')
    process.exit(1)
  }

  fs.writeFileSync(CONFIG.outputPath, JSON.stringify(output, null, 2))
  console.log(`\n✅ Done! Wrote ${totalFound} hotels to ${CONFIG.outputPath}`)
  console.log(`   Taj: ${allTaj.length} | SeleQtions: ${allSeleqtions.length} | Marriott: ${allMarriott.length}`)
}

main().catch(err => {
  console.error('❌ Scraper error:', err)
  process.exit(1)
})
