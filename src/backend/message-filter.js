const { ValidationError } = require('./errors');
const { clean } = require('./profanity');

const sanitizeMessageContent = (message) => {
  if (typeof message !== 'string') {
    throw new ValidationError('Message must be a string.');
  }

  const trimmed = message.trim();

  if (!trimmed) {
    throw new ValidationError('message is required.');
  }

  const collapsedWhitespace = trimmed.replace(/\s+/g, ' ');
  return clean(collapsedWhitespace);
};

module.exports = {
  sanitizeMessageContent,
};
