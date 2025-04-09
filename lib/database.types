export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          category: string
          description: string | null
          price: number
          cost_price: number
          created_at: string
          updated_at: string
          image_url: string | null
        }
        Insert: {
          id?: string
          name: string
          category: string
          description?: string | null
          price: number
          cost_price: number
          created_at?: string
          updated_at?: string
          image_url?: string | null
        }
        Update: {
          id?: string
          name?: string
          category?: string
          description?: string | null
          price?: number
          cost_price?: number
          created_at?: string
          updated_at?: string
          image_url?: string | null
        }
      }
      sizes: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
      }
      inventory: {
        Row: {
          id: string
          product_id: string
          size_id: string
          stock: number
        }
        Insert: {
          id?: string
          product_id: string
          size_id: string
          stock?: number
        }
        Update: {
          id?: string
          product_id?: string
          size_id?: string
          stock?: number
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          identification: string
          phone: string | null
          email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          identification: string
          phone?: string | null
          email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          identification?: string
          phone?: string | null
          email?: string | null
          created_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          customer_id: string | null
          total_amount: number
          invoice_number: string
          created_at: string
          status: string
        }
        Insert: {
          id?: string
          customer_id?: string | null
          total_amount: number
          invoice_number: string
          created_at?: string
          status?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          total_amount?: number
          invoice_number?: string
          created_at?: string
          status?: string
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string
          size_id: string
          quantity: number
          price: number
          subtotal: number
        }
        Insert: {
          id?: string
          sale_id: string
          product_id: string
          size_id: string
          quantity: number
          price: number
          subtotal: number
        }
        Update: {
          id?: string
          sale_id?: string
          product_id?: string
          size_id?: string
          quantity?: number
          price?: number
          subtotal?: number
        }
      }
      orders: {
        Row: {
          id: string
          reference: string | null
          total_cost: number
          status: string
          created_at: string
          arrival_date: string | null
        }
        Insert: {
          id?: string
          reference?: string | null
          total_cost: number
          status?: string
          created_at?: string
          arrival_date?: string | null
        }
        Update: {
          id?: string
          reference?: string | null
          total_cost?: number
          status?: string
          created_at?: string
          arrival_date?: string | null
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          size_id: string
          quantity: number
          cost_price: number
          subtotal: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          size_id: string
          quantity: number
          cost_price: number
          subtotal: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          size_id?: string
          quantity?: number
          cost_price?: number
          subtotal?: number
        }
      }
    }
  }
}
