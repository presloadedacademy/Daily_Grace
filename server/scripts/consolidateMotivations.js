import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateMotivationRecord } from '../src/utils/contentValidator.js';
import { SAMPLE_MOTIVATIONS } from '../seed/motivations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawInputPath = path.join(__dirname, '../data/raw_devotionals_input.txt');
const currentJsonPath = path.join(__dirname, '../data/motivations.json');
const outputJsonPath = path.join(__dirname, '../data/motivations.json');

function parseRawText(content) {
  const records = [];
  // Split by devotional headers (### <number>. <title>)
  const blocks = content.split(/\n(?=###\s+\d+\.)/);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed || !trimmed.startsWith('###')) continue;

    // Extract title
    const headerMatch = trimmed.match(/^###\s+\d+\.\s*(.+)/m);
    if (!headerMatch) continue;
    const title = headerMatch[1].trim();

    // Extract verse (e.g. **Bible Verse:** “...”)
    const verseMatch = trimmed.match(/\*\*Bible Verse:\*\*\s*[“"']?([\s\S]+?)[”"']?\s*\n\s*\*\*Scripture Reference:\*\*/);
    // Extract reference (e.g. **Scripture Reference:** Psalm 62:5)
    const refMatch = trimmed.match(/\*\*Scripture Reference:\*\*\s*(.+)/);
    // Extract reflection (e.g. **Reflection:** ...)
    const reflectionMatch = trimmed.match(/\*\*Reflection:\*\*\s*([\s\S]+?)(?=\n\s*\*\*Prayer:\*\*|$)/);
    // Extract prayer (e.g. **Prayer:** ...)
    const prayerMatch = trimmed.match(/\*\*Prayer:\*\*\s*([\s\S]+)$/);

    if (verseMatch && refMatch && reflectionMatch && prayerMatch) {
      let verse = verseMatch[1].trim().replace(/^["“]|["”]$/g, '').trim();
      let reference = refMatch[1].trim();
      let reflection = reflectionMatch[1].trim();
      let prayer = prayerMatch[1].trim();

      records.push({
        title,
        verse,
        reference,
        reflection,
        prayer,
      });
    } else {
      console.warn(`[Warning] Could not fully parse block for title: "${title}"`);
    }
  }

  return records;
}

export function consolidateAll() {
  console.log('--- Consolidating Scripture Devotionals ---');
  const allRecords = [];
  const seenKeys = new Set();

  function addRecord(record, source) {
    const key = `${record.reference.toLowerCase().replace(/\s+/g, '')}:${record.title.toLowerCase().trim()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      allRecords.push(record);
    }
  }

  // 1. Parse raw text file if present
  if (fs.existsSync(rawInputPath)) {
    const rawContent = fs.readFileSync(rawInputPath, 'utf8');
    const parsedRaw = parseRawText(rawContent);
    console.log(`Parsed ${parsedRaw.length} devotionals from raw_devotionals_input.txt`);
    parsedRaw.forEach((r) => addRecord(r, 'raw_text'));
  }

  // 2. Add from current motivations.json
  if (fs.existsSync(currentJsonPath)) {
    try {
      const currentJson = JSON.parse(fs.readFileSync(currentJsonPath, 'utf8'));
      if (Array.isArray(currentJson)) {
        currentJson.forEach((r) => addRecord(r, 'current_json'));
      }
    } catch (e) {
      console.warn('Could not read existing motivations.json:', e.message);
    }
  }

  // 3. Add from sample motivations
  if (Array.isArray(SAMPLE_MOTIVATIONS)) {
    SAMPLE_MOTIVATIONS.forEach((r) => addRecord(r, 'sample_js'));
  }

  // 4. Validate all records
  const validRecords = [];
  const invalidRecords = [];

  allRecords.forEach((item, index) => {
    const validation = validateMotivationRecord(item, index + 1);
    if (validation.isValid) {
      validation.sanitized.day_number = validRecords.length + 1;
      validRecords.push(validation.sanitized);
    } else {
      invalidRecords.push({ item, errors: validation.errors });
    }
  });

  console.log(`\nTotal Unique Valid Records: ${validRecords.length}`);
  if (invalidRecords.length > 0) {
    console.warn(`Invalid Records (${invalidRecords.length}):`, invalidRecords);
  }

  // 5. Write to motivations.json
  fs.writeFileSync(outputJsonPath, JSON.stringify(validRecords, null, 2), 'utf8');
  console.log(`Saved ${validRecords.length} consolidated devotionals to: ${outputJsonPath}`);

  return validRecords;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  consolidateAll();
}
