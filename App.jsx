import { useState, useEffect } from "react";

const ORGS = [
  { id: 1, name: "BORP Adaptive Sports & Recreation", location: "Berkeley, CA", url: "https://www.borp.org", description: "The Bay Area's leading provider of adaptive sports since 1976. Founded by people with disabilities to create access to outdoor, fitness, and recreational activities.", sports: ["Wheelchair Basketball", "Wheelchair Rugby", "Power Soccer", "Goalball", "Adaptive Cycling", "Kayaking", "Adaptive Climbing", "Adaptive Tennis", "Pickleball", "Sled Hockey"] },
  { id: 2, name: "Challenged Athletes Foundation — NorCal", location: "San Francisco Bay Area", url: "https://www.challengedathletes.org/region/norcal/", description: "Provides grants, programs, and community connections for athletes with physical disabilities across Northern California.", sports: ["Adaptive Cycling", "Triathlon", "Running"] },
  { id: 3, name: "Special Olympics NorCal", location: "Bay Area", url: "https://sonc.org", description: "Year-round sports training and competition for people with intellectual disabilities across Northern California.", sports: ["All Sports"] },
  { id: 4, name: "Achilles SF Bay Area", location: "San Francisco", url: "https://www.achillesinternational.org/san-francisco-bay-area", description: "Weekly runs and rides for athletes with disabilities alongside volunteer guide runners.", sports: ["Running", "Triathlon"] },
  { id: 5, name: "BAADS", location: "Pier 40, San Francisco", url: "https://www.baads.org", description: "Bay Area Association of Disabled Sailors — sailing instruction every weekend for people with any disability.", sports: ["Sailing"] },
  { id: 6, name: "Far West Wheelchair Athletic Association", location: "San Jose, CA", url: "https://www.fwwaa.org", description: "Promotes sports competition and fitness for people with physical disabilities across the western US.", sports: ["Archery", "Cycling", "Swimming", "Rowing", "Triathlon"] },
  { id: 7, name: "AXIS Dance Company", location: "Oakland, CA", url: "https://www.axisdance.org", description: "Professional integrated dance company and education organization for dancers with and without disabilities.", sports: ["Dance"] },
  { id: 8, name: "Shared Adventures", location: "Santa Cruz / Bay Area", url: "https://sharedadventures.org", description: "Year-round recreational activities for people with disabilities including kayaking, surfing, sailing, and more.", sports: ["Kayaking", "Surfing", "Sailing", "Archery"] },
  { id: 9, name: "Environmental Travelling Companions", location: "San Francisco", url: "https://www.etctrips.org", description: "Outdoor adventures accessible to people with disabilities — kayaking, whitewater rafting, and skiing.", sports: ["Kayaking", "Rafting", "Skiing"] },
  { id: 10, name: "Move United", location: "National / Bay Area chapters", url: "https://moveunitedsport.org", description: "National governing body supporting adaptive sports programs. Connects athletes to local programs and competitive opportunities.", sports: ["All Sports"] },
  { id: 11, name: "Achieve Tahoe", location: "Lake Tahoe, CA", url: "https://achievetahoe.org", description: "Adaptive skiing, snowboarding, and summer outdoor adventures for people with disabilities near the Bay Area.", sports: ["Skiing", "Snowboarding", "Hiking"] },
];

const FALLBACK_EVENTS = [
  { id: 1, title: "BORP Adaptive Sports Expo", org: "BORP", date: "2026-06-06", city: "Berkeley", lat: 37.8716, lng: -122.2727, sports: ["Wheelchair Rugby", "Goalball", "Power Soccer", "Wheelchair Basketball", "Adaptive Cycling", "Kayaking", "Adaptive Climbing"], description: "A full day of adaptive sports open to all across multiple Berkeley venues. Free accessible shuttle from North Berkeley BART.", url: "https://www.borp.org/expo/", free: true },
  { id: 2, title: "CAF NorCal Cycling Club — Weekly Ride", org: "CAF NorCal", date: "2026-05-17", city: "San Francisco", lat: 37.7749, lng: -122.4194, sports: ["Adaptive Cycling"], description: "Bi-weekly Saturday rides, ~45 miles, self-supported and social. All levels welcome.", url: "https://www.challengedathletes.org/region/norcal/", free: false, recurring: true },
  { id: 3, title: "BORP Wheelchair Basketball Open Practice", org: "BORP", date: "2026-05-20", city: "Berkeley", lat: 37.8716, lng: -122.2727, sports: ["Wheelchair Basketball"], description: "Open practice for new and returning players. Equipment provided.", url: "https://www.borp.org", free: true, recurring: true },
  { id: 4, title: "BAADS Sailing Outing", org: "BAADS", date: "2026-05-23", city: "San Francisco", lat: 37.7749, lng: -122.4194, sports: ["Sailing"], description: "Weekend sailing on the Bay for people with any disability. Equipment and instruction provided.", url: "https://www.baads.org", free: false, recurring: true },
  { id: 5, title: "Achilles SF Weekly Run", org: "Achilles SF Bay Area", date: "2026-05-20", city: "San Francisco", lat: 37.7749, lng: -122.4194, sports: ["Running"], description: "Weekly group run for athletes with disabilities alongside volunteer guides. All paces welcome.", url: "https://www.achillesinternational.org/san-francisco-bay-area", free: true, recurring: true },
];

function toRad(deg) { return deg * Math.PI / 180; }

function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function zipToCoords(zip) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&limit=1`);
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function SportBadge({ sport }) {
  return <span style={{ display: "inline-block", fontSize: 11, padding: "2px 10px", borderRadius: 100, background: "#f0f0ee", color: "#444", marginRight: 4, marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>{sport}</span>;
}

export default function App() {
  const [tab, setTab] = useState("events");
  const [sportFilter, setSportFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [events, setEvents] = useState(FALLBACK_EVENTS);
  const [lastUpdated, setLastUpdated] = useState("May 13, 2026");
  const [zipInput, setZipInput] = useState("");
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState(25);
  const [zipCoords, setZipCoords] = useState(null);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError, setZipError] = useState("");

  useEffect(() => {
    fetch("/events.json")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setEvents(data); })
      .catch(() => {});
  }, []);

  const ALL_SPORTS = [...new Set(events.flatMap(e => e.sports || []))].sort();

  async function applyZip() {
    const z = zipInput.trim();
    if (!z) { setZipCoords(null); setZip(""); return; }
    setZipLoading(true);
    setZipError("");
    const coords = await zipToCoords(z);
    setZipLoading(false);
    if (coords) { setZipCoords(coords); setZip(z); }
    else setZipError("Zip code not found");
  }

  function clearZip() { setZip(""); setZipInput(""); setZipCoords(null); setZipError(""); }

  const filteredEvents = events.filter(e => {
    if (sportFilter !== "All" && !(e.sports || []).includes(sportFilter)) return false;
    if (search && !e.title?.toLowerCase().includes(search.toLowerCase()) && !e.org?.toLowerCase().includes(search.toLowerCase()) && !e.city?.toLowerCase().includes(search.toLowerCase())) return false;
    if (zipCoords && e.lat && e.lng && distanceMiles(zipCoords.lat, zipCoords.lng, e.lat, e.lng) > radius) return false;
    return true;
  });

  const filteredOrgs = ORGS.filter(o => {
    if (sportFilter !== "All" && !o.sports.includes(sportFilter) && !o.sports.includes("All Sports")) return false;
    if (search && !o.name.toLowerCase().includes(search.toLowerCase()) && !o.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#fafaf8", fontFamily: "'DM Sans', sans-serif", color: "#1a1a18" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />

      <header style={{ borderBottom: "1px solid #e8e8e4", background: "#fff", padding: "0 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700 }}>Bay Area</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#888", letterSpacing: "0.08em", textTransform: "uppercase" }}>Adaptive Sports</span>
          </div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#aaa" }}>Updated {lastUpdated}</div>
        </div>
      </header>

      <div style={{ background: "#1a1a18", color: "#fff", padding: "48px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}>

          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 700, margin: "0 0 12px", lineHeight: 1.1 }}>Find your game.</h1>
            <p style={{ fontSize: 16, color: "#aaa", margin: "0 0 28px", fontWeight: 300 }}>Events, teams, and resources for adaptive and disability sports across the Bay Area.</p>
            <div style={{ borderTop: "1px solid #333", paddingTop: 24 }}>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>Need help finding sports?</div>
              <p style={{ fontSize: 14, color: "#aaa", margin: "0 0 16px", lineHeight: 1.6, fontWeight: 300 }}>Not sure where to start? Looking for programs near you? Email us — we'll help you find the right fit.</p>
              
                href="mailto:bayareaadaptivesports@gmail.com?subject=I need help finding adaptive sports"
                style={{ display: "inline-block", background: "#fff", color: "#1a1a18", padding: "10px 20px", borderRadius: 6, fontSize: 13, fontWeight: 500, textDecoration: "none", fontFamily: "'DM Mono', monospace" }}
              >
                bayareaadaptivesports@gmail.com →
              </a>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
              <input type="text" placeholder="Search events, orgs, sports…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: "1 1 200px", padding: "10px 16px", borderRadius: 6, border: "1px solid #333", background: "#2a2a28", color: "#fff", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
              <select value={sportFilter} onChange={e => setSportFilter(e.target.value)} style={{ padding: "10px 16px", borderRadius: 6, border: "1px solid #333", background: "#2a2a28", color: sportFilter === "All" ? "#888" : "#fff", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
                <option value="All">All sports</option>
                {ALL_SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input type="text" placeholder="Zip code" value={zipInput} onChange={e => setZipInput(e.target.value)} onKeyDown={e => e.key === "Enter" && applyZip()} style={{ width: 100, padding: "8px 12px", borderRadius: 6, border: "1px solid #333", background: "#2a2a28", color: "#fff", fontSize: 13, fontFamily: "'DM Mono', monospace", outline: "none" }} />
              <select value={radius} onChange={e => setRadius(Number(e.target.value))} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #333", background: "#2a2a28", color: "#aaa", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                <option value={5}>Within 5 mi</option>
                <option value={10}>Within 10 mi</option>
                <option value={25}>Within 25 mi</option>
                <option value={50}>Within 50 mi</option>
              </select>
              <button onClick={applyZip} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #555", background: "transparent", color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                {zipLoading ? "…" : "Filter by location"}
              </button>
              {zip && <button onClick={clearZip} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #555", background: "transparent", color: "#aaa", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>✕ {zip} ({radius}mi)</button>}
              {zipError && <span style={{ color: "#E24B4A", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{zipError}</span>}
            </div>
          </div>

        </div>
      </div>

      <div style={{ borderBottom: "1px solid #e8e8e4", background: "#fff", padding: "0 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex" }}>
          {["events", "orgs"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "14px 20px", border: "none", borderBottom: tab === t ? "2px solid #1a1a18" : "2px solid transparent", background: "none", fontSize: 14, fontWeight: tab === t ? 500 : 400, color: tab === t ? "#1a1a18" : "#888", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: -1 }}>{t === "events" ? "Events" : "Organizations"}</button>
          ))}
        </div>
      </div>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px" }}>
        {tab === "events" && (
          filteredEvents.length === 0
            ? <p style={{ color: "#888", fontSize: 14 }}>No events match your filters.{zipCoords ? " Try a larger radius." : ""}</p>
            : <div style={{ display: "grid", gap: 1, border: "1px solid #e8e8e4", borderRadius: 10, overflow: "hidden", background: "#e8e8e4" }}>
                {filteredEvents.map(event => (
                  <div key={event.id} style={{ background: "#fff", padding: "20px 24px", display: "grid", gridTemplateColumns: "100px 1fr auto", gap: 20, alignItems: "start" }}>
                    <div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>{formatDate(event.date)}</div>
                      {event.recurring && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#bbb", marginTop: 2 }}>recurring</div>}
                      {zipCoords && event.lat && event.lng && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#aaa", marginTop: 4 }}>{Math.round(distanceMiles(zipCoords.lat, zipCoords.lng, event.lat, event.lng))} mi</div>}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 4 }}>{event.title}</div>
                      <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>{event.org}{event.city ? ` · ${event.city}` : ""}</div>
                      <div style={{ fontSize: 13, color: "#555", lineHeight: 1.5, marginBottom: 10 }}>{event.description}</div>
                      <div>{(event.sports || []).map(s => <SportBadge key={s} sport={s} />)}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, minWidth: 80 }}>
                      {event.free && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#2d7a4f", background: "#eaf5ef", padding: "2px 8px", borderRadius: 100 }}>Free</span>}
                      <a href={event.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#1a1a18", textDecoration: "none", borderBottom: "1px solid #ccc", fontFamily: "'DM Mono', monospace" }}>Details →</a>
                    </div>
                  </div>
                ))}
              </div>
        )}

        {tab === "orgs" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {filteredOrgs.map(org => (
              <div key={org.id} style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: 10, padding: "20px 24px" }}>
                <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 4 }}>{org.name}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#888", marginBottom: 12 }}>{org.location}</div>
                <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6, marginBottom: 14 }}>{org.description}</p>
                <div style={{ marginBottom: 14 }}>{org.sports.map(s => <SportBadge key={s} sport={s} />)}</div>
                <a href={org.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#1a1a18", textDecoration: "none", borderBottom: "1px solid #ccc", fontFamily: "'DM Mono', monospace" }}>Visit website →</a>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer style={{ borderTop: "1px solid #e8e8e4", padding: "24px 32px", marginTop: 48 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#bbb" }}>Bay Area Adaptive Sports · Data sourced from BORP, CAF NorCal, Special Olympics NorCal, and partner organizations</span>
          <a href="mailto:bayareaadaptivesports@gmail.com" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#bbb", textDecoration: "none" }}>Submit an event →</a>
        </div>
      </footer>

    </div>
  );
}
