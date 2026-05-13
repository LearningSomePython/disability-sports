import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SOURCES = [
  { name: "BORP", url: "https://www.borp.org/programs/" },
  { name: "CAF NorCal", url: "https://www.challengedathletes.org/region/norcal/" },
  { name: "BORP Expo", url: "https://www.borp.org/expo/" },
];

async function fetchPage(url) {
  const res = await fetch(url);
  const html = await res.text();
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 8000);
}

async function extractEvents(source, pageText) {
  const today = new Date().toISOString().split("T")[0];
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{
      role: "user",
      content: `Extract upcoming sports events from this webpage text. Today is ${today}. Only include events with dates in the future. Return ONLY a JSON array, no explanation, no markdown. Each event: {"title":"","date":"YYYY-MM-DD","location":"","sports":[],"description":"","url":"${source.url}","free":true,"recurring":false,"org":"${source.name}"}. If no future events found, return []. Webpage: ${pageText}`
    }]
  });

  try {
    return JSON.parse(message.content[0].text.trim());
  } catch {
    console.warn(`Could not parse events from ${source.name}`);
    return [];
  }
}

async function main() {
  console.log("Starting scrape...");
  let allEvents
