const { classify, clean } = require('../profanity');

const defaultGetText = (req) => req.body?.message;
const defaultSetMaskedText = (req, maskedText) => {
  if (req.body && typeof req.body === 'object') {
    req.body.message = maskedText;
  }
};

const createProfanityMiddleware = (options = {}) => {
  const {
    getText = defaultGetText,
    setMaskedText = defaultSetMaskedText,
    logger,
    onProfanity,
  } = options;

  return (req, res, next) => {
    const sourceText = typeof getText === 'function' ? getText(req, res) : undefined;

    if (typeof sourceText !== 'string') {
      req.profanityReview = { category: 'CLEAN' };
      if (typeof logger === 'function') {
        logger({ category: 'CLEAN', action: 'skipped' });
      }
      return next();
    }

    const classification = classify(sourceText);
    req.profanityReview = classification;

    if (classification.category === 'PROFANITY') {
      if (typeof onProfanity === 'function') {
        return onProfanity({ req, res, next, clean, classification });
      }

      const maskedText = clean(sourceText);
      if (typeof setMaskedText === 'function') {
        setMaskedText(req, maskedText);
      }

      if (typeof logger === 'function') {
        logger({ category: 'PROFANITY', action: 'masked' });
      }

      return next();
    }

    if (typeof logger === 'function') {
      logger({ category: 'CLEAN', action: 'passed' });
    }

    return next();
  };
};

module.exports = {
  createProfanityMiddleware,
};
