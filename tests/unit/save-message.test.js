const test = require('node:test');
const assert = require('node:assert/strict');

const { saveMessage, ValidationError } = require('../../src/backend/db');

const buildMessage = (length) => 'x'.repeat(length);

test('saveMessage rejects messages longer than 280 characters', () => {
  const tooLongMessage = buildMessage(281);

  assert.throws(
    () =>
      saveMessage({
        message: tooLongMessage,
        startLocationName: undefined,
        destinationLocationName: undefined,
      }),
    (error) => {
      assert(error instanceof ValidationError);
      assert.equal(error.message, 'Message content must be 280 characters or fewer.');
      return true;
    }
  );
});
