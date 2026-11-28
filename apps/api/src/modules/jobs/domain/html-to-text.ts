import { convert } from 'html-to-text'

const HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const

/**
 * Converts a job description in HTML into readable plain text: paragraphs and list items keep
 * their line breaks, images are dropped. Links keep only their text by default (tracking URLs are
 * noise); with `keepLinkUrls` they become "text (url)" — for sources whose links are how you apply.
 * Plain text is what we store and render, so third-party HTML is never rendered (no XSS).
 */
export function htmlToPlainText(
  html: string,
  { keepLinkUrls = false }: { keepLinkUrls?: boolean } = {},
): string {
  const text = convert(html, {
    wordwrap: false,
    selectors: [
      {
        selector: 'a',
        options: keepLinkUrls
          ? { hideLinkHrefIfSameAsText: true, linkBrackets: ['(', ')'] }
          : { ignoreHref: true },
      },
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
