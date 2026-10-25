// Robust daily scraper for Bay Area Adaptive Sports.
// Per source, in order: (1) calendar feeds (iCal / WordPress Events JSON) -> exact, free
//                       (2) real-browser render + AI extraction -> handles JavaScript sites
// If a source returns nothing or errors, its previous events are kept (until they expire).
// Writes public/events.json (array) and public/status.json (per-source health).
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "..", "public");
const MODEL = "claude-sonnet-4-5";
const MIN_TOTAL_EVENTS = 3; // below this the run is marked failed (GitHub emails you)
const today = new Date().toISOString().split("T")[0];

const now = new Date();
const borpUrl = `https://borp.app.neoncrm.com/np/clients/borp/publicaccess/eventCalendarBig.jsp?year=${now.getFullYear()}&month=${now.getMonth()}`;
const borpNext = new Date(now.getFullYear(), now.getMonth() + 1, 1);
const borpNextUrl = `https://borp.app.neoncrm.com/np/clients/borp/publicaccess/eventCalendarBig.jsp?year=${borpNext.getFullYear()}&month=${borpNext.getMonth()}`;

// feeds: tried first, silently skipped if they don't exist. pages: rendered in a browser if feeds give nothing.
const SOURCES = [
  { name: "BORP", pages: [borpUrl, borpNextUrl], feeds: [] },
  { name: "CAF NorCal", pages: ["https://www.challengedathletes.org/region/norcal/"],
    feeds: ["https://www.challengedathletes.org/events/?ical=1", "https://www.challengedathletes.org/wp-json/tribe/events/v1/events?per_page=50"] },
  { name: "Special Olympics NorCal", pages: ["https://sonc.org/events/"],
    feeds: ["https://sonc.org/events/?ical=1", "https://sonc.org/wp-json/tribe/events/v1/events?per_page=50"] },
  { name: "BAADS", pages: ["https://www.baads.org"], feeds: ["https://www.baads.org/events/?ical=1"] },
  { name: "Achilles SF Bay Area", pages: ["https://www.achillesinternational.org/san-francisco-bay-area"], feeds: [] },
  { name: "Shared Adventures", pages: ["https://sharedadventures.org/events/"],
    feeds: ["https://sharedadventures.org/events/?ical=1", "https://sharedadventures.org/wp-json/tribe/events/v1/events?per_page=50"] },
  { name: "Move United", pages: ["https://moveunitedsport.org/events/"],
    feeds: ["https://moveunitedsport.org/events/?ical=1", "https://moveunitedsport.org/wp-json/tribe/events/v1/events?per_page=50"] },
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

// ---------- feeds ----------
export function parseICS(text) {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const out = [];
  for (const block of unfolded.split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0];
    const get = (k) => {
      const m = body.match(new RegExp(`^${k}[^:\\n]*:(.*)$`, "m"));
      return m ? m[1].replace(/\r/g, "").replace(/\\n/g, " ").replace(/\\,/g, ",").replace(/\;/g, ";").trim() : "";
    };
    const dt = get("DTSTART").match(/^(\d{4})(\d{2})(\d{2})/);
    if (!dt) continue;
    out.push({ title: get("SUMMARY"), date: `${dt[1]}-${dt[2]}-${dt[3]}`, location: get("LOCATION"),
      description: get("DESCRIPTION").slice(0, 200), url: get("URL") });
  }
  return out;
}

function parseTribe(json) {
  return (json.events || []).map((e) => ({
    title: (e.title || "").replace(/&#8211;|&#8212;/g, "-").replace(/&amp;/g, "&").replace(/&#038;/g, "&"),
    date: (e.start_date || "").slice(0, 10),
    location: e.venue?.city || "",
    description: (e.excerpt || e.description || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200),
    url: e.url || "",
  }));
}

async function tryFeed(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) return [];
  const text = await res.text();
  if (text.includes("BEGIN:VCALENDAR")) return parseICS(text);
  if (text.trim().startsWith("{")) return parseTribe(JSON.parse(text));
  return [];
}

// ---------- browser + AI ----------
async function renderText(browser, url) {
  const page = await browser.newPage({ userAgent: UA });
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1500);
    return await page.evaluate(() => {
      document.querySelectorAll("script,style,noscript,nav,header,footer,aside,svg,iframe").forEach((n) => n.remove());
      const root = document.querySelector("main") || document.body;
      return root.innerText.replace(/\s+/g, " ").trim();
    });
  } finally {
    await page.close();
  }
}

async function aiExtract(client, source, url, text) {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    messages: [{ role: "user", content: `Today is ${today}. Extract upcoming sports events for ${source.name} from this webpage text.

Rules:
- Only include events with a specific calendar date actually written in the text (e.g. "Nov 8", "11/08/2026"). If a month is given without a year, assume the next occurrence on or after today.
- Never guess dates. Do not convert "every Saturday" style phrases into dates.
- Skip cancelled/closed events and events before ${today}.
- Fewer events (or none) is better than wrong ones.

Return ONLY a JSON array of: {"title","date":"YYYY-MM-DD","city","sports":["sport"],"description":"one sentence","free":true|false,"recurring":true|false}
Return [] if none.

Page text:
${text.slice(0, 30000)}` }],
  });
  const m = msg.content[0].text.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try { return JSON.parse(m[0]).map((e) => ({ ...e, url })); } catch { return []; }
}

// ---------- helpers ----------
async function geocode(city, cache) {
  if (!city) return null;
  if (cache[city]) return cache[city];
  try {
    await new Promise((r) => setTimeout(r, 1100));
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ", California")}&format=json&limit=1`, { headers: { "User-Agent": "bayarea-adaptive-sports" } });
    const d = await res.json();
    if (d.length) return (cache[city] = { lat: +d[0].lat, lng: +d[0].lon });
  } catch {}
  return null;
}

const readJSON = (f, fallback) => { try { return JSON.parse(fs.readFileSync(path.join(PUBLIC, f), "utf8")); } catch { return fallback; } };

// ---------- main ----------
async function main() {
  const previous = readJSON("events.json", []);
  const geoCache = {};
  for (const e of previous) if (e.city && e.lat != null) geoCache[e.city] = { lat: e.lat, lng: e.lng };

  const client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
  let browser = null;
  try { const { chromium } = await import("playwright"); browser = await chromium.launch(); }
  catch (e) { console.warn("Browser unavailable:", e.message); }

  const status = {};
  let all = [];

  for (const source of SOURCES) {
    let events = [], method = "none", error = "";
    try {
      for (const f of source.feeds) {
        try { events = await tryFeed(f); } catch { events = []; }
        events = events.filter((e) => e.date >= today);
        if (events.length) { method = "feed"; events = events.map((e) => ({ ...e, url: e.url || source.pages[0], city: e.location?.split(",")[0] || "" })); break; }
      }
      if (!events.length && browser && client) {
        for (const url of source.pages) {
          try {
            const text = await renderText(browser, url);
            console.log(`  [${source.name}] rendered ${text.length} chars from ${url}`);
            events.push(...(await aiExtract(client, source, url, text)));
          } catch (e) { error = e.message; console.warn(`  [${source.name}] ${url}: ${e.message}`); }
        }
        if (events.length) method = "browser+ai";
      }
    } catch (e) { error = e.message; }

    events = events.filter((e) => e.title && e.date && e.date >= today);
    let stale = false;
    if (!events.length) {
      // keep last good events for this source until they expire
      events = previous.filter((e) => e.org === source.name && e.date >= today);
      stale = events.length > 0;
      if (stale) method = "kept-previous";
    }
    for (const e of events) {
      e.org = source.name;
      if (e.lat == null) { const c = await geocode(e.city, geoCache); if (c) Object.assign(e, c); }
    }
    status[source.name] = { count: events.length, method, stale, error, checked: today,
      lastFresh: stale ? (readJSON("status.json", {})[source.name]?.lastFresh || "unknown") : today };
    console.log(`${source.name}: ${events.length} events (${method}${error ? ", error: " + error : ""})`);
    all.push(...events);
  }
  if (browser) await browser.close();

  const seen = new Set();
  all = all.filter((e) => { const k = `${e.org}|${e.title}|${e.date}`; if (seen.has(k)) return false; seen.add(k); return true; })
           .sort((a, b) => a.date.localeCompare(b.date)).map((e, i) => ({ ...e, id: i + 1 }));

  fs.mkdirSync(PUBLIC, { recursive: true });
  fs.writeFileSync(path.join(PUBLIC, "events.json"), JSON.stringify(all, null, 2));
  fs.writeFileSync(path.join(PUBLIC, "status.json"), JSON.stringify({ updated: today, total: all.length, sources: status }, null, 2));
  console.log(`Done. ${all.length} events.`);

  if (all.length < MIN_TOTAL_EVENTS) {
    console.error(`UNHEALTHY: only ${all.length} events (minimum ${MIN_TOTAL_EVENTS}). Check source logs above.`);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
