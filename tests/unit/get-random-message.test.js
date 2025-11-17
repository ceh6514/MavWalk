const test = require('node:test');
const assert = require('node:assert/strict');

const {
  initializeDatabase,
  saveMessage,
  getRandomMessage,
} = require('../../src/backend/db');

test('getRandomMessage returns a message matching the provided filters', () => {
  initializeDatabase();

  const messageText = `Encouragement ${Date.now()}`;

  saveMessage({
    message: messageText,
    startLocationName: 'Fine Arts Building',
    destinationLocationName: 'Arlington Hall',
    status: 'approved',
  });

  const result = getRandomMessage({
    startLocationName: 'Fine Arts Building',
    destinationLocationName: 'Arlington Hall',
  });

  assert(result);
  assert.equal(result.startLocation, 'Fine Arts Building');
  assert.equal(result.destination, 'Arlington Hall');
});

test('getRandomMessage returns null when no messages match the filters', () => {
  initializeDatabase();

  const result = getRandomMessage({
    startLocationName: 'Fine Arts Building',
    destinationLocationName: 'Nonexistent Destination',
  });

  assert.equal(result, null);
});
