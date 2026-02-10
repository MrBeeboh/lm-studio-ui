/**
 * Model selection helpers: smallest-model detection for smart defaults.
 * Parses model names for size indicators (e.g. 7b, 8b, 13b, 70b).
 */

const SIZE_REGEX = /\d+[bB]/;

/**
 * Parse size from model name (e.g. "dolphin3.0-llama3.1-8b" -> 8, "qwen-4b-firstaid" -> 4).
 * @param {string} name - Model id/name
 * @returns {number} Size in billions, or Infinity if no match (treated as "large")
 */
export function parseSizeFromName(name) {
  if (typeof name !== 'string') return Infinity;
  const m = name.match(SIZE_REGEX);
  if (!m) return Infinity;
  return parseInt(m[0].replace(/[bB]/, ''), 10) || Infinity;
}

/**
 * Pick the smallest model from a list of model ids (by parsed size, then alphabetically).
 * @param {string[]} ids - Array of model id strings
 * @returns {string|null} Smallest model id, or null if list is empty
 */
export function findSmallestModel(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return null;
  const sorted = [...ids].sort((a, b) => {
    const sizeA = parseSizeFromName(a);
    const sizeB = parseSizeFromName(b);
    if (sizeA !== sizeB) return sizeA - sizeB;
    return (a || '').localeCompare(b || '');
  });
  return sorted[0];
}
