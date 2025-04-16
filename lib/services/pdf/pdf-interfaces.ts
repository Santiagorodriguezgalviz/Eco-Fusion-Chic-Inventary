export interface SaleData {
  id: string
  invoice_number: string
  total_amount: number
  created_at: string
  customer?: {
    id: string
    name: string
    identification: string
    phone: string | null
  } | null
  items: {
    product_name: string
    size_name: string
    quantity: number
    price: number
    subtotal: number
  }[]
}

export interface OrderData {
  id: string
  reference: string | null
  total_cost: number
  status: string
  created_at: string
  arrival_date: string | null
  items: {
    product_name: string
    size_name: string
    quantity: number
    cost_price: number
    subtotal: number
  }[]
}