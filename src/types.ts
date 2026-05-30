export interface PriceEntry {
  date: string
  price: number
  room_type: string
}

export interface MarriottPriceEntry {
  date: string
  cash_price: number
  points: number
}

export interface TajHotel {
  id: string
  brand: 'Taj' | 'SeleQtions'
  name: string
  city: string
  cheapest_price: number
  cheapest_date: string
  currency: string
  room_type: string
  url: string
  prices: PriceEntry[]
}

export interface MarriottHotel {
  id: string
  brand: 'Marriott'
  name: string
  city: string
  cheapest_cash_price: number
  cheapest_points: number
  cheapest_date: string
  room_type: string
  category: number
  url: string
  prices: MarriottPriceEntry[]
}

export interface SearchParams {
  cities: string[]
  date_range: { from: string; to: string }
  days_ahead: number
  guests: number
}

export interface HotelsData {
  last_updated: string
  search_params: SearchParams
  taj: TajHotel[]
  seleqtions: TajHotel[]
  marriott: MarriottHotel[]
}

export type PriceBand = 'under10k' | 'under15k' | 'under20k' | 'above20k'
export type PointsBand = 'under10k' | 'under15k' | 'under20k' | 'above20k'
export type ActiveTab = 'taj' | 'seleqtions' | 'marriott' | 'all'
