import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SOURCES = [
  { name: "BORP", url: "https://www.borp.org/programs/" },
  { name: "CAF NorCal", url: "https://www.challengedathletes.org/region/norcal/" },
];

async function main() {
  let allEvents = [];
  let id = 1;

  for (const source of SOURCES) {
    console.log(`Scraping ${source.name}...`);
    try {
      const res = await fetch(source.url);
      const html = await res.text();
      const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 8000);
      const today = new Date().toISOString().split("T")[0];
      const msg = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: `Today is ${today}. Extract future events from this text as a JSON array. Each item: {"title":"","date":"YYYY-MM-DD","location":"","sports":[],"description":"","url":"${source.url}","free":true,"recurring":false,"org":"${source.name}"}. Return ONLY the JSON array. Text: ${text}` }]
      });
      const events = JSON.parse(msg.content[0].text.trim());
      allEvents.push(...events.map(e => ({ ...e, id: id++ })));
      console.log(`  Found ${events.length} events`);
    } catch (err) {
      console.warn(`  Failed: ${err.message}`);
    }
  }

  allEvents.sort((a, b) => a.date.localeCompare(b.date));
  const out = path.join(__dirname, "..", "src", "events.json");
  fs.writeFileSync(out, JSON.stringify(allEvents, null, 2));
  console.log(`Done. ${allEvents.length} events written.`);
}

main().catch(console.error);
