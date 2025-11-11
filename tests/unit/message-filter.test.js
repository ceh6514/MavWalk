const test = require('node:test');
const assert = require('node:assert/strict');

const { ValidationError } = require('../../src/backend/db');
const {
  sanitizeMessageContent,
  containsProhibitedContent,
  __test__,
} = require('../../src/backend/message-filter');

const {
  tokenize,
  normalizeMessage,
  matchesWithWildcards,
  containsWildcardMatch,
  squashRepeatedCharacters,
} = __test__;

test('sanitizeMessageContent trims and collapses whitespace', () => {
  const input = '  You are amazing!  Keep shining.  ';
  const sanitized = sanitizeMessageContent(input);
  assert.equal(sanitized, 'You are amazing! Keep shining.');
});

test('sanitizeMessageContent rejects obvious profanity', () => {
  assert.throws(
    () => sanitizeMessageContent('This is a FUCK!'),
    (error) => error instanceof ValidationError && /inappropriate/.test(error.message)
  );
});

test('sanitizeMessageContent rejects obfuscated profanity with spacing and punctuation', () => {
  assert.throws(
    () => sanitizeMessageContent('Friendly f * * k vibes'),
    (error) => error instanceof ValidationError
  );
});

test('sanitizeMessageContent rejects leetspeak profanity', () => {
  assert.throws(
    () => sanitizeMessageContent('Have a gr34t d4y you sh1t'),
    (error) => error instanceof ValidationError
  );
});

test('containsProhibitedContent handles repeated characters gracefully', () => {
  assert.equal(containsProhibitedContent('Nooo wayyy friend'), false);
});

test('containsProhibitedContent rejects profanity with repeated characters', () => {
  assert.equal(containsProhibitedContent('Get out you fuuuck!'), true);
  assert.equal(containsProhibitedContent('Stop being shiiiitty'), true);
});

test('tokenize normalizes characters and wildcards', () => {
  assert.deepEqual(tokenize('F!!!u***cK'), ['fiiu??ck']);
});

test('normalizeMessage converts special characters into analysis form', () => {
  assert.equal(normalizeMessage('b @ d### word'), 'b a d??? word');
});

test('matchesWithWildcards treats question marks as wildcards', () => {
  assert.equal(matchesWithWildcards('f??k', 'fuck'), true);
  assert.equal(matchesWithWildcards('snw?', 'snow'), false);
});

test('containsWildcardMatch scans entire string for wildcard matches', () => {
  assert.equal(containsWildcardMatch('friendlyf??kvibes', 'fuck'), true);
  assert.equal(containsWildcardMatch('upliftingwords', 'fuck'), false);
});

test('squashRepeatedCharacters collapses repeated runs to single characters', () => {
  assert.equal(squashRepeatedCharacters('heeellooo'), 'helo');
  assert.equal(squashRepeatedCharacters('no???way!!'), 'no?way!');
});
