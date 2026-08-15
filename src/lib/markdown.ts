export function parseMarkdownSections(markdown: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = markdown.split(/\r?\n/);
  let current = "_preamble";
  let buffer: string[] = [];

  const flush = () => {
    const content = buffer.join("\n").trim();
    if (content) {
      sections[current] = content;
    }
    buffer = [];
  };

  for (const line of lines) {
    const match = /^(#{1,3})\s+(.+)$/.exec(line);
    if (match) {
      flush();
      current = match[2].trim();
      continue;
    }
    buffer.push(line);
  }
  flush();
  return sections;
}

export function getSection(
  sections: Record<string, string>,
  names: string[],
): string | null {
  const normalized = Object.fromEntries(
    Object.entries(sections).map(([key, value]) => [key.toLowerCase(), value]),
  );
  for (const name of names) {
    const value = normalized[name.toLowerCase()];
    if (value) {
      return value;
    }
  }
  return null;
}
