import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonPath = path.join(__dirname, '../data/motivations.json');

let loadedMotivations = [];
try {
  if (fs.existsSync(jsonPath)) {
    loadedMotivations = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  }
} catch (e) {
  console.warn('[Seed] Could not read motivations.json, using fallback sample:', e.message);
}

export const SAMPLE_MOTIVATIONS = loadedMotivations.length > 0 ? loadedMotivations : [
  {
    title: 'Peace Begins With God',
    verse: 'Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee.',
    reference: 'Isaiah 26:3',
    reflection: 'Inner peace begins when our minds remain focused on God. Trusting Him gives our hearts stability even when life is uncertain.',
    prayer: 'Lord, keep my mind stayed on You and fill me with perfect peace. Amen.',
    day_number: 1
  },
  {
    title: 'A Quiet Soul',
    verse: 'My soul, wait thou only upon God; for my expectation is from him.',
    reference: 'Psalm 62:5',
    reflection: 'Our hearts become restless when we place our expectations in people or circumstances. True peace comes from waiting on God.',
    prayer: 'Father, teach my soul to wait quietly upon You. Amen.',
    day_number: 2
  },
  {
    title: 'God Is My Refuge',
    verse: 'God is our refuge and strength, a very present help in trouble.',
    reference: 'Psalm 46:1',
    reflection: 'When life becomes overwhelming, God remains a safe place for the heart. Run to Him instead of allowing trouble to control your thoughts.',
    prayer: 'Lord, be my refuge whenever my heart feels troubled. Amen.',
    day_number: 3
  }
];

