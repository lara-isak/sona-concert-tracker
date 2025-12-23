export type Database = {
  public: {
    Tables: {
      shows: {
        Row: {
          id: string
          show: string
          date: string
          city: string
          venue: string
          ticket: "YES" | "NO"
          ticket_vendor: string
          ticket_location: string
          attendance: "YES" | "NO" | "NOT YET" | "CANCELLED" | "POSTPONED"
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          show: string
          date: string
          city: string
          venue: string
          ticket: "YES" | "NO"
          ticket_vendor: string
          ticket_location: string
          attendance: "YES" | "NO" | "NOT YET" | "CANCELLED" | "POSTPONED"
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          show?: string
          date?: string
          city?: string
          venue?: string
          ticket?: "YES" | "NO"
          ticket_vendor?: string
          ticket_location?: string
          attendance?: "YES" | "NO" | "NOT YET" | "CANCELLED" | "POSTPONED"
          note?: string | null
          updated_at?: string
        }
      }
    }
  }
}

