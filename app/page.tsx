"use client"

import { useState, useMemo, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, MapPin, Ticket, FileText, Plus, Upload, X } from "lucide-react"
import { getConcerts, saveConcerts, parseGoogleSheetsCSV, type Concert } from "@/lib/concerts"

export default function ConcertTracker() {
  const [concerts, setConcerts] = useState<Concert[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCity, setSelectedCity] = useState("All")
  const [selectedVendor, setSelectedVendor] = useState("All")
  const [attendedFilter, setAttendedFilter] = useState<"All" | "Attended" | "Not Attended">("All")
  const [selectedYear, setSelectedYear] = useState("2025")
  const [showAddForm, setShowAddForm] = useState(false)
  const [showImportForm, setShowImportForm] = useState(false)
  const [importText, setImportText] = useState("")

  // Load concerts from localStorage on mount
  useEffect(() => {
    const stored = getConcerts()
    setConcerts(stored)
  }, [])

  // Update selected year based on available data
  useEffect(() => {
    if (concerts.length > 0) {
      const years = new Set(concerts.map((c) => c.date.substring(0, 4)))
      const sortedYears = Array.from(years).sort()
      if (sortedYears.length > 0 && !sortedYears.includes(selectedYear)) {
        setSelectedYear(sortedYears[sortedYears.length - 1])
      }
    }
  }, [concerts, selectedYear])

  const cities = useMemo(() => ["All", ...Array.from(new Set(concerts.map((c) => c.city)))], [concerts])
  const vendors = useMemo(() => ["All", ...Array.from(new Set(concerts.map((c) => c.ticketVendor)))], [concerts])
  const years = useMemo(() => {
    const yearSet = new Set(concerts.map((c) => c.date.substring(0, 4)))
    return Array.from(yearSet).sort()
  }, [concerts])

  const filteredConcerts = useMemo(() => {
    return concerts.filter((concert) => {
      const matchesSearch =
        concert.show.toLowerCase().includes(searchQuery.toLowerCase()) ||
        concert.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        concert.venue.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCity = selectedCity === "All" || concert.city === selectedCity
      const matchesVendor = selectedVendor === "All" || concert.ticketVendor === selectedVendor
      const isAttended = concert.attended === "YES"
      const isNotAttended = concert.attended === "NO"
      const isNotYet = concert.attended === "NOT YET"
      
      // For "NOT YET", check if it's upcoming (today or future)
      let isUpcoming = false
      if (isNotYet) {
        const concertDate = new Date(concert.date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        concertDate.setHours(0, 0, 0, 0)
        isUpcoming = concertDate >= today
      }

      const matchesAttended =
        attendedFilter === "All" ||
        (attendedFilter === "Attended" && isAttended) ||
        (attendedFilter === "Not Attended" && (isNotAttended || (isNotYet && isUpcoming)))
      const matchesYear = concert.date.startsWith(selectedYear)

      return matchesSearch && matchesCity && matchesVendor && matchesAttended && matchesYear
    })
  }, [concerts, searchQuery, selectedCity, selectedVendor, attendedFilter, selectedYear])

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
  }, [concerts, selectedYear])

  const handleImport = () => {
    if (!importText.trim()) {
      alert("Please paste CSV data to import.")
      return
    }
    try {
      const imported = parseGoogleSheetsCSV(importText)
      if (imported.length > 0) {
        const updated = [...concerts, ...imported]
        setConcerts(updated)
        try {
          saveConcerts(updated)
          setImportText("")
          setShowImportForm(false)
          alert(`Successfully imported ${imported.length} concerts!`)
        } catch (error) {
          alert("Failed to save imported concerts. Please try again.")
          console.error("Save error:", error)
        }
      } else {
        alert("No valid concerts found in the imported data. Please check the CSV format.")
      }
    } catch (error) {
      alert("Error importing data. Please check the CSV format and try again.")
      console.error("Import error:", error)
    }
  }

  const handleAddConcert = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      const formData = new FormData(e.currentTarget)
      const dateStr = formData.get("date") as string
      if (!dateStr) {
        alert("Please select a date.")
        return
      }

      const newConcert: Concert = {
        show: (formData.get("show") as string).trim(),
        date: dateStr,
        dotw: new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" }),
        city: (formData.get("city") as string).trim(),
        venue: (formData.get("venue") as string).trim(),
        ticket: (formData.get("ticket") as string) === "YES" ? "YES" : "NO",
        ticketVendor: (formData.get("ticketVendor") as string).trim(),
        ticketLocation: (formData.get("ticketLocation") as string).trim(),
        attended: (formData.get("attended") as string) === "YES" ? "YES" : (formData.get("attended") as string) === "NOT YET" ? "NOT YET" : "NO",
        note: (formData.get("note") as string)?.trim() || undefined,
      }

      if (!newConcert.show || !newConcert.city || !newConcert.venue) {
        alert("Please fill in all required fields (Show, City, Venue).")
        return
      }

      const updated = [...concerts, newConcert]
      setConcerts(updated)
      try {
        saveConcerts(updated)
        e.currentTarget.reset()
        setShowAddForm(false)
      } catch (error) {
        alert("Failed to save concert. Please try again.")
        console.error("Save error:", error)
      }
    } catch (error) {
      alert("Error adding concert. Please try again.")
      console.error("Add concert error:", error)
    }
  }

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
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowImportForm(!showImportForm)}
                  variant="outline"
                  size="sm"
                  className="font-mono text-xs"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Import
                </Button>
                <Button
                  onClick={() => setShowAddForm(!showAddForm)}
                  variant="default"
                  size="sm"
                  className="font-mono text-xs"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Show
                </Button>
              </div>
            </div>
          </div>

          {/* Import Form */}
          {showImportForm && (
            <Card className="p-4 md:p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold font-mono">Import from Google Sheets</h3>
                  <Button
                    onClick={() => {
                      setShowImportForm(false)
                      setImportText("")
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  Export your Google Sheet as CSV, then paste it here. The format should be: SHØW, DATE, DOTW, CITY,
                  VENUE, TICKET, TICKET VENDOR, TICKET LOCATION, ATTENDED, NOTE
                </p>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste CSV data here..."
                  className="w-full min-h-[200px] px-3 py-2 rounded-md bg-input/50 border border-border/50 text-foreground focus:border-primary/50 focus:outline-none focus:shadow-[0_0_10px_rgba(0,255,255,0.2)] transition-all font-mono text-xs"
                />
                <Button onClick={handleImport} className="font-mono text-xs">
                  Import Concerts
                </Button>
              </div>
            </Card>
          )}

          {/* Add Concert Form */}
          {showAddForm && (
            <Card className="p-4 md:p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <form onSubmit={handleAddConcert} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold font-mono">Add New Show</h3>
                  <Button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                      Show Name *
                    </label>
                    <Input name="show" required className="font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                      Date *
                    </label>
                    <Input name="date" type="date" required className="font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">City *</label>
                    <Input name="city" required className="font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                      Venue *
                    </label>
                    <Input name="venue" required className="font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                      Ticket (YES/NO)
                    </label>
                    <select
                      name="ticket"
                      className="w-full px-3 py-2 rounded-md bg-input/50 border border-border/50 text-foreground focus:border-primary/50 focus:outline-none font-mono text-xs"
                    >
                      <option value="YES">YES</option>
                      <option value="NO">NO</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                      Ticket Vendor
                    </label>
                    <Input name="ticketVendor" className="font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                      Ticket Location
                    </label>
                    <Input name="ticketLocation" className="font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                      Attended Status
                    </label>
                    <select
                      name="attended"
                      className="w-full px-3 py-2 rounded-md bg-input/50 border border-border/50 text-foreground focus:border-primary/50 focus:outline-none font-mono text-xs"
                    >
                      <option value="NOT YET">NOT YET</option>
                      <option value="YES">YES</option>
                      <option value="NO">NO</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">Note</label>
                    <Input name="note" className="font-mono text-xs" />
                  </div>
                </div>
                <Button type="submit" className="font-mono text-xs">
                  Add Show
                </Button>
              </form>
            </Card>
          )}

          {/* Stats */}
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
                          {concert.ticketLocation && concert.ticketLocation !== "N/A" && (
                            <Badge variant="outline" className="border-border/50 text-muted-foreground font-mono text-xs">
                              {concert.ticketLocation}
                            </Badge>
                          )}
                        </>
                      )}
                      {(() => {
                        if (concert.attended === "YES") {
                          return (
                            <Badge variant="outline" className="border-border/50 text-muted-foreground font-mono text-xs">
                              ATTENDED
                            </Badge>
                          )
                        } else if (concert.attended === "NO") {
                          return (
                            <Badge variant="outline" className="border-border/50 text-muted-foreground font-mono text-xs">
                              NOT ATTENDED
                            </Badge>
                          )
                        } else if (concert.attended === "NOT YET") {
                          // Check if date is today or in the future
                          const concertDate = new Date(concert.date)
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          concertDate.setHours(0, 0, 0, 0)
                          const isTodayOrFuture = concertDate >= today

                          if (isTodayOrFuture) {
                            return (
                              <Badge className="bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 shadow-[0_0_10px_rgba(0,255,255,0.2)] font-mono text-xs">
                                UPCOMING
                              </Badge>
                            )
                          } else {
                            // Past date with "NOT YET" should show as NOT ATTENDED
                            return (
                              <Badge variant="outline" className="border-border/50 text-muted-foreground font-mono text-xs">
                                NOT ATTENDED
                              </Badge>
                            )
                          }
                        }
                        // Fallback
                        return null
                      })()}
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
