const test = require('node:test');
const assert = require('node:assert/strict');

const { ValidationError } = require('../../src/backend/db');
const {
  getRequiredString,
  parsePositiveInteger,
  getOptionalString,
  handleError,
} = require('../../src/backend/validation');

const createMockResponse = () => {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return payload;
    },
  };

  return res;
};

test('getRequiredString trims surrounding whitespace', () => {
  assert.equal(getRequiredString('  hello world  ', 'greeting'), 'hello world');
});

test('getRequiredString throws a ValidationError when the value is missing', () => {
  assert.throws(() => getRequiredString('   ', 'greeting'), ValidationError);
  assert.throws(() => getRequiredString(undefined, 'greeting'), ValidationError);
});

test('parsePositiveInteger accepts numeric and numeric string values', () => {
  assert.equal(parsePositiveInteger(42, 'answer'), 42);
  assert.equal(parsePositiveInteger(' 17 ', 'answer'), 17);
});

test('parsePositiveInteger rejects zero, negative, and non-numeric input', () => {
  assert.throws(() => parsePositiveInteger(0, 'quantity'), ValidationError);
  assert.throws(() => parsePositiveInteger(-3, 'quantity'), ValidationError);
  assert.throws(() => parsePositiveInteger('not-a-number', 'quantity'), ValidationError);
  assert.throws(() => parsePositiveInteger({}, 'quantity'), ValidationError);
});

test('getOptionalString trims strings and returns undefined when blank or not a string', () => {
  assert.equal(getOptionalString('  Maverick  '), 'Maverick');
  assert.equal(getOptionalString('   '), undefined);
  assert.equal(getOptionalString(null), undefined);
});

test('handleError converts ValidationError instances to 400 responses', () => {
  const res = createMockResponse();
  const error = new ValidationError('Email is required.');

  const payload = handleError(res, error, {
    logMessage: 'ignored',
    responseMessage: 'Server error',
  });

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { message: 'Email is required.' });
  assert.deepEqual(payload, { message: 'Email is required.' });
});

test('handleError logs unexpected errors and uses the provided response metadata', () => {
  const res = createMockResponse();
  const error = new Error('Boom');
  const originalConsoleError = console.error;
  const calls = [];
  console.error = (...args) => {
    calls.push(args);
  };

  try {
    const payload = handleError(res, error, {
      logMessage: 'Failed to process request',
      responseMessage: 'Unable to proceed',
      status: 503,
    });

    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, { message: 'Unable to proceed' });
    assert.deepEqual(payload, { message: 'Unable to proceed' });
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'Failed to process request');
    assert.strictEqual(calls[0][1], error);
  } finally {
    console.error = originalConsoleError;
  }
});
