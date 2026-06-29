import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SOURCES = [
  { name: "BORP", url: "https://www.borp.org/programs/" },
  { name: "BORP Adventures & Outings", url: "https://www.borp.org/programs/adventures-outings/" },
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

Look through this text carefully for any events, programs, classes, leagues, or activities that have dates. Include recurring weekly/monthly programs too — use the next upcoming date for those.

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

If you find no events with specific dates, return events for known recurring programs at this org using reasonable upcoming dates.
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
