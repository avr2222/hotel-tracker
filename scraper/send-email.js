/**
 * scraper/send-email.js
 *
 * Reads hotels-data.json, filters by price/points tiers,
 * and sends a formatted digest email via Gmail (App Password or OAuth).
 *
 * Setup:
 *   1. Enable Gmail 2FA → generate an App Password at myaccount.google.com/apppasswords
 *   2. Set env vars: GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_TO
 *   3. Run: node send-email.js
 */

import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DATA_PATH = path.resolve(__dirname, '../public/hotels-data.json')
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://YOUR_GITHUB_USERNAME.github.io/hotel-tracker/'

// ── Load data ────────────────────────────────────────────────────────────────
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))

// ── Price / Points tiers ─────────────────────────────────────────────────────
const tajUnder10k   = [...data.taj, ...data.seleqtions].filter(h => h.price < 10000).sort((a, b) => a.price - b.price)
const tajUnder15k   = [...data.taj, ...data.seleqtions].filter(h => h.price >= 10000 && h.price < 15000).sort((a, b) => a.price - b.price)

const marUnder10k   = data.marriott.filter(h => h.points < 10000).sort((a, b) => a.points - b.points)
const marUnder15k   = data.marriott.filter(h => h.points >= 10000 && h.points < 15000).sort((a, b) => a.points - b.points)
const marUnder20k   = data.marriott.filter(h => h.points >= 15000 && h.points < 20000).sort((a, b) => a.points - b.points)

// ── HTML Helpers ─────────────────────────────────────────────────────────────
function hotelRow(hotel) {
  const isMarriott = 'points' in hotel
  const price = isMarriott
    ? `<strong>${hotel.points.toLocaleString('en-IN')} pts</strong> <span style="color:#888;font-size:12px">(₹${hotel.cash_price?.toLocaleString('en-IN')} cash)</span>`
    : `<strong>₹${hotel.price.toLocaleString('en-IN')}</strong>`

  const brandColor = hotel.brand === 'Taj' ? '#8B1A1A' : hotel.brand === 'SeleQtions' ? '#4A2060' : '#003580'

  return `
    <tr style="border-bottom:1px solid #f0ece6;">
      <td style="padding:10px 12px;">
        <span style="font-size:10px;font-weight:600;color:${brandColor};text-transform:uppercase;letter-spacing:0.05em;">${hotel.brand}</span><br>
        <a href="${hotel.url}" style="color:#1c1c1c;font-weight:600;text-decoration:none;font-size:14px;">${hotel.name}</a><br>
        <span style="color:#888;font-size:12px;">📍 ${hotel.city} · ${hotel.room_type}</span>
      </td>
      <td style="padding:10px 12px;text-align:right;vertical-align:top;font-size:14px;white-space:nowrap;">${price}</td>
    </tr>`
}

function section(title, hotels, color, emptyMsg = 'No properties in this range') {
  if (hotels.length === 0) {
    return `<h3 style="color:${color};margin:24px 0 8px;">${title}</h3>
    <p style="color:#888;font-size:13px;font-style:italic;">${emptyMsg}</p>`
  }
  return `
    <h3 style="color:${color};margin:24px 0 8px;">${title} <span style="font-size:13px;font-weight:400;color:#888;">(${hotels.length} found)</span></h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e8e4df;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#f6f4f0;">
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;">Property</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;color:#888;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;">Price</th>
        </tr>
      </thead>
      <tbody>${hotels.map(hotelRow).join('')}</tbody>
    </table>`
}

// ── Build HTML email ──────────────────────────────────────────────────────────
const updatedAt = new Date(data.last_updated).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })
const { check_in, check_out } = data.search_params

const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'DM Sans',Arial,sans-serif;background:#f6f4f0;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:#1c1612;border-radius:12px;padding:24px 28px;margin-bottom:20px;">
      <h1 style="color:#f5efe8;font-size:22px;font-weight:600;margin:0 0 6px;">🏨 Hotel Deals Digest</h1>
      <p style="color:#a89880;font-size:13px;margin:0;">Scraped ${updatedAt} · Dates: ${check_in} → ${check_out}</p>
    </div>

    <!-- Summary bar -->
    <div style="background:#fff;border-radius:8px;padding:14px 18px;margin-bottom:20px;border:1px solid #e8e4df;display:flex;flex-wrap:wrap;gap:12px;">
      <span style="font-size:13px;color:#1c1c1c;">Taj+SeleQtions under ₹10K: <strong style="color:#1a6b3a;">${tajUnder10k.length}</strong></span>
      <span style="color:#ddd;">·</span>
      <span style="font-size:13px;color:#1c1c1c;">Under ₹15K: <strong style="color:#7a4f00;">${tajUnder15k.length}</strong></span>
      <span style="color:#ddd;">·</span>
      <span style="font-size:13px;color:#1c1c1c;">Marriott under 10K pts: <strong style="color:#003580;">${marUnder10k.length}</strong></span>
      <span style="color:#ddd;">·</span>
      <span style="font-size:13px;color:#1c1c1c;">Under 15K pts: <strong style="color:#003580;">${marUnder15k.length}</strong></span>
    </div>

    <!-- Taj + SeleQtions sections -->
    <div style="background:#fff;border-radius:12px;padding:20px 24px;margin-bottom:16px;border:1px solid #e8e4df;">
      <h2 style="font-size:16px;color:#1c1c1c;margin:0 0 4px;">Taj Hotels & SeleQtions</h2>
      <p style="color:#888;font-size:12px;margin:0 0 16px;">Cash prices per night · Taxes included</p>
      ${section('Under ₹10,000 / night', tajUnder10k, '#1a6b3a')}
      ${section('₹10,000 – ₹15,000 / night', tajUnder15k, '#7a4f00')}
    </div>

    <!-- Marriott sections -->
    <div style="background:#fff;border-radius:12px;padding:20px 24px;margin-bottom:16px;border:1px solid #e8e4df;">
      <h2 style="font-size:16px;color:#1c1c1c;margin:0 0 4px;">Marriott Bonvoy</h2>
      <p style="color:#888;font-size:12px;margin:0 0 16px;">Points redemption · Cash alternative shown</p>
      ${section('Under 10,000 points', marUnder10k, '#003580')}
      ${section('10,000 – 15,000 points', marUnder15k, '#185FA5')}
      ${section('15,000 – 20,000 points', marUnder20k, '#378ADD')}
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:24px 0;">
      <a href="${WEBAPP_URL}" style="background:#1c1612;color:#f5efe8;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
        Open Full Dashboard →
      </a>
    </div>

    <!-- Footer -->
    <p style="text-align:center;font-size:11px;color:#aaa;margin-top:24px;">
      Automated digest · Prices may change · Always verify on hotel website before booking
    </p>
  </div>
</body>
</html>`

// ── Send ──────────────────────────────────────────────────────────────────────
async function sendEmail() {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD, // Gmail App Password (not your real password)
    },
  })

  const totalDeals = tajUnder10k.length + tajUnder15k.length + marUnder10k.length + marUnder15k.length + marUnder20k.length

  const info = await transporter.sendMail({
    from: `"Hotel Deals Tracker" <${process.env.GMAIL_USER}>`,
    to: process.env.EMAIL_TO || process.env.GMAIL_USER,
    subject: `🏨 ${totalDeals} hotel deals found · ${check_in} — Taj ${tajUnder10k.length} under ₹10K · Marriott ${marUnder10k.length} under 10K pts`,
    html,
  })

  console.log('✅ Email sent:', info.messageId)
}

sendEmail().catch(err => {
  console.error('❌ Email error:', err.message)
  process.exit(1)
})
