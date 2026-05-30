import { MarriottHotel } from '../types'

interface Props {
  hotel: MarriottHotel
}

function getPointsBadge(points: number) {
  if (points < 10000) return { label: 'Under 10K pts', cls: 'badge-green' }
  if (points < 15000) return { label: 'Under 15K pts', cls: 'badge-amber' }
  if (points < 20000) return { label: 'Under 20K pts', cls: 'badge-orange' }
  return { label: `${(points / 1000).toFixed(0)}K+ pts`, cls: 'badge-red' }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

export default function MarriottCard({ hotel }: Props) {
  const badge = getPointsBadge(hotel.cheapest_points)

  return (
    <a href={hotel.url} target="_blank" rel="noopener noreferrer" className="hotel-card">
      <div className="card-header brand-marriott">
        <span className="brand-pill">Marriott Bonvoy</span>
        <span className={`price-badge ${badge.cls}`}>{badge.label}</span>
      </div>
      <div className="card-body">
        <p className="hotel-name">{hotel.name}</p>
        <p className="hotel-city">📍 {hotel.city}</p>
        <p className="room-type">{hotel.room_type}</p>
        <div className="marriott-pricing">
          <p className="price-main">
            {hotel.cheapest_points.toLocaleString('en-IN')}
            <span className="per-night"> pts</span>
          </p>
          {hotel.cheapest_cash_price > 0 && (
            <p className="cash-alt">or ₹{hotel.cheapest_cash_price.toLocaleString('en-IN')} cash</p>
          )}
        </div>
        <p className="best-date">Best on: {formatDate(hotel.cheapest_date)}</p>
        <p className="category-label">Cat {hotel.category} property</p>
        {hotel.prices.length > 1 && (
          <div className="prices-list">
            {hotel.prices.map(p => (
              <div
                key={p.date}
                className={`price-row${p.date === hotel.cheapest_date ? ' price-row-best' : ''}`}
              >
                <span className="price-row-date">{formatDate(p.date)}</span>
                <span className="price-row-value">{p.points.toLocaleString('en-IN')} pts</span>
                {p.cash_price > 0 && (
                  <span className="price-row-cash">₹{p.cash_price.toLocaleString('en-IN')}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </a>
  )
}
