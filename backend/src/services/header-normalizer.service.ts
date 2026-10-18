export const normalizeHeader = (header: string): string => {
  if (!header) return '';
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

export const normalizeHeaders = (headers: string[]): string[] => {
  return headers.map(normalizeHeader);
};
