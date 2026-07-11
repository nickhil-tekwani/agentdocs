export interface MarkdownDocument {
  source: string;
  blocks: SourceBlock[];
}

export interface SourceBlock { startLine: number; endLine: number; source: string; }

export interface MarkdownValidation {
  valid: boolean;
  links: string[];
  errors: string[];
}

export function parseMarkdown(source: string): MarkdownDocument {
  const lines = source.split("\n");
  const blocks: SourceBlock[] = [];
  let start = 0;
  for (let index = 0; index <= lines.length; index += 1) {
    if (index === lines.length || (lines[index].trim() === "" && index > start)) {
      blocks.push({ startLine: start + 1, endLine: index + 1, source: lines.slice(start, index + 1).join("\n") });
      start = index + 1;
    }
  }
  return { source, blocks };
}

// Unchanged documents serialize byte-for-byte; editor adapters can replace source
// only after an intentional edit, avoiding whole-file formatting churn.
export function serializeMarkdown(document: MarkdownDocument): string {
  return document.source;
}

export function validateMarkdown(source: string): MarkdownValidation {
  const errors: string[] = [];
  const links = Array.from(source.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+['"][^'"]*['"])?\)/g), (match) => match[1]);
  const fences = source.match(/^\s*(```|~~~)/gm) ?? [];
  if (fences.length % 2 !== 0) errors.push("Unclosed fenced code block");
  if (source.includes("\u0000")) errors.push("Markdown contains a null byte");
  return { valid: errors.length === 0, links, errors };
}

export function validateRelativeLinks(source: string, knownPaths: Set<string>): string[] {
  const { links } = validateMarkdown(source);
  return links.filter((link) => {
    if (/^(https?:|mailto:|#)/.test(link)) return false;
    const path = decodeURIComponent(link.split("#", 1)[0]);
    return path.length > 0 && !knownPaths.has(path);
  });
}
