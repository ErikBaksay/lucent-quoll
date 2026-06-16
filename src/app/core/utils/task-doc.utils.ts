export function getPlainTextFromDoc(node: unknown): string {
  const segments: string[] = [];
  collectText(node, segments);
  return segments.join(' ').replace(/\s+/g, ' ').trim();
}

function collectText(node: unknown, segments: string[]): void {
  if (!node || typeof node !== 'object') {
    return;
  }

  const record = node as Record<string, unknown>;
  const text = record['text'];

  if (typeof text === 'string' && text.trim()) {
    segments.push(text.trim());
  }

  const content = record['content'];
  if (Array.isArray(content)) {
    content.forEach((entry) => collectText(entry, segments));
  }
}
