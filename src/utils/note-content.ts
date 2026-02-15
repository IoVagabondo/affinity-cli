type NoteRecord = Record<string, unknown>;

export const truncateText = (value: unknown, maxChars: number): string => {
  if (typeof value !== 'string') return '';
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxChars) return compact;
  if (maxChars <= 3) return compact.slice(0, maxChars);
  return `${compact.slice(0, maxChars - 3)}...`;
};

export const withTruncatedNoteContent = (notes: NoteRecord[], maxChars = 300): NoteRecord[] =>
  notes.map((note) => ({
    ...note,
    ...(typeof note.content === 'string' ? { content: truncateText(note.content, maxChars) } : {})
  }));
