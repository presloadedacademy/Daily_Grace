import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateMotivationRecord } from '../src/utils/contentValidator.js';
import { parseAndValidateFile } from '../scripts/importMotivations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('DAILY GRACE Phase 4 — Content Validation & Bulk Import Tests', () => {
  /**
   * TEST 1 — Record Validation (Valid Case)
   */
  it('Test 1: Valid motivation record passes validation and is cleanly trimmed', () => {
    const raw = {
      title: '  Trust the Lord  ',
      verse: ' Trust in the Lord with all your heart... ',
      reference: ' Proverbs 3:5 ',
      reflection: ' Surrender your thoughts to God. ',
      prayer: ' Lord, guide me today. ',
    };

    const res = validateMotivationRecord(raw, 1);
    assert.equal(res.isValid, true);
    assert.equal(res.sanitized.title, 'Trust the Lord');
    assert.equal(res.sanitized.verse, 'Trust in the Lord with all your heart...');
    assert.equal(res.sanitized.reference, 'Proverbs 3:5');
    assert.equal(res.sanitized.reflection, 'Surrender your thoughts to God.');
    assert.equal(res.sanitized.prayer, 'Lord, guide me today.');
    assert.equal(res.errors.length, 0);
  });

  /**
   * TEST 2 — Record Validation (Missing / Empty Fields Rejection)
   */
  it('Test 2: Rejects records with missing or empty required fields', () => {
    const invalidRaw = {
      title: 'Incomplete Record',
      verse: '', // Empty
      reference: 'Romans 8:28',
      // reflection is missing
      prayer: '   ', // Whitespace only
    };

    const res = validateMotivationRecord(invalidRaw, 42);
    assert.equal(res.isValid, false);
    assert.equal(res.sanitized, null);
    assert.ok(res.errors.length >= 3, 'Must report errors for verse, reflection, and prayer');
  });

  /**
   * TEST 3 — JSON File Parsing & Mixed Dataset Validation
   */
  it('Test 3: Parses JSON file and correctly segregates valid vs invalid records', async () => {
    const tempFilePath = path.join(__dirname, '../data/test_mixed_sample.json');
    const testData = [
      {
        title: 'Valid One',
        verse: 'Verse 1 text.',
        reference: 'Genesis 1:1',
        reflection: 'Reflection 1.',
        prayer: 'Prayer 1.',
      },
      {
        title: '', // Invalid empty title
        verse: 'Verse 2 text.',
        reference: 'Genesis 1:2',
        reflection: 'Reflection 2.',
        prayer: 'Prayer 2.',
      },
      {
        title: 'Valid Two',
        verse: 'Verse 3 text.',
        reference: 'Genesis 1:3',
        reflection: 'Reflection 3.',
        prayer: 'Prayer 3.',
      },
    ];

    fs.writeFileSync(tempFilePath, JSON.stringify(testData, null, 2), 'utf8');

    try {
      const result = await parseAndValidateFile(tempFilePath);
      assert.equal(result.totalCount, 3);
      assert.equal(result.validRecords.length, 2);
      assert.equal(result.invalidCount, 1);
      assert.equal(result.errors.length, 1);
      assert.match(result.errors[0], /Record #2/);
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  });

  /**
   * TEST 4 — JSONL Streaming Support for Scalable Datasets
   */
  it('Test 4: Streams and validates JSONL format for massive datasets', async () => {
    const tempJsonlPath = path.join(__dirname, '../data/test_sample.jsonl');
    const lines = [
      JSON.stringify({
        title: 'Line One',
        verse: 'Verse 1',
        reference: 'Psalm 1:1',
        reflection: 'Reflection 1',
        prayer: 'Prayer 1',
      }),
      JSON.stringify({
        title: 'Line Two',
        verse: 'Verse 2',
        reference: 'Psalm 1:2',
        reflection: 'Reflection 2',
        prayer: 'Prayer 2',
      }),
    ];

    fs.writeFileSync(tempJsonlPath, lines.join('\n'), 'utf8');

    try {
      const result = await parseAndValidateFile(tempJsonlPath);
      assert.equal(result.totalCount, 2);
      assert.equal(result.validRecords.length, 2);
      assert.equal(result.invalidCount, 0);
    } finally {
      if (fs.existsSync(tempJsonlPath)) {
        fs.unlinkSync(tempJsonlPath);
      }
    }
  });

  /**
   * TEST 5 — Real Content File Structure Verification
   */
  it('Test 5: Verifies server/data/motivations.json contains 100% valid curated records', async () => {
    const mainDataPath = path.join(__dirname, '../data/motivations.json');
    assert.ok(fs.existsSync(mainDataPath), 'server/data/motivations.json must exist');

    const result = await parseAndValidateFile(mainDataPath);
    assert.ok(result.totalCount >= 5, 'Must have at least initial curated records');
    assert.equal(result.invalidCount, 0, 'Curated motivations file must have 0 validation errors');
    assert.equal(result.validRecords.length, result.totalCount);
  });
});
