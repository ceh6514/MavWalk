const test = require('node:test');
const assert = require('node:assert/strict');

const {
  initializeDatabase,
  createWalkRequest,
  ValidationError,
} = require('../../src/backend/db');

test('createWalkRequest rejects identical start and destination locations', () => {
  initializeDatabase();

  assert.throws(
    () =>
      createWalkRequest({
        userId: 1,
        startLocationName: 'Central Library',
        destinationLocationName: 'Central Library',
      }),
    (error) => {
      assert(error instanceof ValidationError);
      assert.equal(error.message, 'Start and destination locations must be different.');
      return true;
    }
  );
});
