import { Marked } from 'marked'
import { htmlToPlainText } from './html-to-text.js'

const markdown = new Marked({ gfm: true, breaks: true, async: false })

/**
 * Converts a Markdown job description (e.g. a GitHub issue) into plain text: Markdown → HTML
 * with a real parser, then the same HTML → text conversion used for every source. Links keep
 * their URL ("Apply here (https://...)") because in community posts that is how you apply.
 * Raw HTML inside the Markdown is also flattened to text (nothing is ever rendered as HTML).
 */
export function markdownToPlainText(source: string): string {
  const cleaned = source
    .replace(/\r\n?/g, '\n')
    .replace(/^\s*_No response_\s*$/gim, '') // empty field marker of GitHub issue forms
    .replace(/<!--[\s\S]*?-->/g, '') // template comments

  const html = markdown.parse(cleaned) as string
  return htmlToPlainText(html, { keepLinkUrls: true })
}
