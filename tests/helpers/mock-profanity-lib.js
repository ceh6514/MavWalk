const createMockProfanityLibrary = ({ maskWithReplacement = true } = {}) => {
  const flagged = new Set();

  return {
    add(terms = []) {
      terms.forEach((term) => {
        if (term) {
          flagged.add(term);
        }
      });
    },
    check(text) {
      for (const term of flagged) {
        if (text.includes(term)) {
          return true;
        }
      }
      return false;
    },
    clean(text) {
      if (!maskWithReplacement) {
        return text;
      }

      let maskedText = text;
      flagged.forEach((term) => {
        const pattern = new RegExp(term, 'gi');
        maskedText = maskedText.replace(pattern, '[masked]');
      });
      return maskedText;
    },
  };
};

module.exports = {
  createMockProfanityLibrary,
};
