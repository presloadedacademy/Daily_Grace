import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, closePool, checkDbConnection } from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function sync() {
  await checkDbConnection();
  const jsonPath = path.join(__dirname, '../data/motivations.json');
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  console.log(`Syncing day_number for ${json.length} records...`);
  let updatedCount = 0;

  for (const item of json) {
    const res = await query(
      `UPDATE motivations 
       SET day_number = $1 
       WHERE LOWER(title) = LOWER($2) AND LOWER(reference) = LOWER($3)`,
      [item.day_number, item.title.trim(), item.reference.trim()]
    );
    if (res.rowCount > 0) {
      updatedCount += res.rowCount;
    }
  }

  const countRes = await query(`SELECT COUNT(*)::int as count FROM motivations WHERE day_number IS NOT NULL`);
  console.log(`Updated ${updatedCount} rows. Total motivations with day_number: ${countRes.rows[0].count}`);
  await closePool();
}

sync().catch(err => {
  console.error(err);
  process.exit(1);
});
