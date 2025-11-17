const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  normalize,
  classify,
  clean,
  configureProfanityLibrary,
} = require('../../src/backend/profanity');
const { createMockProfanityLibrary } = require('../helpers/mock-profanity-lib');

const setupProfanity = (options) => {
  const library = createMockProfanityLibrary(options);
  configureProfanityLibrary(library, { extraTerms: ['maskedterm'] });
  return library;
};

test('normalize enforces Unicode, case, leetspeak, and repetition rules', () => {
  const normalized = normalize('Àw3s000me!!!');
  assert.equal(normalized, 'awesome');
});

test('normalize collapses spaced and obfuscated characters', () => {
  const spaced = normalize('M 4 5 k e d   t e r m!');
  assert.equal(spaced, 'maskedterm');

  const separators = normalize('f_u-u...cK!!');
  assert.equal(separators, 'fuck');

  const readable = normalize('Masked term');
  assert.equal(readable, 'masked term');
});

test('classify returns CLEAN for neutral input', () => {
  setupProfanity();
  const result = classify('Friendly greetings only');
  assert.deepEqual(result, { category: 'CLEAN' });
});

test('classify detects configured terms even when obfuscated', () => {
  setupProfanity();
  const result = classify('M45kedterm vibes');
  assert.equal(result.category, 'PROFANITY');
});

test('classify detects spaced-out profanity attempts', () => {
  setupProfanity();
  const result = classify('M 4 5 k e d   t e r m energy');
  assert.equal(result.category, 'PROFANITY');
});

test('clean masks content using the profanity library', () => {
  setupProfanity();
  const masked = clean('maskedterm celebration');
  assert.equal(masked, '[masked] celebration');
});

test('clean falls back to a generic mask if the library cannot alter the text', () => {
  setupProfanity({ maskWithReplacement: false });
  const masked = clean('M45kedterm celebration');
  assert.equal(masked, '[masked]');
});

test('profanity module does not embed local word lists', () => {
  const moduleSource = fs.readFileSync(
    path.join(__dirname, '../../src/backend/profanity.js'),
    'utf8'
  );
  assert.ok(!/bannedWords|forbiddenWords|blockedTerms/i.test(moduleSource));
});
