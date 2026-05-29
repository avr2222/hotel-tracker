export interface TajHotel {
  id: string
  brand: 'Taj' | 'SeleQtions'
  name: string
  city: string
  price: number
  currency: string
  room_type: string
  url: string
}

export interface MarriottHotel {
  id: string
  brand: 'Marriott'
  name: string
  city: string
  points: number
  cash_price: number
  room_type: string
  category: number
  url: string
}

export interface SearchParams {
  cities: string[]
  check_in: string
  check_out: string
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
