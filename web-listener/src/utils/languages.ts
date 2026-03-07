/**
 * Map of language code (e.g. ISO 639-1) to display name.
 * Unknown codes are returned as-is.
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

/**
 * Map of language code to ISO 3166-1 alpha-2 country code (for flag images).
 * One representative country per language.
 */
const LANGUAGE_COUNTRY_CODE: Record<string, string> = {
  en: 'gb',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  pt: 'pt',
  ru: 'ru',
  zh: 'cn',
  ja: 'jp',
  ko: 'kr',
  ar: 'sa',
  hi: 'in',
  nl: 'nl',
  pl: 'pl',
  tr: 'tr',
  vi: 'vn',
  th: 'th',
  id: 'id',
  sv: 'se',
  da: 'dk',
  no: 'no',
  fi: 'fi',
  el: 'gr',
  he: 'il',
  uk: 'ua',
  ro: 'ro',
  hu: 'hu',
  cs: 'cz',
  sk: 'sk',
  bg: 'bg',
  hr: 'hr',
  sr: 'rs',
  sl: 'si',
  et: 'ee',
  lv: 'lv',
  lt: 'lt',
  mt: 'mt',
  ga: 'ie',
  cy: 'gb',
  ca: 'es',
  eu: 'es',
  gl: 'es',
};

export function getLanguageName(code: string): string {
  if (!code || !code.trim()) return '';
  const normalized = code.trim().toLowerCase();
  return LANGUAGE_NAMES[normalized] ?? code.trim();
}

/** Returns ISO 3166-1 alpha-2 country code for the language, or null if unknown. */
export function getLanguageCountryCode(code: string): string | null {
  if (!code || !code.trim()) return null;
  const normalized = code.trim().toLowerCase();
  return LANGUAGE_COUNTRY_CODE[normalized] ?? null;
}

