import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { validateMotivationRecord } from '../src/utils/contentValidator.js';
import { MotivationRepository } from '../src/repositories/motivationRepository.js';
import { closePool, checkDbConnection } from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parses and validates a JSON file or JSONL stream.
 * @param {string} filePath Absolute or relative path to data file
 * @returns {Promise<{ validRecords: Array<Object>, totalCount: number, invalidCount: number, errors: Array<string> }>}
 */
export async function parseAndValidateFile(filePath) {
  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Content file not found at: ${resolvedPath}`);
  }

  const validRecords = [];
  const errors = [];
  let totalCount = 0;

  if (resolvedPath.endsWith('.jsonl')) {
    // Stream line by line for massive datasets (1,000,000+ records)
    const fileStream = fs.createReadStream(resolvedPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let lineNumber = 0;
    for await (const line of rl) {
      lineNumber++;
      const trimmed = line.trim();
      if (!trimmed) continue; // skip blank lines
      totalCount++;

      try {
        const item = JSON.parse(trimmed);
        const validation = validateMotivationRecord(item, lineNumber);
        if (validation.isValid) {
          validRecords.push(validation.sanitized);
        } else {
          errors.push(...validation.errors);
        }
      } catch (err) {
        errors.push(`Line #${lineNumber}: Invalid JSON syntax - ${err.message}`);
      }
    }
  } else {
    // Standard JSON array file
    const fileContent = fs.readFileSync(resolvedPath, 'utf8');
    let data;
    try {
      data = JSON.parse(fileContent);
    } catch (err) {
      throw new Error(`Failed to parse JSON file (${err.message}). Ensure the file contains valid JSON.`);
    }

    if (!Array.isArray(data)) {
      throw new Error('JSON content must be an array of motivation objects: [ { title, verse, ... }, ... ]');
    }

    totalCount = data.length;
    data.forEach((item, index) => {
      const validation = validateMotivationRecord(item, index + 1);
      if (validation.isValid) {
        validRecords.push(validation.sanitized);
      } else {
        errors.push(...validation.errors);
      }
    });
  }

  return {
    validRecords,
    totalCount,
    invalidCount: errors.length > 0 ? totalCount - validRecords.length : 0,
    errors,
  };
}

/**
 * Main import runner.
 */
export async function runImport(customFilePath = null) {
  const defaultPath = path.join(__dirname, '../data/motivations.json');
  const targetPath = customFilePath || process.argv[2] || defaultPath;

  console.log('\n================== DAILY GRACE CONTENT IMPORTER ==================');
  console.log(`Source File: ${targetPath}`);

  await checkDbConnection();

  try {
    const { validRecords, totalCount, invalidCount, errors } = await parseAndValidateFile(targetPath);

    console.log(`\nTotal records: ${totalCount}`);
    console.log(`Valid: ${validRecords.length}`);
    console.log(`Invalid: ${invalidCount}\n`);

    if (errors.length > 0) {
      console.log('--- Validation Errors (First 10) ---');
      errors.slice(0, 10).forEach((err) => console.log(`  ✗ ${err}`));
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more errors.`);
      }
      console.log('------------------------------------\n');
    }

    let importedCount = 0;
    if (validRecords.length > 0) {
      console.log(`Importing ${validRecords.length} records in batches...`);
      importedCount = await MotivationRepository.bulkInsertMotivations(validRecords);
      console.log(`Imported: ${importedCount}`);
    } else {
      console.log('Imported: 0 (No valid records to import)');
    }

    console.log(`Rejected: ${invalidCount}`);
    console.log('\nImport complete.');
    console.log('==================================================================\n');

    return {
      total: totalCount,
      valid: validRecords.length,
      invalid: invalidCount,
      imported: importedCount,
      errors,
    };
  } catch (err) {
    console.error(`\n[Import Error] ${err.message}`);
    throw err;
  } finally {
    await closePool();
  }
}

// Allow direct execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runImport()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
