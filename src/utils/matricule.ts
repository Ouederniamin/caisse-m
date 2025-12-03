/**
 * Utility functions for Tunisian vehicle matricule (license plate) format
 * Format: 3 digits + "تونس" + 4 digits
 * Example: "260 تونس 8008"
 */

export const MATRICULE_REGEX = /^(\d{3})\s*تونس\s*(\d{4})$/;

/**
 * Validates if a matricule follows the Tunisian format
 * @param matricule The matricule string to validate
 * @returns true if valid, false otherwise
 */
export function isValidMatricule(matricule: string): boolean {
  if (!matricule || typeof matricule !== 'string') {
    return false;
  }
  return MATRICULE_REGEX.test(matricule.trim());
}

/**
 * Formats a matricule to the standard Tunisian format with proper spacing
 * @param matricule The matricule string (can be partially formatted)
 * @returns Formatted matricule or null if invalid
 */
export function formatMatricule(matricule: string): string | null {
  if (!matricule || typeof matricule !== 'string') {
    return null;
  }

  const cleaned = matricule.trim();
  const match = cleaned.match(MATRICULE_REGEX);

  if (!match) {
    return null;
  }

  const [, serie, unique] = match;
  return `${serie} تونس ${unique}`;
}

/**
 * Normalizes user input to try to create a valid matricule
 * Handles various input formats and attempts to correct them
 * @param input User input string
 * @returns Normalized matricule or null if cannot be normalized
 */
export function normalizeMatriculeInput(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Remove extra whitespace
  let normalized = input.trim().replace(/\s+/g, ' ');

  // If already valid, return as is
  if (isValidMatricule(normalized)) {
    return formatMatricule(normalized);
  }

  // Try to extract numbers and add تونس
  const numbers = normalized.match(/\d+/g);
  if (numbers && numbers.length >= 2) {
    const serie = numbers[0].padStart(3, '0').slice(-3);
    const unique = numbers[1].padStart(4, '0').slice(-4);
    return `${serie} تونس ${unique}`;
  }

  // Try to extract just one long number and split it
  const singleNumber = normalized.match(/\d{7,}/);
  if (singleNumber) {
    const digits = singleNumber[0];
    const serie = digits.slice(0, 3).padStart(3, '0');
    const unique = digits.slice(3, 7).padStart(4, '0');
    return `${serie} تونس ${unique}`;
  }

  return null;
}

/**
 * Generates a placeholder matricule (for testing/examples)
 * @returns A placeholder matricule string
 */
export function getPlaceholderMatricule(): string {
  return '238 تونس 8008';
}

/**
 * Compares matricules for equality (case-insensitive, whitespace-tolerant)
 * @param a First matricule
 * @param b Second matricule
 * @returns true if matricules are equal, false otherwise
 */
export function matriculesEqual(a: string, b: string): boolean {
  const formattedA = formatMatricule(a);
  const formattedB = formatMatricule(b);
  
  if (!formattedA || !formattedB) {
    return false;
  }
  
  return formattedA === formattedB;
}
