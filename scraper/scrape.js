/**
 * scraper/scrape.js
 *
 * Scrapes Taj Hotels, SeleQtions, and Marriott Bonvoy across a range of dates
 * to find the cheapest available night per hotel.
 *
 * Run: node scrape.js
 * Env: DAYS_AHEAD (default 14) — how many future nights to check
 * Output: writes to ../public/hotels-data.json
 */

import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── CONFIG ─────────────────────────────────────────────────────────────────
const CONFIG = {
  daysAhead: parseInt(process.env.DAYS_AHEAD || '14'),
  guests: 2,
  cities: ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Goa', 'Jaipur'],
  outputPath: path.resolve(__dirname, '../public/hotels-data.json'),
}

function getDateRange() {
  const dates = []
  const today = new Date()
  for (let i = 1; i <= CONFIG.daysAhead; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

function getNextDay(dateStr) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

// ── TAJ HOTELS ──────────────────────────────────────────────────────────────
async function scrapeTajCity(page, city, date) {
  const checkOut = getNextDay(date)
  const url = `https://www.tajhotels.com/en-in/results/?destination=${encodeURIComponent(city)}&checkIn=${date}&checkOut=${checkOut}&adults=${CONFIG.guests}`
  console.log(`  Taj → ${city} [${date}]`)

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForSelector(
      '[class*="hotel-card"], [class*="HotelCard"], [data-testid*="hotel"]',
      { timeout: 15000 }
    ).catch(() => {})

    // Scroll to trigger lazy-loaded cards, then wait for hydration
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(2000)

    const hotels = await page.evaluate((city) => {
      const results = []

      // Try specific selectors first, then fall back to broader patterns
      let cards = document.querySelectorAll(
        '[class*="hotel-card"], [class*="HotelCard"], article[class*="hotel"]'
      )
      if (cards.length === 0)
        cards = document.querySelectorAll(
          '[class*="property"], [class*="listing"], [class*="result"] article, [class*="result"] li'
        )

      cards.forEach((card) => {
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

    if (hotels.length === 0) {
      // Save screenshot so CI artifact shows what actually rendered
      await page.screenshot({ path: `debug-taj-${city}-${date}.png`, fullPage: true })
    }

    console.log(`    Found ${hotels.length} Taj/SeleQtions hotels`)
    return hotels
  } catch (err) {
    console.warn(`    Failed to scrape Taj for ${city} [${date}]: ${err.message}`)
    return []
  }
}

// ── MARRIOTT ────────────────────────────────────────────────────────────────
async function scrapeMarriottCity(page, city, date) {
  const checkOut = getNextDay(date)
  const url = `https://www.marriott.com/search/findHotels.mi?city=${encodeURIComponent(city)}&countryCode=IN&checkInDate=${date}&checkOutDate=${checkOut}&numberOfRooms=1&guestCount=${CONFIG.guests}`
  console.log(`  Marriott → ${city} [${date}]`)

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForSelector(
      '[class*="hotel-card"], [data-testid="property-card"], [class*="l-property"]',
      { timeout: 15000 }
    ).catch(() => {})

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(2000)

    // page.evaluate() accepts only one argument after the callback — wrap in object if multiple needed
    const hotels = await page.evaluate((city) => {
      const results = []
      const cards = document.querySelectorAll(
        '[data-testid="property-card"], [class*="l-property-card"], [class*="propertyCard"]'
      )
      const categoryPoints = { 1: 5000, 2: 12500, 3: 17500, 4: 25000, 5: 35000, 6: 50000, 7: 70000, 8: 85000 }

      cards.forEach((card) => {
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
    }, city)

    console.log(`    Found ${hotels.length} Marriott hotels`)
    return hotels
  } catch (err) {
    console.warn(`    Failed to scrape Marriott for ${city} [${date}]: ${err.message}`)
    return []
  }
}

// ── FINALIZE ─────────────────────────────────────────────────────────────────
function finalizeTaj(bucket) {
  return Object.values(bucket).map((h, i) => {
    const cheapest = h.prices.reduce((a, b) => (a.price <= b.price ? a : b))
    const { price, ...rest } = h
    return {
      ...rest,
      id: `t_${h.city.toLowerCase().replace(/\s+/g, '_')}_${i}`,
      cheapest_price: cheapest.price,
      cheapest_date: cheapest.date,
      prices: [...h.prices].sort((a, b) => a.date.localeCompare(b.date)),
    }
  })
}

function finalizeMarriott(bucket) {
  return Object.values(bucket).map((h, i) => {
    const withCash = h.prices.filter(p => p.cash_price > 0)
    const cheapestCash = withCash.length
      ? withCash.reduce((a, b) => (a.cash_price <= b.cash_price ? a : b))
      : h.prices[0]
    const cheapestPts = h.prices.reduce((a, b) => (a.points <= b.points ? a : b))
    const { cash_price, points, ...rest } = h
    return {
      ...rest,
      id: `m_${h.city.toLowerCase().replace(/\s+/g, '_')}_${i}`,
      cheapest_cash_price: cheapestCash?.cash_price ?? 0,
      cheapest_points: cheapestPts.points,
      cheapest_date: cheapestPts.date,
      prices: [...h.prices].sort((a, b) => a.date.localeCompare(b.date)),
    }
  })
}

// ── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  const dates = getDateRange()
  console.log('🏨 Hotel Scraper starting...')
  console.log(`   Dates: ${dates[0]} → ${dates[dates.length - 1]} (${dates.length} nights)`)
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

  const tajByKey = {}
  const selByKey = {}
  const marByKey = {}

  console.log('\n📍 Scraping Taj Hotels + SeleQtions...')
  for (const date of dates) {
    for (const city of CONFIG.cities) {
      const results = await scrapeTajCity(page, city, date)
      for (const h of results) {
        const key = `${h.city}__${h.name}`
        const bucket = h.brand === 'SeleQtions' ? selByKey : tajByKey
        if (!bucket[key]) bucket[key] = { ...h, prices: [] }
        bucket[key].prices.push({ date, price: h.price, room_type: h.room_type })
      }
      await page.waitForTimeout(1500)
    }
  }

  console.log('\n📍 Scraping Marriott Bonvoy...')
  for (const date of dates) {
    for (const city of CONFIG.cities) {
      const results = await scrapeMarriottCity(page, city, date)
      for (const h of results) {
        const key = `${h.city}__${h.name}`
        if (!marByKey[key]) marByKey[key] = { ...h, prices: [] }
        marByKey[key].prices.push({ date, cash_price: h.cash_price, points: h.points })
      }
      await page.waitForTimeout(1500)
    }
  }

  await browser.close()

  const allTaj = finalizeTaj(tajByKey)
  const allSeleqtions = finalizeTaj(selByKey)
  const allMarriott = finalizeMarriott(marByKey)

  const totalFound = allTaj.length + allSeleqtions.length + allMarriott.length
  if (totalFound === 0) {
    console.warn('\n⚠️  No hotels scraped — selectors may need updating. Keeping existing data.')
    process.exit(1)
  }

  const output = {
    last_updated: new Date().toISOString(),
    search_params: {
      cities: CONFIG.cities,
      date_range: { from: dates[0], to: dates[dates.length - 1] },
      days_ahead: CONFIG.daysAhead,
      guests: CONFIG.guests,
    },
    taj: allTaj,
    seleqtions: allSeleqtions,
    marriott: allMarriott,
  }

  fs.writeFileSync(CONFIG.outputPath, JSON.stringify(output, null, 2))
  console.log(`\n✅ Done! Wrote ${totalFound} hotels to ${CONFIG.outputPath}`)
  console.log(`   Taj: ${allTaj.length} | SeleQtions: ${allSeleqtions.length} | Marriott: ${allMarriott.length}`)
}

main().catch(err => {
  console.error('❌ Scraper error:', err)
  process.exit(1)
})
