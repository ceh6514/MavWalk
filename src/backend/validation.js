const { ValidationError } = require('./errors');

const getRequiredString = (value, fieldName) => {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} is required.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ValidationError(`${fieldName} is required.`);
  }

  return trimmed;
};

const parsePositiveInteger = (value, fieldName) => {
  if (value === null || value === undefined) {
    throw new ValidationError(`${fieldName} is required.`);
  }

  let numericValue;

  if (typeof value === 'number') {
    numericValue = value;
  } else if (typeof value === 'string') {
    if (!value.trim()) {
      throw new ValidationError(`${fieldName} is required.`);
    }

    numericValue = Number(value);
  } else {
    throw new ValidationError(`${fieldName} must be a positive integer.`);
  }

  if (!Number.isInteger(numericValue) || numericValue < 1) {
    throw new ValidationError(`${fieldName} must be a positive integer.`);
  }

  return numericValue;
};

const getOptionalString = (value) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
};

const handleError = (res, error, { logMessage, responseMessage, status = 500 }) => {
  if (error instanceof ValidationError) {
    return res.status(400).json({ message: error.message });
  }

  if (logMessage) {
    console.error(logMessage, error);
  } else {
    console.error(error);
  }

  return res.status(status).json({ message: responseMessage });
};

module.exports = {
  getRequiredString,
  parsePositiveInteger,
  getOptionalString,
  handleError,
};
