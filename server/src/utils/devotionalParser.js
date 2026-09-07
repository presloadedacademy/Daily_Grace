import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse raw markdown text of devotionals into structured JSON objects.
 * Expects format:
 * ### [N]. [Title]
 * **Bible Verse:** [Verse]
 * **Scripture Reference:** [Reference]
 * **Reflection:** [Reflection]
 * **Prayer:** [Prayer]
 */
export function parseDevotionalsMarkdown(rawText) {
  const sections = rawText.split(/(?=###\s+\d+\.)/g);
  const devotionals = [];
  const errors = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed || !trimmed.startsWith('###')) continue;

    // Extract title: ### 1. Peace Begins With God
    const titleMatch = trimmed.match(/^###\s+\d+\.\s*(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract Bible Verse: **Bible Verse:** “...” or "..."
    const verseMatch = trimmed.match(/\*\*Bible Verse:\*\*\s*[“"]?([\s\S]*?)[”"]?\r?\n\*\*Scripture Reference:\*\*/m) ||
                       trimmed.match(/\*\*Bible Verse:\*\*\s*(.+)$/m);
    let verse = verseMatch ? verseMatch[1].trim() : '';
    // Clean leading/trailing quotes
    verse = verse.replace(/^[“"']|[”"']$/g, '').trim();

    // Extract Scripture Reference: **Scripture Reference:** Isaiah 26:3
    const refMatch = trimmed.match(/\*\*Scripture Reference:\*\*\s*(.+)$/m);
    let reference = refMatch ? refMatch[1].trim() : '';

    // Extract Reflection: **Reflection:** ...
    const reflectionMatch = trimmed.match(/\*\*Reflection:\*\*\s*([\s\S]*?)(?=\r?\n\r?\n\*\*Prayer:\*\*|\r?\n\*\*Prayer:\*\*|$)/m);
    let reflection = reflectionMatch ? reflectionMatch[1].trim() : '';

    // Extract Prayer: **Prayer:** ...
    const prayerMatch = trimmed.match(/\*\*Prayer:\*\*\s*([\s\S]*?)$/m);
    let prayer = prayerMatch ? prayerMatch[1].trim() : '';

    // Validation
    if (!title || !verse || !reference || !reflection || !prayer) {
      errors.push({
        raw: trimmed.slice(0, 80) + '...',
        missing: {
          title: !title,
          verse: !verse,
          reference: !reference,
          reflection: !reflection,
          prayer: !prayer,
        },
      });
      continue;
    }

    devotionals.push({
      title,
      verse,
      reference,
      reflection,
      prayer,
      status: 'published',
    });
  }

  return { devotionals, errors };
}
