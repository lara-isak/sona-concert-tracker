"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, MapPin, Ticket, FileText } from "lucide-react"

type Concert = {
  show: string
  date: string
  dotw: string
  city: string
  venue: string
  ticket: "YES" | "NO"
  ticketVendor: string
  ticketLocation: string
  attended: "YES" | "NO"
  note?: string
}

const concerts: Concert[] = [
  {
    show: "Classics Meet Chinese Rock",
    date: "2025-01-22",
    dotw: "Wednesday",
    city: "Berlin",
    venue: "Berlin Philharmonie",
    ticket: "YES",
    ticketVendor: "Eventim",
    ticketLocation: "Apple Wallet",
    attended: "NO",
    note: "Front row seats!",
  },
  {
    show: "Electronic Dreams Festival",
    date: "2025-02-14",
    dotw: "Friday",
    city: "Berlin",
    venue: "Berghain",
    ticket: "YES",
    ticketVendor: "TicketSwap",
    ticketLocation: "Files",
    attended: "NO",
  },
  {
    show: "Jazz Noir Sessions",
    date: "2024-12-10",
    dotw: "Tuesday",
    city: "Hamburg",
    venue: "Elbphilharmonie",
    ticket: "YES",
    ticketVendor: "Venue Website",
    ticketLocation: "In App",
    attended: "YES",
    note: "Amazing acoustics",
  },
  {
    show: "Techno Underground",
    date: "2025-03-05",
    dotw: "Wednesday",
    city: "Berlin",
    venue: "Tresor",
    ticket: "NO",
    ticketVendor: "Ticketmaster",
    ticketLocation: "N/A",
    attended: "NO",
  },
  {
    show: "Synthwave Nights",
    date: "2024-11-20",
    dotw: "Monday",
    city: "Munich",
    venue: "Olympiahalle",
    ticket: "YES",
    ticketVendor: "Eventim",
    ticketLocation: "Apple Wallet",
    attended: "YES",
  },
  {
    show: "Neo Tokyo Orchestra",
    date: "2025-04-18",
    dotw: "Friday",
    city: "Frankfurt",
    venue: "Alte Oper",
    ticket: "YES",
    ticketVendor: "Ticketmaster",
    ticketLocation: "Files",
    attended: "NO",
    note: "Limited edition tour",
  },
]

export default function ConcertTracker() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCity, setSelectedCity] = useState("All")
  const [selectedVendor, setSelectedVendor] = useState("All")
  const [attendedFilter, setAttendedFilter] = useState<"All" | "Attended" | "Not Attended">("All")
  const [selectedYear, setSelectedYear] = useState("2025")

  const cities = useMemo(() => ["All", ...Array.from(new Set(concerts.map((c) => c.city)))], [])
  const vendors = useMemo(() => ["All", ...Array.from(new Set(concerts.map((c) => c.ticketVendor)))], [])
  const years = ["2024", "2025", "2026"]

  const filteredConcerts = useMemo(() => {
    return concerts.filter((concert) => {
      const matchesSearch =
        concert.show.toLowerCase().includes(searchQuery.toLowerCase()) ||
        concert.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        concert.venue.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCity = selectedCity === "All" || concert.city === selectedCity
      const matchesVendor = selectedVendor === "All" || concert.ticketVendor === selectedVendor
      const matchesAttended =
        attendedFilter === "All" ||
        (attendedFilter === "Attended" && concert.attended === "YES") ||
        (attendedFilter === "Not Attended" && concert.attended === "NO")
      const matchesYear = concert.date.startsWith(selectedYear)

      return matchesSearch && matchesCity && matchesVendor && matchesAttended && matchesYear
    })
  }, [searchQuery, selectedCity, selectedVendor, attendedFilter, selectedYear])

  const stats = useMemo(() => {
    const yearConcerts = concerts.filter((c) => c.date.startsWith(selectedYear))
    const attended = yearConcerts.filter((c) => c.attended === "YES").length
    const totalCities = new Set(yearConcerts.map((c) => c.city)).size
    const attendedPercentage = yearConcerts.length > 0 ? Math.round((attended / yearConcerts.length) * 100) : 0

    return {
      total: yearConcerts.length,
      cities: totalCities,
      attendedPercentage,
    }
  }, [selectedYear])

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden border-b border-border/50 bg-card/30 backdrop-blur-sm p-4 flex items-center justify-between">
        <h1
          className="text-xl font-bold tracking-wider text-neon-cyan font-mono"
          style={{ textShadow: "0 0 20px oklch(0.72 0.21 195 / 0.5)" }}
        >
          SHØW LOG
        </h1>
        <div className="flex gap-2">
          {years.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-3 py-1.5 rounded-md font-mono text-xs transition-all ${
                selectedYear === year
                  ? "bg-primary/20 text-primary border border-primary/50"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar - Hidden on mobile */}
      <aside className="hidden md:flex w-64 border-r border-border/50 bg-card/30 backdrop-blur-sm flex-col">
        <div className="p-6 border-b border-border/50">
          <h1
            className="text-2xl font-bold tracking-wider text-neon-cyan font-mono"
            style={{ textShadow: "0 0 20px oklch(0.72 0.21 195 / 0.5)" }}
          >
            SHØW LOG
          </h1>
        </div>

        <div className="flex-1 p-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-mono px-2 mb-3">Year</p>
            {years.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`w-full text-left px-4 py-3 rounded-md font-mono text-sm transition-all ${
                  selectedYear === year
                    ? "bg-primary/20 text-primary border border-primary/50 shadow-[0_0_15px_rgba(0,255,255,0.3)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent"
                }`}
                style={selectedYear === year ? { textShadow: "0 0 10px oklch(0.72 0.21 195 / 0.5)" } : {}}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-border/50">
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between text-muted-foreground">
              <span>STATUS</span>
              <span className="text-neon-cyan">ONLINE</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>MODE</span>
              <span className="text-neon-magenta">TRACKING</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="text-3xl md:text-5xl font-bold text-foreground">Concerts</h2>
              <div className="flex gap-4 md:gap-6 text-sm font-mono">
                <div className="text-center">
                  <div
                    className="text-2xl md:text-3xl font-bold text-neon-cyan"
                    style={{ textShadow: "0 0 15px oklch(0.72 0.21 195 / 0.5)" }}
                  >
                    {stats.total}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider">Total</div>
                </div>
                <div className="text-center">
                  <div
                    className="text-2xl md:text-3xl font-bold text-neon-magenta"
                    style={{ textShadow: "0 0 15px oklch(0.7 0.24 330 / 0.5)" }}
                  >
                    {stats.cities}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider">Cities</div>
                </div>
                <div className="text-center">
                  <div
                    className="text-2xl md:text-3xl font-bold text-neon-orange"
                    style={{ textShadow: "0 0 15px oklch(0.75 0.18 60 / 0.5)" }}
                  >
                    {stats.attendedPercentage}%
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider">Attended</div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <Card className="p-4 md:p-6 bg-card/50 backdrop-blur-sm border-border/50 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by show, city, venue…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-input/50 border-border/50 focus:border-primary/50 focus:shadow-[0_0_10px_rgba(0,255,255,0.2)] transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* City Filter */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">City</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-input/50 border border-border/50 text-foreground focus:border-primary/50 focus:outline-none focus:shadow-[0_0_10px_rgba(0,255,255,0.2)] transition-all"
                  >
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vendor Filter */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                    Ticket Vendor
                  </label>
                  <select
                    value={selectedVendor}
                    onChange={(e) => setSelectedVendor(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-input/50 border border-border/50 text-foreground focus:border-primary/50 focus:outline-none focus:shadow-[0_0_10px_rgba(0,255,255,0.2)] transition-all"
                  >
                    {vendors.map((vendor) => (
                      <option key={vendor} value={vendor}>
                        {vendor}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Attended Filter */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">Attended</label>
                  <div className="flex gap-2">
                    {(["All", "Attended", "Not Attended"] as const).map((filter) => (
                      <Button
                        key={filter}
                        onClick={() => setAttendedFilter(filter)}
                        variant={attendedFilter === filter ? "default" : "outline"}
                        size="sm"
                        className={`text-xs ${
                          attendedFilter === filter
                            ? "bg-primary/20 text-primary border-primary/50 hover:bg-primary/30 shadow-[0_0_10px_rgba(0,255,255,0.2)]"
                            : "border-border/50 hover:border-primary/30 hover:text-primary"
                        }`}
                      >
                        {filter === "Not Attended" ? "Upcoming" : filter}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Concert List */}
          {filteredConcerts.length === 0 ? (
            <Card className="p-8 md:p-12 bg-card/30 backdrop-blur-sm border-border/50 text-center">
              <div className="space-y-3">
                <div
                  className="text-2xl md:text-4xl font-mono text-neon-magenta"
                  style={{ textShadow: "0 0 20px oklch(0.7 0.24 330 / 0.5)" }}
                >
                  NO DATA FOUND
                </div>
                <p className="text-muted-foreground font-mono text-xs md:text-sm">
                  No concerts match your current filters
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredConcerts.map((concert, index) => (
                <Card
                  key={index}
                  className="p-4 md:p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 hover:shadow-[0_0_20px_rgba(0,255,255,0.1)] transition-all duration-300"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3 md:gap-4">
                        <div className="text-center min-w-[60px] md:min-w-[80px]">
                          <div
                            className="text-xl md:text-2xl font-bold text-neon-cyan font-mono"
                            style={{ textShadow: "0 0 10px oklch(0.72 0.21 195 / 0.5)" }}
                          >
                            {new Date(concert.date).getDate()}
                          </div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
                            {new Date(concert.date).toLocaleDateString("en-US", { month: "short" })}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono hidden md:block">{concert.dotw}</div>
                        </div>

                        <div className="flex-1 space-y-2">
                          <h3 className="text-lg md:text-xl font-bold text-foreground">{concert.show}</h3>
                          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 md:w-4 md:h-4 text-neon-magenta" />
                              <span>{concert.city}</span>
                            </div>
                            <span className="text-border">•</span>
                            <span className="line-clamp-1">{concert.venue}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {concert.ticket === "YES" && (
                        <>
                          <Badge
                            variant="outline"
                            className="border-neon-purple/50 text-neon-purple bg-neon-purple/10 font-mono text-xs"
                          >
                            <Ticket className="w-3 h-3 mr-1" />
                            {concert.ticketVendor}
                          </Badge>
                          <Badge variant="outline" className="border-border/50 text-muted-foreground font-mono text-xs">
                            {concert.ticketLocation}
                          </Badge>
                        </>
                      )}
                      {concert.attended === "YES" ? (
                        <Badge variant="outline" className="border-border/50 text-muted-foreground font-mono text-xs">
                          ATTENDED
                        </Badge>
                      ) : (
                        <Badge className="bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 shadow-[0_0_10px_rgba(0,255,255,0.2)] font-mono text-xs">
                          UPCOMING
                        </Badge>
                      )}
                      {concert.note && (
                        <Badge
                          variant="outline"
                          className="border-neon-orange/50 text-neon-orange bg-neon-orange/10 font-mono text-xs"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          NOTE
                        </Badge>
                      )}
                    </div>
                  </div>

                  {concert.note && (
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <p className="text-sm text-muted-foreground italic">{concert.note}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
