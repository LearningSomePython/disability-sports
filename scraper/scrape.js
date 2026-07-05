import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// BORP's live calendar uses a zero-based month number in the URL:
// month=0 is January, month=6 is July, etc. We build the current
// month's URL fresh each run so it never gets stuck on one month.
const now = new Date();
const borpYear = now.getFullYear();
const borpMonth = now.getMonth(); // already 0-based, which is what BORP wants
const borpCalendarUrl = `https://borp.app.neoncrm.com/np/clients/borp/publicaccess/eventCalendarBig.jsp?year=${borpYear}&month=${borpMonth}`;

const SOURCES = [
  { name: "BORP", url: borpCalendarUrl },
  { name: "CAF NorCal", url: "https://www.challengedathletes.org/region/norcal/" },
  { name: "Special Olympics NorCal", url: "https://sonc.org/events/" },
  { name: "BAADS", url: "https://www.baads.org" },
  { name: "Achilles SF Bay Area", url: "https://www.achillesinternational.org/san-francisco-bay-area" },
  { name: "Shared Adventures", url: "https://sharedadventures.org/events/" },
  { name: "Move United", url: "https://moveunitedsport.org/events/" },
];

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  });
  const html = await res.text();
  return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
             .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
             .replace(/<[^>]*>/g, " ")
             .replace(/\s+/g, " ")
             .trim()
             .slice(0, 10000);
}

async function extractEvents(source, pageText) {
  const today = new Date().toISOString().split("T")[0];
  const msg = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: `Today is ${today}. You are extracting sports events from a webpage for ${source.name}.

Look through this text for events, classes, or activities that have a SPECIFIC, EXPLICIT date written in the text (for example "July 11", "07/11/2026", or "Saturday, July 11, 2026").

CRITICAL RULES — read carefully:
- Only include an event if a specific calendar date for it is actually written in the text.
- Do NOT guess, infer, estimate, or invent dates. Ever. If you cannot find a clear specific date for an event, leave that event out completely.
- Do NOT turn vague phrases like "every Saturday", "monthly", or "2-3 times per month" into specific dates. If there is no actual date written, skip that event.
- Skip any event whose title or description says it is CANCELLED, CLOSED, or otherwise not happening.
- It is much better to return fewer events, or even none, than to include a date you are not certain is written in the text.

Return a JSON array. Each item:
{
  "title": "event name",
  "date": "YYYY-MM-DD",
  "city": "city name",
  "sports": ["sport"],
  "description": "one sentence",
  "url": "${source.url}",
  "free": true or false,
  "recurring": true or false,
  "org": "${source.name}"
}

If you find no events with specific written dates, return an empty array: []
Return ONLY the JSON array, no other text.

Webpage text:
${pageText}`
    }]
  });

  const text = msg.content[0].text.trim();
  const match = text.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {}
  }
  return [];
}

async function geocodeCity(city) {
  try {
    await new Promise(r => setTimeout(r, 500));
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ", California")}&format=json&limit=1`,
      { headers: { "User-Agent": "bayarea-adaptive-sports" } }
    );
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

async function main() {
  let allEvents = [];
  let id = 1;

  for (const source of SOURCES) {
    console.log(`Scraping ${source.name}...`);
    try {
      const text = await fetchPage(source.url);
      console.log(`  Got ${text.length} chars`);
      const events = await extractEvents(source, text);
      console.log(`  Found ${events.length} events`);

      for (const event of events) {
        if (event.city) {
          const coords = await geocodeCity(event.city);
          if (coords) { event.lat = coords.lat; event.lng = coords.lng; }
        }
        allEvents.push({ ...event, id: id++ });
      }
    } catch (err) {
      console.warn(`  Failed ${source.name}: ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  const seen = new Set();
  allEvents = allEvents.filter(e => {
    const key = `${e.title}-${e.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  allEvents.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const outDir = path.join(__dirname, "..", "public");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "events.json"), JSON.stringify(allEvents, null, 2));
  console.log(`Done. Wrote ${allEvents.length} events.`);
}

main().catch(console.error);
