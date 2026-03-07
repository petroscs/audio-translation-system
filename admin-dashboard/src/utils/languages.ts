/**
 * Map of language code (e.g. ISO 639-1) to display name.
 * Unknown codes are returned as-is (optionally with code in parentheses).
 */
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  nl: 'Dutch',
  pl: 'Polish',
  tr: 'Turkish',
  vi: 'Vietnamese',
  th: 'Thai',
  id: 'Indonesian',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  fi: 'Finnish',
  el: 'Greek',
  he: 'Hebrew',
  uk: 'Ukrainian',
  ro: 'Romanian',
  hu: 'Hungarian',
  cs: 'Czech',
  sk: 'Slovak',
  bg: 'Bulgarian',
  hr: 'Croatian',
  sr: 'Serbian',
  sl: 'Slovenian',
  et: 'Estonian',
  lv: 'Latvian',
  lt: 'Lithuanian',
  mt: 'Maltese',
  ga: 'Irish',
  cy: 'Welsh',
  ca: 'Catalan',
  eu: 'Basque',
  gl: 'Galician',
};

export function getLanguageName(code: string): string {
  if (!code || !code.trim()) return '';
  const normalized = code.trim().toLowerCase();
  return LANGUAGE_NAMES[normalized] ?? code.trim();
}

export function getLanguageDisplay(code: string): string {
  const name = getLanguageName(code);
  if (!name) return '';
  const normalized = code.trim().toLowerCase();
  return LANGUAGE_NAMES[normalized] ? `${name} (${code.trim()})` : code.trim();
}
