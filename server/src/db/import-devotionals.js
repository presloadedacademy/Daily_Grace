import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, isDatabaseAvailable, checkDbConnection, closePool } from '../config/db.js';
import { parseDevotionalsMarkdown } from '../utils/devotionalParser.js';
import { MotivationRepository } from '../repositories/motivationRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function importDevotionalsFromFile(filePath) {
  await checkDbConnection();

  const targetPath = filePath || path.resolve(__dirname, '../../data/raw_devotionals_input.txt');


  if (!fs.existsSync(targetPath)) {
    throw new Error(`File not found: ${targetPath}`);
  }

  const rawText = fs.readFileSync(targetPath, 'utf-8');
  const { devotionals, errors: parseErrors } = parseDevotionalsMarkdown(rawText);

  const totalSupplied = devotionals.length + parseErrors.length;
  let initialDbCount = 0;
  let finalDbCount = 0;
  let duplicatesSkipped = 0;
  let successfullyInserted = 0;
  let failedRecords = 0;

  // 1. Get existing motivations from DB to build duplicate detection index
  const existingRes = await query('SELECT title, reference, verse FROM motivations');
  initialDbCount = existingRes.rows.length;

  const existingFingerprints = new Set();
  for (const row of existingRes.rows) {
    const key = `${row.title.toLowerCase().trim()}:::${row.reference.toLowerCase().trim()}`;
    existingFingerprints.add(key);
    // Also track by exact title and exact verse
    existingFingerprints.add(`title:${row.title.toLowerCase().trim()}`);
  }

  // 2. Filter unique records from input batch
  const toInsert = [];
  const batchSeenFingerprints = new Set();

  for (const item of devotionals) {
    const key = `${item.title.toLowerCase().trim()}:::${item.reference.toLowerCase().trim()}`;
    const titleKey = `title:${item.title.toLowerCase().trim()}`;

    if (existingFingerprints.has(key) || existingFingerprints.has(titleKey) || batchSeenFingerprints.has(key)) {
      duplicatesSkipped++;
    } else {
      batchSeenFingerprints.add(key);
      toInsert.push(item);
    }
  }

  // 3. Batch insert unique new records
  if (toInsert.length > 0) {
    try {
      successfullyInserted = await MotivationRepository.bulkInsertMotivations(toInsert, 'published');
    } catch (err) {
      console.error('[Import Error] Batch insert failed:', err.message);
      failedRecords = toInsert.length;
    }
  }

  // 4. Verify final count in database
  const finalRes = await query('SELECT COUNT(*)::int as total FROM motivations');
  finalDbCount = finalRes.rows[0]?.total || 0;

  const report = {
    recordsSupplied: totalSupplied,
    successfullyInserted,
    duplicatesSkipped,
    invalidRecords: parseErrors.length,
    failedRecords,
    initialCount: initialDbCount,
    finalTotal: finalDbCount,
    parseErrors,
  };

  return report;
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const filePath = process.argv[2];
  importDevotionalsFromFile(filePath)
    .then((report) => {
      console.log('\n==================================================');
      console.log('       DAILY GRACE DEVOTIONAL IMPORT REPORT');
      console.log('==================================================');
      console.log(`Records supplied:                    ${report.recordsSupplied}`);
      console.log(`Successfully inserted:               ${report.successfullyInserted}`);
      console.log(`Duplicates skipped:                  ${report.duplicatesSkipped}`);
      console.log(`Invalid records:                     ${report.invalidRecords}`);
      console.log(`Failed records:                      ${report.failedRecords}`);
      console.log(`Initial motivations in database:     ${report.initialCount}`);
      console.log(`Final total motivations in database: ${report.finalTotal}`);
      console.log('==================================================\n');
      return closePool();
    })
    .catch((err) => {
      console.error('Import failed:', err);
      process.exit(1);
    });
}
