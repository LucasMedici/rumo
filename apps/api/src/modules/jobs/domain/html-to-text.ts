import { convert } from 'html-to-text'

const HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const

/**
 * Converts a job description in HTML into readable plain text: paragraphs and list items keep
 * their line breaks, links keep only their text (tracking URLs are noise), images are dropped.
 * Plain text is what we store and render, so third-party HTML is never rendered (no XSS).
 */
export function htmlToPlainText(html: string): string {
  const text = convert(html, {
    wordwrap: false,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' },
      { selector: 'ul', options: { itemPrefix: '• ' } },
      ...HEADINGS.map((selector) => ({ selector, options: { uppercase: false } })),
      { selector: 'table', format: 'dataTable', options: { uppercaseHeaderCells: false } },
    ],
  })

  return text
    .replace(/ /g, ' ') // non-breaking spaces used as "empty paragraphs"
    .replace(/[ \t]+$/gm, '') // trailing spaces
    .replace(/\n{3,}/g, '\n\n') // at most one blank line
    .trim()
}
