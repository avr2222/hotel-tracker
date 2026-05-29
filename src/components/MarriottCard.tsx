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

export default function MarriottCard({ hotel }: Props) {
  const badge = getPointsBadge(hotel.points)

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
          <p className="price-main">{hotel.points.toLocaleString('en-IN')}<span className="per-night"> pts</span></p>
          <p className="cash-alt">or ₹{hotel.cash_price.toLocaleString('en-IN')} cash</p>
        </div>
        <p className="category-label">Cat {hotel.category} property</p>
      </div>
    </a>
  )
}
