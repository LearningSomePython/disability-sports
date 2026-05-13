import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SOURCES = [
  { name: "BORP", url: "https://www.borp.org/programs/" },
  { name: "BORP Adventures & Outings", url: "https://www.borp.org/programs/adventures-outings/" },
  { name: "BORP Revolution Ride", url: "https://www.borp.org/revolution/" },
  { name: "CAF NorCal", url: "https://www.challengedathletes.org/region/norcal/" },
  { name: "CAF Events", url: "https://www.challengedathletes.org/events/" },
  { name: "Special Olympics NorCal", url: "https://sonc.org/events/" },
  { name: "Achilles SF Bay Area", url: "https://www.achillesinternational.org/san-francisco-bay-area" },
  { name: "BAADS", url: "https://www.baads.org/events" },
  { name: "Far West Wheelchair Athletic Association", url: "https://www.fwwaa.org" },
  { name: "AXIS Dance Company", url: "https://www.axisdance.org/performances-events/" },
  { name: "Shared Adventures", url: "https://sharedadventures.org/events/" },
  { name: "Environmental Travelling Companions", url: "https://www.etctrips.org/trips-programs/" },
  { name: "Move United", url: "https://moveunitedsport.org/events/" },
  { name: "Achieve Tahoe", url: "https://achievetahoe.org/events/" },
];

async function geocodeCity(city) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ", California")}&format=json&limit=1`, {
      headers: { "User-Agent": "bayarea-adaptive-sports-scraper" }
    });
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) {}
  return null;
}

async function main() {
  let allEvents = [];
  let id = 1;

  for (const source of SOURCES) {
    console.log(`Scraping ${source.name}...`);
    try {
      const res = await fetch(source.url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const html = await res.text();
      const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 8000);
      const today = new Date().toISOString().split("T")[0];

      const msg = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: `Today is ${today}. Extract future events from this webpage text as a JSON array. Each item must include: {"title":"","date":"YYYY-MM-DD","city":"city name only e.g. Berkeley","address":"full address if available, otherwise empty string","sports":["sport name"],"description":"one sentence","url":"${source.url}","free":true or false,"recurring":true or false,"org":"${source.name}"}. Return ONLY the JSON array, no markdown, no explanation. If no future events, return []. Text: ${text}` }]
      });

      let events = [];
      try {
        events = JSON.parse(msg.content[0].text.trim());
      } catch {
        console.warn(`  Could not parse from ${source.name}`);
        continue;
      }

      // Geocode each event
      for (const event of events) {
        if (event.city) {
          const coords = await geocodeCity(event.city);
          if (coords) {
            event.lat = coords.lat;
            event.lng = coords.lng;
          }
        }
        allEvents.push({ ...event, id: id++ });
      }

      console.log(`  Found ${events.length} events`);
      await new Promise(r => setTimeout(r, 1000)); // be polite
    } catch (err) {
      console.warn(`  Failed: ${err.message}`);
    }
  }

  // Deduplicate
  const seen = new Set();
  allEvents = allEvents.filter(e => {
    const key = `${e.title}-${e.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  allEvents.sort((a, b) => a.date.localeCompare(b.date));

  const out = path.join(__dirname, "..", "src", "events.json");
  fs.writeFileSync(out, JSON.stringify(allEvents, null, 2));
  console.log(`Done. ${allEvents.length} events written.`);
}

main().catch(console.error);
