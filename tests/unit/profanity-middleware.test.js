const test = require('node:test');
const assert = require('node:assert/strict');

const { createProfanityMiddleware } = require('../../src/backend/middleware/profanity-middleware');
const { configureProfanityLibrary } = require('../../src/backend/profanity');
const { createMockProfanityLibrary } = require('../helpers/mock-profanity-lib');

const setupProfanity = (options) => {
  const library = createMockProfanityLibrary(options);
  configureProfanityLibrary(library, { extraTerms: ['maskedterm'] });
};

test('middleware masks profane input and records category', () => {
  setupProfanity();
  const logEntries = [];
  const middleware = createProfanityMiddleware({
    logger: (entry) => logEntries.push(entry),
  });

  const req = { body: { message: 'maskedterm moment' } };
  const res = {};
  let nextCalled = false;

  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(req.body.message, '[masked] moment');
  assert.deepEqual(req.profanityReview, { category: 'PROFANITY' });
  assert.equal(logEntries.at(-1).action, 'masked');
  assert.equal(logEntries.at(-1).category, 'PROFANITY');
  assert.equal(nextCalled, true);
});

test('middleware allows clean content to pass without changes', () => {
  setupProfanity();
  const logEntries = [];
  const middleware = createProfanityMiddleware({
    logger: (entry) => logEntries.push(entry),
  });

  const req = { body: { message: 'Encouraging words only' } };
  const res = {};
  let nextCalled = false;

  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(req.body.message, 'Encouraging words only');
  assert.deepEqual(req.profanityReview, { category: 'CLEAN' });
  assert.equal(logEntries.at(-1).action, 'passed');
  assert.equal(nextCalled, true);
});

test('middleware supports custom onProfanity handling', () => {
  setupProfanity({ maskWithReplacement: false });
  const actions = [];
  const middleware = createProfanityMiddleware({
    onProfanity: ({ req, res, next, classification }) => {
      actions.push(classification.category);
      res.reviewed = true;
      next();
    },
  });

  const req = { body: { message: 'M45kedterm alert' } };
  const res = {};
  let nextCalled = false;

  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(req.body.message, 'M45kedterm alert');
  assert.equal(res.reviewed, true);
  assert.deepEqual(actions, ['PROFANITY']);
  assert.equal(nextCalled, true);
});

test('middleware marks requests without text as clean', () => {
  setupProfanity();
  const logEntries = [];
  const middleware = createProfanityMiddleware({
    logger: (entry) => logEntries.push(entry),
  });

  const req = { body: {} };
  const res = {};
  let nextCalled = false;

  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.deepEqual(req.profanityReview, { category: 'CLEAN' });
  assert.equal(logEntries.at(-1).action, 'skipped');
  assert.equal(nextCalled, true);
});
