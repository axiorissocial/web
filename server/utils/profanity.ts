import leo from 'leo-profanity';

// initialize default dictionary
try {
  // load English dictionary explicitly
  // leo-profanity typings require a language parameter
  // If the dictionary is already loaded this will be a no-op
  (leo as any).loadDictionary('en');
} catch (err) {
  // ignore - leo-profanity may already be initialized or run in environments where loading is unnecessary
}

const list = () => leo.list();

// load high severity list from env or default empty
const HIGH_SEVERITY_RAW = process.env.HIGH_SEVERITY_PROFANITY || '';
const HIGH_SEVERITY_LIST = HIGH_SEVERITY_RAW.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

export const containsHighSeverity = (text?: string | null): boolean => {
  if (!text) return false;
  const lower = String(text).toLowerCase();
  // check direct presence first
  for (const bad of HIGH_SEVERITY_LIST) {
    if (!bad) continue;
    if (lower.includes(bad)) return true;
  }

  const compact = lower.replace(/[^a-z0-9]+/g, '');
  if (!compact) return false;
  for (const bad of HIGH_SEVERITY_LIST) {
    const cleanedBad = bad.replace(/[^a-z0-9]+/g, '');
    if (!cleanedBad) continue;
    if (compact.includes(cleanedBad)) return true;
  }
  return false;
};

export const containsProfanity = (text?: string | null): boolean => {
  if (!text) return false;
  try {
    return leo.check(String(text));
  } catch (err) {
    return false;
  }
};

// Strict check attempts to detect obfuscated/concatenated profanity by
// normalizing and searching for known bad-words as substrings.
export const containsProfanityStrict = (text?: string | null): boolean => {
  if (!text) return false;
  const lower = String(text).toLowerCase();
  if (containsProfanity(lower)) return true;

  const compact = lower.replace(/[^a-z0-9]+/g, '');
  if (!compact) return false;

  try {
    for (const bad of list()) {
      const cleanedBad = String(bad).toLowerCase().replace(/[^a-z0-9]+/g, '');
      if (!cleanedBad) continue;
      if (compact.includes(cleanedBad)) return true;
    }
  } catch (err) {
    // conservative fallback
    return false;
  }

  return false;
};

export const censor = (text?: string | null): string => {
  if (!text) return '';
  try {
    return leo.clean(String(text));
  } catch (err) {
    return String(text);
  }
};

export default {
  containsProfanity,
  containsProfanityStrict,
  censor,
};

// Less strict check for posts: allow a small allowlist (e.g., f-word) but block high-severity terms
export const containsProfanityForPosts = (text?: string | null): boolean => {
  if (!text) return false;
  const lower = String(text).toLowerCase();

  // If any high-severity word present, block
  if (containsHighSeverity(lower)) return true;

  // Build set of bad words matched in text
  const compact = lower.replace(/[^a-z0-9]+/g, ' ');
  const words = compact.split(/\s+/).filter(Boolean);
  const badSet = new Set(list().map(w => String(w).toLowerCase()));

  // Allowed mild expletives for posts (original variations only)
  // include base/original forms and common simple inflections
  const allowed = new Set([
    'fuck', 'fucks', 'fucked', 'fucking',
    'shit', 'shits', 'shitted', 'shitting',
    'bitch', 'bitches', 'bitching',
    'ass', 'asses', 'asshole',
    'damn', 'damned', 'damning',
    'crap', 'craps', 'crappy',
    'arse',
    'bloody',
    'hell'
  ]);

  for (const w of words) {
    if (badSet.has(w)) {
      if (allowed.has(w)) continue; // allow f-word variants
      return true;
    }
  }
  return false;
};
