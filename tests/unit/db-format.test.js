const test = require('node:test');
const assert = require('node:assert/strict');

const { __test__ } = require('../../src/backend/db');

const { formatSql } = __test__;

test('formatSql replaces placeholders while preserving question marks inside strings', () => {
  const sql = "INSERT INTO messages (message, route_id) VALUES (?, ?) RETURNING id";
  const formatted = formatSql(sql, ['Need a buddy?', 12]);

  assert.equal(
    formatted,
    "INSERT INTO messages (message, route_id) VALUES ('Need a buddy?', 12) RETURNING id",
  );
});

test('formatSql ignores literal question marks when no parameters are provided', () => {
  const sql = "SELECT 'Are you on the way?' AS prompt";
  const formatted = formatSql(sql, []);

  assert.equal(formatted, sql);
});

test('formatSql throws when there are more parameters than placeholders', () => {
  assert.throws(() => formatSql('SELECT 1', [42]), /Too many parameters supplied/);
});

test('formatSql throws when there are fewer parameters than placeholders', () => {
  assert.throws(() => formatSql('SELECT ? as value', []), /Not enough parameters supplied/);
});

