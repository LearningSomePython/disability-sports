import { useState, useEffect } from "react";

const ORGS = [
  {
    id: 1,
    name: "BORP Adaptive Sports & Recreation",
    location: "Berkeley, CA",
    url: "https://www.borp.org",
    description: "The Bay Area's leading provider of adaptive sports since 1976. Founded by people with disabilities to create access to outdoor, fitness, and recreational activities.",
    sports: ["Wheelchair Basketball", "Wheelchair Rugby", "Power Soccer", "Goalball", "Adaptive Cycling", "Kayaking", "Adaptive Climbing", "Adaptive Tennis", "Pickleball"],
  },
  {
    id: 2,
    name: "Challenged Athletes Foundation — NorCal",
    location: "San Francisco Bay Area",
    url: "https://www.challengedathletes.org/region/norcal/",
    description: "Provides grants, programs, and community connections for athletes with physical disabilities across Northern California, including a bi-weekly cycling club.",
    sports: ["Adaptive Cycling", "Triathlon", "Running"],
  },
  {
    id: 3,
    name: "Bay Area Wheelchair Sports",
    location: "Bay Area, CA",
    url: "https://www.borp.org",
    description: "Competitive and recreational wheelchair sports leagues including basketball and rugby for all skill levels.",
    sports: ["Wheelchair Basketball", "Wheelchair Rugby"],
  },
  {
    id: 4,
    name: "Move United",
    location: "National / Bay Area chapters",
    url: "https://moveunitedsport.org",
    description: "National governing body supporting adaptive sports programs including BORP. Connects athletes to local programs and competitive opportunities.",
    sports: ["All Sports"],
  },
];

const EVENTS = [
  {
    id: 1,
    title: "BORP Adaptive Sports Expo",
    org: "BORP",
    date: "2026-06-06",
    location: "James Kenney Community Center, Berkeley",
    sports: ["Wheelchair Rugby", "Goalball", "Power Soccer", "Wheelchair Basketball", "Adaptive Cycling", "Kayaking", "Adaptive Climbing"],
    description: "A full day of adaptive sports open to all. Multiple venues across Berkeley featuring wheelchair rugby, goalball, power soccer, wheelchair tennis, basketball, cycling, kayaking, and climbing. Free accessible shuttle from North Berkeley BART.",
    url: "https://www.borp.org/expo/",
    free: true,
  },
  {
    id: 2,
    title: "CAF NorCal Cycling Club — Weekly Ride",
    org: "CAF NorCal",
    date: "2026-05-17",
    location: "Bay Area (rotating)",
    sports: ["Adaptive Cycling"],
    description: "Bi-weekly Saturday rides, ~45 miles, self-supported and social. All levels welcome. Membership includes jersey and weekly updates.",
    url: "https://www.challengedathletes.org/region/norcal/",
    free: false,
    recurring: true,
  },
  {
    id: 3,
    title: "BORP Wheelchair Basketball Open Practice",
    org: "BORP",
    date: "2026-05-20",
    location: "Berkeley, CA",
    sports: ["Wheelchair Basketball"],
    description: "Open practice session for new and returning players. Equipment provided. All ages and ability levels welcome.",
    url: "https://www.borp.org",
    free: true,
    recurring: true,
  },
  {
    id: 4,
    title: "BORP Power Soccer Practice",
    org: "BORP",
    date: "2026-05-21",
    location: "Berkeley, CA",
    sports: ["Power Soccer"],
    description: "Practice session for power wheelchair users. Competitive and recreational teams available.",
    url: "https://www.borp.org",
    free: true,
    recurring: true,
  },
  {
    id: 5,
    title: "BORP Kayaking Session",
    org: "BORP",
    date: "2026-05-24",
    location: "BORP Kayaking & Cycling Center, 80 Bolivar Dr, Berkeley",
    sports: ["Kayaking"],
    description: "Adaptive kayaking on the Bay. Accessible equipment and trained instructors. No experience necessary.",
    url: "https://www.borp.org",
    free: false,
  },
  {
    id: 6,
    title: "Goalball Open Training",
    org: "BORP",
    date: "2026-05-28",
    location: "Berkeley, CA",
    sports: ["Goalball"],
    description: "Open training session for goalball — a team sport designed for athletes with visual impairments. Equipment and eyeshades provided.",
    url: "https://www.borp.org",
    free: true,
    recurring: true,
  },
];

const ALL_SPORTS = [...new Set(EVENTS.flatMap(e => e.sports))].sort();

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function SportBadge({ sport }) {
  return (
    <span style={{
      display: "inline-block",
      fontSize: 11,
      padding: "2px 10px",
      borderRadius: 100,
      background: "#f0f0ee",
      color: "#444",
      marginRight: 4,
      marginBottom: 4,
      fontFamily: "'DM Mono', monospace",
      letterSpacing: "0.02em",
    }}>{sport}</span>
  );
}

export default function App() {
  const [tab, setTab] = useState("events");
  const [sportFilter, setSportFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState(EVENTS);
  const [lastUpdated, setLastUpdated] = useState("May 13, 2026");

  const filteredEvents = events.filter(e => {
    const matchSport = sportFilter === "All" || e.sports.includes(sportFilter);
    const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.org.toLowerCase().includes(search.toLowerCase()) || e.location.toLowerCase().includes(search.toLowerCase());
    return matchSport && matchSearch;
  });

  const filteredOrgs = ORGS.filter(o => {
    const matchSport = sportFilter === "All" || o.sports.includes(sportFilter) || o.sports.includes("All Sports");
    const matchSearch = !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.description.toLowerCase().includes(search.toLowerCase());
    return matchSport && matchSearch;
  });

  const tabs = [
    { id: "events", label: "Events" },
    { id: "orgs", label: "Organizations" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#fafaf8", fontFamily: "'DM Sans', sans-serif", color: "#1a1a18" }}>

      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ borderBottom: "1px solid #e8e8e4", background: "#fff", padding: "0 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#1a1a18" }}>Bay Area</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase" }}>Adaptive Sports</span>
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#aaa" }}>
            Updated {lastUpdated}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div style={{ background: "#1a1a18", color: "#fff", padding: "48px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 700, margin: "0 0 12px", lineHeight: 1.1 }}>
            Find your game.
          </h1>
          <p style={{ fontSize: 16, color: "#aaa", margin: "0 0 32px", fontWeight: 300, maxWidth: 480 }}>
            Events, teams, and resources for adaptive and disability sports across the Bay Area.
          </p>

          {/* Search */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search events, orgs, sports…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: "1 1 300px",
                padding: "10px 16px",
                borderRadius: 6,
                border: "1px solid #333",
                background: "#2a2a28",
                color: "#fff",
                fontSize: 14,
                fontFamily: "'DM Sans', sans-serif",
                outline: "none",
              }}
            />
            <select
              value={sportFilter}
              onChange={e => setSportFilter(e.target.value)}
              style={{
                padding: "10px 16px",
                borderRadius: 6,
                border: "1px solid #333",
                background: "#2a2a28",
                color: sportFilter === "All" ? "#888" : "#fff",
                fontSize: 14,
                fontFamily: "'DM Sans', sans-serif",
                cursor: "pointer",
              }}
            >
              <option value="All">All sports</option>
              {ALL_SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid #e8e8e4", background: "#fff", padding: "0 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 0 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "14px 20px",
                border: "none",
                borderBottom: tab === t.id ? "2px solid #1a1a18" : "2px solid transparent",
                background: "none",
                fontSize: 14,
                fontWeight: tab === t.id ? 500 : 400,
                color: tab === t.id ? "#1a1a18" : "#888",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                marginBottom: -1,
              }}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px" }}>

        {tab === "events" && (
          <>
            {filteredEvents.length === 0 ? (
              <p style={{ color: "#888", fontSize: 14 }}>No events match your filters.</p>
            ) : (
              <div style={{ display: "grid", gap: 1, border: "1px solid #e8e8e4", borderRadius: 10, overflow: "hidden", background: "#e8e8e4" }}>
                {filteredEvents.map(event => (
                  <div key={event.id} style={{ background: "#fff", padding: "20px 24px", display: "grid", gridTemplateColumns: "100px 1fr auto", gap: 20, alignItems: "start" }}>
                    <div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {formatDate(event.date)}
                      </div>
                      {event.recurring && (
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#bbb", marginTop: 2 }}>recurring</div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 4 }}>{event.title}</div>
                      <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>{event.org} · {event.location}</div>
                      <div style={{ fontSize: 13, color: "#555", lineHeight: 1.5, marginBottom: 10 }}>{event.description}</div>
                      <div>{event.sports.map(s => <SportBadge key={s} sport={s} />)}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, minWidth: 80 }}>
                      {event.free && (
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#2d7a4f", background: "#eaf5ef", padding: "2px 8px", borderRadius: 100 }}>Free</span>
                      )}
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12, color: "#1a1a18", textDecoration: "none", borderBottom: "1px solid #ccc", fontFamily: "'DM Mono', monospace" }}
                      >Details →</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "orgs" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {filteredOrgs.map(org => (
              <div key={org.id} style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: 10, padding: "20px 24px" }}>
                <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 4 }}>{org.name}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#888", marginBottom: 12 }}>{org.location}</div>
                <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6, marginBottom: 14 }}>{org.description}</p>
                <div style={{ marginBottom: 14 }}>{org.sports.map(s => <SportBadge key={s} sport={s} />)}</div>
                <a href={org.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#1a1a18", textDecoration: "none", borderBottom: "1px solid #ccc", fontFamily: "'DM Mono', monospace" }}>
                  Visit website →
                </a>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #e8e8e4", padding: "24px 32px", marginTop: 48 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#bbb" }}>
            Bay Area Adaptive Sports · Data sourced from BORP, CAF NorCal, and partner organizations
          </span>
          <a href="mailto:hello@example.com" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#bbb", textDecoration: "none" }}>
            Submit an event →
          </a>
        </div>
      </footer>

    </div>
  );
}
