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
  const [zip, setZip] = useState(""
