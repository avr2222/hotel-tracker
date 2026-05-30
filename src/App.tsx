import { useState, useEffect } from 'react'
import { HotelsData, TajHotel, MarriottHotel, ActiveTab } from './types'
import TajCard from './components/TajCard'
import MarriottCard from './components/MarriottCard'
import './App.css'

const BASE_URL = import.meta.env.BASE_URL

const PRICE_FILTERS = [
  { label: 'All prices', value: 0 },
  { label: 'Under ₹10K', value: 10000 },
  { label: 'Under ₹15K', value: 15000 },
  { label: 'Under ₹20K', value: 20000 },
]

const POINTS_FILTERS = [
  { label: 'All points', value: 0 },
  { label: '< 10K pts', value: 10000 },
  { label: '< 15K pts', value: 15000 },
  { label: '< 20K pts', value: 20000 },
]

const CITIES = ['All Cities', 'Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Goa', 'Chennai', 'Jaipur', 'Jodhpur', 'Udaipur']

export default function App() {
  const [data, setData] = useState<HotelsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('taj')
  const [priceFilter, setPriceFilter] = useState(0)
  const [pointsFilter, setPointsFilter] = useState(0)
  const [cityFilter, setCityFilter] = useState('All Cities')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetch(`${BASE_URL}hotels-data.json`)
      .then(r => r.json())
      .then((d: HotelsData) => { setData(d); setLoading(false) })
      .catch(() => { setError('Failed to load hotel data.'); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>Loading hotel deals...</p>
    </div>
  )

  if (error || !data) return (
    <div className="loading-screen">
      <p className="error-text">{error || 'No data available.'}</p>
    </div>
  )

  const updatedAt = new Date(data.last_updated).toLocaleString('en-IN', {
    dateStyle: 'medium', timeStyle: 'short'
  })

  // --- filtered sets ---
  const filterTaj = (hotels: TajHotel[]) =>
    hotels.filter(h => {
      const priceOk = priceFilter === 0 || h.cheapest_price < priceFilter
      const cityOk = cityFilter === 'All Cities' || h.city === cityFilter
      const searchOk = !searchQuery || h.name.toLowerCase().includes(searchQuery.toLowerCase()) || h.city.toLowerCase().includes(searchQuery.toLowerCase())
      return priceOk && cityOk && searchOk
    })

  const filterMarriott = (hotels: MarriottHotel[]) =>
    hotels.filter(h => {
      const ptsOk = pointsFilter === 0 || h.cheapest_points < pointsFilter
      const cityOk = cityFilter === 'All Cities' || h.city === cityFilter
      const searchOk = !searchQuery || h.name.toLowerCase().includes(searchQuery.toLowerCase()) || h.city.toLowerCase().includes(searchQuery.toLowerCase())
      return ptsOk && cityOk && searchOk
    })

  const tajFiltered = filterTaj(data.taj)
  const selFiltered = filterTaj(data.seleqtions)
  const marFiltered = filterMarriott(data.marriott)

  // summary counts based on cheapest price across all checked dates
  const tajUnder10 = data.taj.filter(h => h.cheapest_price < 10000).length
  const tajUnder15 = data.taj.filter(h => h.cheapest_price < 15000).length
  const selUnder10 = data.seleqtions.filter(h => h.cheapest_price < 10000).length
  const selUnder15 = data.seleqtions.filter(h => h.cheapest_price < 15000).length
  const marUnder10k = data.marriott.filter(h => h.cheapest_points < 10000).length
  const marUnder15k = data.marriott.filter(h => h.cheapest_points < 15000).length

  const { date_range, days_ahead, guests } = data.search_params

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-title">
            <h1>🏨 Hotel Deals Tracker</h1>
            <p className="subtitle">Taj · SeleQtions · Marriott Bonvoy — best price across {days_ahead} nights</p>
          </div>
          <div className="last-updated">
            <span className="live-dot" />
            Last scraped: {updatedAt}
          </div>
        </div>

        {/* Summary stats */}
        <div className="stats-row">
          <div className="stat-chip green">Taj under ₹10K: <strong>{tajUnder10}</strong></div>
          <div className="stat-chip amber">Taj under ₹15K: <strong>{tajUnder15}</strong></div>
          <div className="stat-chip teal">SeleQtions under ₹10K: <strong>{selUnder10}</strong></div>
          <div className="stat-chip teal">SeleQtions under ₹15K: <strong>{selUnder15}</strong></div>
          <div className="stat-chip blue">Marriott under 10K pts: <strong>{marUnder10k}</strong></div>
          <div className="stat-chip blue">Marriott under 15K pts: <strong>{marUnder15k}</strong></div>
        </div>
      </header>

      {/* Controls */}
      <div className="controls-bar">
        <div className="tabs">
          {(['taj', 'seleqtions', 'marriott'] as ActiveTab[]).map(t => (
            <button
              key={t}
              className={`tab-btn ${activeTab === t ? 'active' : ''} tab-${t}`}
              onClick={() => setActiveTab(t)}
            >
              {t === 'taj' ? `Taj (${data.taj.length})` : t === 'seleqtions' ? `SeleQtions (${data.seleqtions.length})` : `Marriott (${data.marriott.length})`}
            </button>
          ))}
        </div>

        <div className="filters">
          <input
            className="search-input"
            placeholder="Search hotel or city..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />

          <select className="filter-select" value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
            {CITIES.map(c => <option key={c}>{c}</option>)}
          </select>

          {activeTab !== 'marriott' ? (
            <select className="filter-select" value={priceFilter} onChange={e => setPriceFilter(Number(e.target.value))}>
              {PRICE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          ) : (
            <select className="filter-select" value={pointsFilter} onChange={e => setPointsFilter(Number(e.target.value))}>
              {POINTS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Search params banner */}
      <div className="search-params-bar">
        <span>🔍 Checked {days_ahead} nights:</span>
        <strong>{date_range.from} → {date_range.to}</strong>
        <span>·</span>
        <strong>{guests} guests</strong>
        <span>·</span>
        <span>{data.search_params.cities.join(', ')}</span>
      </div>

      {/* Grid */}
      <main className="cards-section">
        {activeTab === 'taj' && (
          <>
            {tajFiltered.length === 0
              ? <EmptyState />
              : <div className="cards-grid">{tajFiltered.map(h => <TajCard key={h.id} hotel={h} />)}</div>
            }
          </>
        )}
        {activeTab === 'seleqtions' && (
          <>
            {selFiltered.length === 0
              ? <EmptyState />
              : <div className="cards-grid">{selFiltered.map(h => <TajCard key={h.id} hotel={h} />)}</div>
            }
          </>
        )}
        {activeTab === 'marriott' && (
          <>
            {marFiltered.length === 0
              ? <EmptyState />
              : <div className="cards-grid">{marFiltered.map(h => <MarriottCard key={h.id} hotel={h} />)}</div>
            }
          </>
        )}
      </main>

      <footer className="app-footer">
        Data scraped automatically · Prices include taxes · Points redemptions may vary · Always verify on hotel website
      </footer>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="empty-state">
      <p>🔎 No hotels match your filters.</p>
      <p>Try adjusting the price/points limit or city.</p>
    </div>
  )
}
