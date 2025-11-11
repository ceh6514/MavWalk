const test = require('node:test');
const assert = require('node:assert/strict');

const { ValidationError } = require('../../src/backend/errors');
const { sanitizeMessageContent } = require('../../src/backend/message-filter');
const { configureProfanityLibrary } = require('../../src/backend/profanity');
const { createMockProfanityLibrary } = require('../helpers/mock-profanity-lib');

const setupProfanity = (options) => {
  const library = createMockProfanityLibrary(options);
  configureProfanityLibrary(library, { extraTerms: ['maskedterm'] });
};

test('sanitizeMessageContent trims and collapses whitespace', () => {
  setupProfanity();
  const input = '  You are amazing!  Keep shining.  ';
  const sanitized = sanitizeMessageContent(input);
  assert.equal(sanitized, 'You are amazing! Keep shining.');
});

test('sanitizeMessageContent masks configured terms', () => {
  setupProfanity();
  const sanitized = sanitizeMessageContent('Sharing maskedterm energy');
  assert.equal(sanitized, 'Sharing [masked] energy');
});

test('sanitizeMessageContent falls back to generic mask if library cannot replace term', () => {
  setupProfanity({ maskWithReplacement: false });
  const sanitized = sanitizeMessageContent('Maskedterm magic');
  assert.equal(sanitized, '[masked]');
});

test('sanitizeMessageContent rejects non-string values', () => {
  setupProfanity();
  assert.throws(
    () => sanitizeMessageContent(42),
    (error) => error instanceof ValidationError && /Message must be a string/.test(error.message)
  );
});

test('sanitizeMessageContent rejects empty messages', () => {
  setupProfanity();
  assert.throws(
    () => sanitizeMessageContent('   '),
    (error) => error instanceof ValidationError && /required/.test(error.message)
  );
});
