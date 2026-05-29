import { TajHotel } from '../types'

interface Props {
  hotel: TajHotel
}

function getPriceBadge(price: number) {
  if (price < 10000) return { label: 'Under ₹10K', cls: 'badge-green' }
  if (price < 15000) return { label: 'Under ₹15K', cls: 'badge-amber' }
  if (price < 20000) return { label: 'Under ₹20K', cls: 'badge-orange' }
  return { label: `₹${(price / 1000).toFixed(0)}K+`, cls: 'badge-red' }
}

export default function TajCard({ hotel }: Props) {
  const badge = getPriceBadge(hotel.price)
  const brandColor = hotel.brand === 'Taj' ? 'brand-taj' : 'brand-seleqtions'

  return (
    <a href={hotel.url} target="_blank" rel="noopener noreferrer" className="hotel-card">
      <div className={`card-header ${brandColor}`}>
        <span className="brand-pill">{hotel.brand}</span>
        <span className={`price-badge ${badge.cls}`}>{badge.label}</span>
      </div>
      <div className="card-body">
        <p className="hotel-name">{hotel.name}</p>
        <p className="hotel-city">📍 {hotel.city}</p>
        <p className="room-type">{hotel.room_type}</p>
        <p className="price-main">₹{hotel.price.toLocaleString('en-IN')}<span className="per-night"> / night</span></p>
      </div>
    </a>
  )
}
