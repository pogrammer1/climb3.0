type ModerationField = {
  label: string;
  value?: string | null;
};

export type ModerationResult = {
  allowed: boolean;
  field?: string;
};

const BLOCKED_TERMS = [
  'kill yourself',
  'kys',
  'nazi',
  'terrorist',
  'rape',
  'rapist',
];

const BLOCKED_SLURS = [
  'faggot',
  'retard',
  'tranny',
  'nigger',
  'chink',
];

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[@$!0]/g, (match) => {
      const replacements: Record<string, string> = {
        '@': 'a',
        '$': 's',
        '!': 'i',
        '0': 'o',
      };
      return replacements[match] || match;
    })
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const containsBlockedContent = (value: string): boolean => {
  const normalized = normalizeText(value);
  const compact = normalized.replace(/\s+/g, '');

  return BLOCKED_TERMS.some((term) => {
    const normalizedTerm = normalizeText(term);
    return new RegExp(`(^|\\s)${normalizedTerm}(\\s|$)`).test(normalized);
  }) ||
    BLOCKED_SLURS.some((term) => {
      const normalizedTerm = normalizeText(term);
      return new RegExp(`(^|\\s)${normalizedTerm}(\\s|$)`).test(normalized) ||
        compact === normalizedTerm;
    });
};

export const validateTextContent = (fields: ModerationField[]): ModerationResult => {
  const blockedField = fields.find((field) => {
    if (!field.value) {
      return false;
    }

    return containsBlockedContent(field.value);
  });

  if (blockedField) {
    return {
      allowed: false,
      field: blockedField.label,
    };
  }

  return { allowed: true };
};

export const getModerationErrorMessage = (field?: string): string => {
  const target = field ? `${field} ` : '';
  return `${target}contains language that cannot be posted. Please revise it and try again.`;
};
