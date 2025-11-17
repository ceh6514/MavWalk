const defaultLeetMap = new Map([
  ['0', 'o'],
  ['1', 'i'],
  ['3', 'e'],
  ['4', 'a'],
  ['5', 's'],
  ['7', 't'],
  ['@', 'a'],
  ['$', 's'],
]);

const replaceLeetCharacters = (text) =>
  text.replace(/[013457@$]/g, (char) => defaultLeetMap.get(char) ?? char);

const collapseRepeatingCharacters = (text) => text.replace(/([\p{L}\p{N}])\1+/gu, '$1');

const stripZeroWidthCharacters = (text) => text.replace(/[\u200b-\u200d\ufeff]/gu, '');

const removeInnerSeparators = (text) =>
  text.replace(/(?<=[\p{L}\p{N}])[^\p{L}\p{N}\s]+(?=[\p{L}\p{N}])/gu, '');

const replaceObfuscatingSeparators = (text) => text.replace(/[^\p{L}\p{N}\s]/gu, ' ');

const collapseWhitespace = (text) => text.replace(/\s+/g, ' ').trim();

const joinObfuscatedCharacters = (text) => {
  const tokens = text.split(/\s+/u).filter(Boolean);

  if (tokens.length === 0) {
    return '';
  }

  const singleCharPattern = /^[\p{L}\p{N}]$/u;
  const result = [];
  let buffer = [];

  const flushBuffer = () => {
    if (buffer.length === 0) {
      return;
    }

    if (buffer.length >= 3) {
      result.push(buffer.join(''));
    } else {
      result.push(...buffer);
    }

    buffer = [];
  };

  tokens.forEach((token) => {
    if (singleCharPattern.test(token)) {
      buffer.push(token);
      return;
    }

    flushBuffer();
    result.push(token);
  });

  flushBuffer();

  return result.join(' ');
};

const normalize = (text) => {
  if (typeof text !== 'string') {
    return '';
  }

  let normalized = text.normalize('NFKC').toLowerCase();
  normalized = normalized.normalize('NFD').replace(/\p{M}/gu, '');
  normalized = replaceLeetCharacters(normalized);
  normalized = stripZeroWidthCharacters(normalized);
  normalized = removeInnerSeparators(normalized);
  normalized = replaceObfuscatingSeparators(normalized);
  normalized = collapseRepeatingCharacters(normalized);
  normalized = collapseWhitespace(normalized);
  normalized = joinObfuscatedCharacters(normalized);
  return collapseWhitespace(normalized);
};

let profanityLibrary;

const parseTerms = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((term) => term.trim()).filter(Boolean);
  }

  return String(value)
    .split(',')
    .map((term) => term.trim())
    .filter(Boolean);
};

const applyRuntimeTerms = (library, source) => {
  const runtimeTerms = parseTerms(source)
    .map((term) => normalize(term))
    .filter(Boolean);

  if (runtimeTerms.length > 0 && typeof library.add === 'function') {
    library.add(runtimeTerms);
  }
};

const configureProfanityLibrary = (library, options = {}) => {
  if (!library || typeof library.check !== 'function' || typeof library.clean !== 'function') {
    throw new Error('A profanity library with check() and clean() methods is required.');
  }

  profanityLibrary = library;
  const { extraTerms } = options;
  applyRuntimeTerms(profanityLibrary, extraTerms ?? process.env.EXTRA_PROFANITY);
  return profanityLibrary;
};

const getProfanityLibrary = () => {
  if (!profanityLibrary) {
    try {
      const library = require('leo-profanity');
      configureProfanityLibrary(library);
    } catch (error) {
      throw new Error(
        'Profanity library is not configured. Install leo-profanity or call configureProfanityLibrary().',
        { cause: error }
      );
    }
  }

  return profanityLibrary;
};

const detectProfanity = (text) => {
  if (typeof text !== 'string') {
    return { normalized: '', detected: false };
  }

  const normalized = normalize(text);

  if (!normalized) {
    return { normalized, detected: false };
  }

  const library = getProfanityLibrary();
  const detected = Boolean(library.check(normalized));
  return { normalized, detected };
};

const classify = (text) => {
  const { detected } = detectProfanity(text);
  return {
    category: detected ? 'PROFANITY' : 'CLEAN',
  };
};

const clean = (text) => {
  if (typeof text !== 'string') {
    return text;
  }

  const { detected } = detectProfanity(text);

  if (!detected) {
    return text;
  }

  const library = getProfanityLibrary();
  const masked = library.clean(text);

  if (typeof masked === 'string' && masked !== text) {
    return masked;
  }

  return '[masked]';
};

module.exports = {
  normalize,
  classify,
  clean,
  configureProfanityLibrary,
};
