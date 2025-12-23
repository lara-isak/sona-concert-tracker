"use client"

import { useState, useMemo, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, MapPin, Ticket, FileText, Plus, Upload, X } from "lucide-react"
import { parseGoogleSheetsCSV, getDayOfWeek, type Show } from "@/lib/shows"
import { fetchShows, createShow, importShows } from "@/lib/shows-api"

export default function ShowTracker() {
  const [shows, setShows] = useState<Show[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCity, setSelectedCity] = useState("All")
  const [attendedFilter, setAttendedFilter] = useState<"All" | "Attended" | "Not Attended" | "Upcoming">("All")
  const [selectedYear, setSelectedYear] = useState("2025")
  const [showAddForm, setShowAddForm] = useState(false)
  const [showImportForm, setShowImportForm] = useState(false)
  const [importText, setImportText] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load shows from API on mount
  useEffect(() => {
    const loadShows = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await fetchShows()
        setShows(data)
      } catch (err) {
        setError("Failed to load shows. Please refresh the page.")
        console.error("Error loading shows:", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadShows()
  }, [])

  // Update selected year based on available data
  useEffect(() => {
    if (shows.length > 0) {
      const years = new Set(shows.map((show) => show.date.substring(0, 4)))
      const sortedYears = Array.from(years).sort()
      if (sortedYears.length > 0 && !sortedYears.includes(selectedYear)) {
        setSelectedYear(sortedYears[sortedYears.length - 1])
      }
    }
  }, [shows, selectedYear])

  const cities = useMemo(() => ["All", ...Array.from(new Set(shows.map((show) => show.city)))], [shows])
  const years = useMemo(() => {
    const yearSet = new Set(shows.map((show) => show.date.substring(0, 4)))
    return Array.from(yearSet).sort()
  }, [shows])

  const filteredShows = useMemo(() => {
    return shows.filter((show) => {
      const matchesSearch =
        show.show.toLowerCase().includes(searchQuery.toLowerCase()) ||
        show.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        show.venue.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCity = selectedCity === "All" || show.city === selectedCity
      const isAttended = show.attendance === "YES"
      const isNotAttended = show.attendance === "NO" || show.attendance === "CANCELLED" || show.attendance === "POSTPONED"
      const isNotYet = show.attendance === "NOT YET"
      
      // For "NOT YET", check if it's upcoming (today or future)
      let isUpcoming = false
      if (isNotYet) {
        const showDate = new Date(show.date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        showDate.setHours(0, 0, 0, 0)
        isUpcoming = showDate >= today
      }

      const matchesAttended =
        attendedFilter === "All" ||
        (attendedFilter === "Attended" && isAttended) ||
        (attendedFilter === "Not Attended" && isNotAttended) ||
        (attendedFilter === "Upcoming" && isUpcoming)
      const matchesYear = show.date.startsWith(selectedYear)

      return matchesSearch && matchesCity && matchesAttended && matchesYear
    })
  }, [shows, searchQuery, selectedCity, attendedFilter, selectedYear])

  const stats = useMemo(() => {
    const yearShows = shows.filter((show) => show.date.startsWith(selectedYear))
    const attended = yearShows.filter((show) => show.attendance === "YES").length
    const totalCities = new Set(yearShows.map((show) => show.city)).size

    return {
      total: yearShows.length,
      cities: totalCities,
      attended,
    }
  }, [shows, selectedYear])

  const handleImport = async () => {
    if (!importText.trim()) {
      alert("Please paste CSV data to import.")
      return
    }
    try {
      const imported = parseGoogleSheetsCSV(importText)
      if (imported.length > 0) {
        try {
          // Import all shows (replaces existing)
          await importShows([...shows, ...imported])
          // Reload shows from API
          const data = await fetchShows()
          setShows(data)
          setImportText("")
          setShowImportForm(false)
          alert(`Successfully imported ${imported.length} shows!`)
        } catch (error) {
          alert("Failed to save imported shows. Please try again.")
          console.error("Save error:", error)
        }
      } else {
        alert("No valid shows found in the imported data. Please check the CSV format.")
      }
    } catch (error) {
      alert("Error importing data. Please check the CSV format and try again.")
      console.error("Import error:", error)
    }
  }

  const handleAddShow = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      const formData = new FormData(e.currentTarget)
      const dateStr = formData.get("date") as string
      if (!dateStr) {
        alert("Please select a date.")
        return
      }

      const newShow: Show = {
        show: (formData.get("show") as string).trim(),
        date: dateStr,
        city: (formData.get("city") as string).trim(),
        venue: (formData.get("venue") as string).trim(),
        ticket: (formData.get("ticket") as string) === "YES" ? "YES" : "NO",
        ticketVendor: (formData.get("ticketVendor") as string).trim(),
        ticketLocation: (formData.get("ticketLocation") as string).trim(),
        attendance: (formData.get("attendance") as string) as "YES" | "NO" | "NOT YET" | "CANCELLED" | "POSTPONED",
        note: (formData.get("note") as string)?.trim() || undefined,
      }

      if (!newShow.show || !newShow.city || !newShow.venue) {
        alert("Please fill in all required fields (Show, City, Venue).")
        return
      }

      try {
        await createShow(newShow)
        // Reload shows from API
        const data = await fetchShows()
        setShows(data)
        e.currentTarget.reset()
        setShowAddForm(false)
      } catch (error) {
        alert("Failed to save show. Please try again.")
        console.error("Save error:", error)
      }
    } catch (error) {
      alert("Error adding show. Please try again.")
      console.error("Add show error:", error)
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
          SONA
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
            SONA
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
              <h2 className="text-3xl md:text-5xl font-bold text-foreground">Shows</h2>
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
                        Export your Google Sheet as CSV, then paste it here. The format should be: SHØW, DATE, DOTW (optional), CITY,
                  VENUE, TICKET, TICKET VENDOR, TICKET LOCATION, ATTENDED, NOTE
                </p>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste CSV data here..."
                  className="w-full min-h-[200px] px-3 py-2 rounded-md bg-input/50 border border-border/50 text-foreground focus:border-primary/50 focus:outline-none focus:shadow-[0_0_10px_rgba(0,255,255,0.2)] transition-all font-mono text-xs"
                />
                <Button onClick={handleImport} className="font-mono text-xs">
                  Import Shows
                </Button>
              </div>
            </Card>
          )}

          {/* Add Show Form */}
          {showAddForm && (
            <Card className="p-4 md:p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <form onSubmit={handleAddShow} className="space-y-4">
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
                      Attendance Status
                    </label>
                    <select
                      name="attendance"
                      className="w-full px-3 py-2 rounded-md bg-input/50 border border-border/50 text-foreground focus:border-primary/50 focus:outline-none font-mono text-xs"
                    >
                      <option value="NOT YET">NOT YET</option>
                      <option value="YES">YES</option>
                      <option value="NO">NO</option>
                      <option value="CANCELLED">CANCELLED</option>
                      <option value="POSTPONED">POSTPONED</option>
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
                {stats.attended}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider">Attended</div>
                </div>
            <div className="text-center">
              <div
                className="text-2xl md:text-3xl font-bold text-neon-cyan"
                style={{ textShadow: "0 0 15px oklch(0.72 0.21 195 / 0.5)" }}
              >
                {stats.total}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider">Total</div>
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

                {/* Attended Filter */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-mono">Attended</label>
                  <div className="flex gap-2">
                    {(["All", "Attended", "Not Attended", "Upcoming"] as const).map((filter) => (
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
                        {filter}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
                </Card>

                {/* Loading State */}
                {isLoading && (
                  <Card className="p-8 md:p-12 bg-card/30 backdrop-blur-sm border-border/50 text-center">
                    <div className="space-y-3">
                      <div
                        className="text-2xl md:text-4xl font-mono text-neon-cyan"
                        style={{ textShadow: "0 0 20px oklch(0.72 0.21 195 / 0.5)" }}
                      >
                        LOADING...
                      </div>
                      <p className="text-muted-foreground font-mono text-xs md:text-sm">Fetching shows...</p>
                    </div>
                  </Card>
                )}

                {/* Error State */}
                {error && !isLoading && (
                  <Card className="p-8 md:p-12 bg-card/30 backdrop-blur-sm border-border/50 text-center">
                    <div className="space-y-3">
                      <div
                        className="text-2xl md:text-4xl font-mono text-destructive"
                        style={{ textShadow: "0 0 20px oklch(0.577 0.245 27.325 / 0.5)" }}
                      >
                        ERROR
                      </div>
                      <p className="text-muted-foreground font-mono text-xs md:text-sm">{error}</p>
                      <Button
                        onClick={async () => {
                          try {
                            setIsLoading(true)
                            setError(null)
                            const data = await fetchShows()
                            setShows(data)
                          } catch (err) {
                            setError("Failed to load shows. Please refresh the page.")
                          } finally {
                            setIsLoading(false)
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="font-mono text-xs"
                      >
                        Retry
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Show List */}
                {!isLoading && !error && filteredShows.length === 0 ? (
            <Card className="p-8 md:p-12 bg-card/30 backdrop-blur-sm border-border/50 text-center">
              <div className="space-y-3">
                <div
                  className="text-2xl md:text-4xl font-mono text-neon-magenta"
                  style={{ textShadow: "0 0 20px oklch(0.7 0.24 330 / 0.5)" }}
                >
                  NO DATA FOUND
                </div>
                <p className="text-muted-foreground font-mono text-xs md:text-sm">
                  No shows match your current filters
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredShows.map((show, index) => (
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
                            {new Date(show.date).getDate()}
                          </div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
                            {new Date(show.date).toLocaleDateString("en-US", { month: "short" })}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono hidden md:block">{getDayOfWeek(show.date)}</div>
                        </div>

                        <div className="flex-1 space-y-2">
                          <h3 className="text-lg md:text-xl font-bold text-foreground">{show.show}</h3>
                          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 md:w-4 md:h-4 text-neon-magenta" />
                              <span>{show.city}</span>
                            </div>
                            <span className="text-border">•</span>
                            <span className="line-clamp-1">{show.venue}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(() => {
                        if (show.attendance === "YES") {
                          return (
                            <Badge variant="outline" className="border-border/50 text-muted-foreground font-mono text-xs">
                              ATTENDED
                            </Badge>
                          )
                        } else if (show.attendance === "NO") {
                          return (
                            <Badge variant="outline" className="border-border/50 text-muted-foreground font-mono text-xs">
                              NOT ATTENDED
                            </Badge>
                          )
                        } else if (show.attendance === "CANCELLED") {
                          return (
                            <Badge variant="outline" className="border-destructive/50 text-destructive bg-destructive/10 font-mono text-xs">
                              CANCELLED
                            </Badge>
                          )
                        } else if (show.attendance === "POSTPONED") {
                          return (
                            <Badge variant="outline" className="border-neon-orange/50 text-neon-orange bg-neon-orange/10 font-mono text-xs">
                              POSTPONED
                            </Badge>
                          )
                        } else if (show.attendance === "NOT YET") {
                          // Check if date is today or in the future
                          const showDate = new Date(show.date)
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          showDate.setHours(0, 0, 0, 0)
                          const isTodayOrFuture = showDate >= today

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
                      {show.ticket === "YES" && (
                        <>
                          <Badge
                            variant="outline"
                            className="border-neon-purple/50 text-neon-purple bg-neon-purple/10 font-mono text-xs"
                          >
                            <Ticket className="w-3 h-3 mr-1" />
                            {show.ticketVendor}
                          </Badge>
                          {show.ticketLocation && show.ticketLocation !== "N/A" && (
                          <Badge variant="outline" className="border-border/50 text-muted-foreground font-mono text-xs">
                            {show.ticketLocation}
                          </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {show.note && (
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-neon-orange/50 text-neon-orange bg-neon-orange/10 font-mono text-xs"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          NOTE
                        </Badge>
                        <p className="text-sm text-muted-foreground italic">{show.note}</p>
                      </div>
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
