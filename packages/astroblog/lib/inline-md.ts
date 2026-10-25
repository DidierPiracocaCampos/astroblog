// Minimal inline Markdown for short frontmatter text (FAQ answers): **bold**, *emphasis*, `code` and
// [links](url). Everything else is escaped, so frontmatter HTML is shown as text, never injected.

const CODE = /`([^`]+)`/g;
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const BOLD = /\*\*(.+?)\*\*/g;
const EM = /\*(.+?)\*/g;
const SAFE_URL = /^(?:https?:|mailto:|\/|#)/i;

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** HTML for `s`: the four inline constructs above, the rest escaped. Unsafe link URLs keep only the text. */
export function inlineMarkdown(s: string): string {
  const codes: string[] = [];
  // Code spans are set aside first so their content is not formatted.
  const html = escapeHtml(s)
    .replace(CODE, (_m, c: string) => `\0${codes.push(`<code>${c}</code>`) - 1}\0`)
    .replace(LINK, (_m, text: string, url: string) => (SAFE_URL.test(url) ? `<a href="${url}">${text}</a>` : text))
    .replace(BOLD, '<strong>$1</strong>')
    .replace(EM, '<em>$1</em>');
  return html.replace(/\0(\d+)\0/g, (_m, i: string) => codes[Number(i)]);
}

/** Plain text of `s` with the inline Markdown removed (for JSON-LD). */
export function inlineText(s: string): string {
  return s.replace(CODE, '$1').replace(LINK, '$1').replace(BOLD, '$1').replace(EM, '$1');
}
