const { ValidationError } = require('./db');

const leetMap = new Map([
  ['0', 'o'],
  ['1', 'i'],
  ['2', 'z'],
  ['3', 'e'],
  ['4', 'a'],
  ['5', 's'],
  ['6', 'g'],
  ['7', 't'],
  ['8', 'b'],
  ['9', 'g'],
  ['@', 'a'],
  ['$', 's'],
  ['!', 'i'],
  ['+', 't'],
]);

const wildcardCharacters = new Set(['*', '?', '#', '%']);

const bannedWords = [
  'fuck',
  'shit',
  'bitch',
  'bastard',
  'dick',
  'pussy',
  'cunt',
  'asshole',
  'slut',
  'whore',
  'motherfucker',
  'faggot',
  'retard',
  'nigger',
].map((word) => word.toLowerCase());

const vowels = new Set(['a', 'e', 'i', 'o', 'u']);

const bannedVariants = new Set();

bannedWords.forEach((word) => {
  bannedVariants.add(word);

  const withoutVowels = word
    .split('')
    .filter((char) => !vowels.has(char))
    .join('');

  if (withoutVowels.length >= 3) {
    bannedVariants.add(withoutVowels);
  }
});

const bannedMatchers = Array.from(bannedVariants);

const normalizeCharacter = (char) => {
  if (leetMap.has(char)) {
    return leetMap.get(char);
  }

  if (wildcardCharacters.has(char)) {
    return '?';
  }

  if (char >= 'a' && char <= 'z') {
    return char;
  }

  return ' ';
};

const normalizeMessage = (message) =>
  message
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split('')
    .map((char) => normalizeCharacter(char))
    .join('');

const collapseRepeatedCharacters = (token) => token.replace(/(.)\1{2,}/g, '$1$1');

const squashRepeatedCharacters = (token) => token.replace(/(.)\1+/g, '$1');

const tokenize = (message) =>
  normalizeMessage(message)
    .split(/\s+/)
    .map((token) => collapseRepeatedCharacters(token))
    .filter(Boolean);

const matchesWithWildcards = (candidate, target) => {
  if (candidate.length !== target.length) {
    return false;
  }

  for (let i = 0; i < target.length; i += 1) {
    const char = candidate[i];
    const expected = target[i];

    if (char === expected || char === '?') {
      continue;
    }

    return false;
  }

  return true;
};

const containsWildcardMatch = (haystack, target) => {
  if (haystack.length < target.length) {
    return false;
  }

  for (let i = 0; i <= haystack.length - target.length; i += 1) {
    const candidate = haystack.slice(i, i + target.length);
    if (matchesWithWildcards(candidate, target)) {
      return true;
    }
  }

  return false;
};

const containsProhibitedContent = (message) => {
  const tokens = tokenize(message);

  if (tokens.length === 0) {
    return false;
  }

  const condensed = tokens.join('');
  const condensedSquashed = squashRepeatedCharacters(condensed);

  return bannedMatchers.some((word) =>
    tokens.some((token) => {
      if (token === word || matchesWithWildcards(token, word)) {
        return true;
      }

      const squashedToken = squashRepeatedCharacters(token);
      return (
        squashedToken === word
        || matchesWithWildcards(squashedToken, word)
      );
    })
    || containsWildcardMatch(condensed, word)
    || containsWildcardMatch(condensedSquashed, word)
  );
};

const sanitizeMessageContent = (message) => {
  if (typeof message !== 'string') {
    throw new ValidationError('Message must be a string.');
  }

  const trimmed = message.trim();

  if (!trimmed) {
    throw new ValidationError('message is required.');
  }

  if (containsProhibitedContent(trimmed)) {
    throw new ValidationError('Message contains inappropriate language.');
  }

  return trimmed.replace(/\s+/g, ' ');
};

module.exports = {
  sanitizeMessageContent,
  containsProhibitedContent,
  __test__: {
    tokenize,
    normalizeMessage,
    collapseRepeatedCharacters,
    matchesWithWildcards,
    containsWildcardMatch,
    squashRepeatedCharacters,
  },
};
