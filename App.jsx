// scraper/scrape.js
// Run this weekly to update events data
// Usage: ANTHROPIC_API_KEY=your-key node scraper/scrape.js

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SOURCES = [
  { name: "BORP", url: "https://www.borp.org/programs/" },
  { name: "CAF NorCal", url: "https://www.challengedathletes.org/region/norcal/" },
  { name: "BORP Expo", url: "https://www.borp.org/expo/" },
];

async function fetchPage(url) {
  const res = await fetch(url);
  const html = await res.text();
  // Strip tags to get text only
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 8000);
}

async function extractEvents(source, pageText) {
  const today = new Date().toISOString().split("T")[0];
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{
      role: "user",
      content: `Extract upcoming sports events from this webpage text. Today is ${today}. Only include events with dates in the future.

Return ONLY a JSON array, no explanation, no markdown. Each event:
{
  "title": "Event name",
  "date": "YYYY-MM-DD",
  "location": "City, CA",
  "sports": ["Sport Name"],
  "description": "One sentence description",
  "url": "${source.url}",
  "free": true or false,
  "recurring": true or false,
  "org": "${source.name}"
}

If no clear future events found, return [].

Webpage text:
${pageText}`
    }]
  });

  const text = message.content[0].text.trim();
  try {
    return JSON.parse(text);
  } catch {
    console.warn(`Could not parse events from ${source.name}`);
    return [];
  }
}

async function main() {
  console.log("Starting scrape...");
  let allEvents = [];
  let id = 1;

  for (const source of SOURCES) {
    console.log(`Scraping ${source.name}...`);
    try {
      const text = await fetchPage(source.url);
      const events = await extractEvents(source, text);
      console.log(`  Found ${events.length} events`);
      allEvents.push(...events.map(e => ({ ...e, id: id++ })));
    } catch (err) {
      console.warn(`  Failed: ${err.message}`);
    }
  }

  // Deduplicate by title + date
  const seen = new Set();
  allEvents = allEvents.filter(e => {
    const key = `${e.title}-${e.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by date
  allEvents.sort((a, b) => a.date.localeCompare(b.date));

  // Write to src/events.json
  const outPath = path.join(process.cwd(), "src", "events.json");
  fs.writeFileSync(outPath, JSON.stringify(allEvents, null, 2));
  console.log(`Done. Wrote ${allEvents.length} events to src/events.json`);
  console.log(`Last updated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`);
}

main().catch(console.error);
