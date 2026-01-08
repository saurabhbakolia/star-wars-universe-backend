/**
 * Extract ID from SWAPI URL
 * Example: "https://swapi.info/api/people/1/" -> "1"
 */
export function extractIdFromUrl(url: string): string {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? match[1] : url.split('/').filter(Boolean).pop() || 'unknown';
}
