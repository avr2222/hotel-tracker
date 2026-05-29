# 🏨 Hotel Deals Tracker

Tracks room prices across **Taj Hotels**, **SeleQtions**, and **Marriott Bonvoy** for cities across India.
Scrapes daily via GitHub Actions, stores data as JSON, deploys a React dashboard to GitHub Pages, and emails a digest.

---

## What it does

| Feature | Detail |
|---|---|
| **Scrapes** | Taj Hotels, SeleQtions, Marriott Bonvoy |
| **Price tiers** | Taj/SeleQtions: under ₹10K / ₹15K |
| **Points tiers** | Marriott: under 10K / 15K / 20K points |
| **Schedule** | Daily at 6:00 AM IST via GitHub Actions |
| **Dashboard** | React app on GitHub Pages |
| **Email digest** | Gmail with filtered deal summary |

---

## Setup

### 1. Fork / clone this repo

```bash
git clone https://github.com/YOUR_USERNAME/hotel-tracker.git
cd hotel-tracker
```

### 2. Update `vite.config.ts`

Change the `base` to your repo name:
```ts
base: '/hotel-tracker/',  // ← your GitHub repo name
```

### 3. Add GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|---|---|
| `GMAIL_USER` | your Gmail address, e.g. `venkat@gmail.com` |
| `GMAIL_APP_PASSWORD` | Gmail App Password (not your real password) |
| `EMAIL_TO` | recipient email (can be same as GMAIL_USER) |

**How to get Gmail App Password:**
1. Enable 2-Factor Authentication on your Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create a new App Password → select "Mail" → copy the 16-char code

### 4. Enable GitHub Pages

- Go to **Settings → Pages**
- Source: **GitHub Actions**

### 5. Trigger manually (first run)

- Go to **Actions → Daily Hotel Scrape & Deploy → Run workflow**

---

## Local development

```bash
# React app
npm install
npm run dev

# Scraper (from scraper/ folder)
cd scraper
npm install
npx playwright install chromium
CHECK_IN=2025-06-15 CHECK_OUT=2025-06-16 node scrape.js

# Send email manually
GMAIL_USER=you@gmail.com GMAIL_APP_PASSWORD=xxxx EMAIL_TO=you@gmail.com node send-email.js
```

---

## Customise cities / dates

Edit `scraper/scrape.js`:
```js
const CONFIG = {
  cities: ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Goa', 'Jaipur'],
  // Dates default to tomorrow/day-after. Override via env vars:
  // CHECK_IN=2025-07-01 CHECK_OUT=2025-07-02 node scrape.js
}
```

---

## Important notes

- Hotel websites use JS rendering and may change their DOM selectors. If the scraper stops finding hotels, inspect `scraper/scrape.js` and update the CSS selectors to match current markup.
- Marriott points are estimated from property category. For exact points redemption, always check [marriott.com](https://www.marriott.com).
- This tool is for personal use only. Respect each site's `robots.txt` and terms of service.

---

## File structure

```
hotel-tracker/
├── public/
│   └── hotels-data.json        ← scraped data (updated daily by Actions)
├── src/
│   ├── App.tsx                 ← main React app
│   ├── App.css
│   ├── types.ts
│   └── components/
│       ├── TajCard.tsx
│       └── MarriottCard.tsx
├── scraper/
│   ├── scrape.js               ← Playwright scraper
│   ├── send-email.js           ← Gmail email sender
│   └── package.json
├── .github/workflows/
│   └── daily-scrape.yml        ← GitHub Actions cron
├── vite.config.ts
└── package.json
```
