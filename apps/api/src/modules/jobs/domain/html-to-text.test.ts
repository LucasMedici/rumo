import { describe, expect, it } from 'vitest'
import { htmlToPlainText } from './html-to-text.js'

describe('htmlToPlainText', () => {
  it('keeps paragraphs and bullet lists, drops tracking links and empty paragraphs', () => {
    const html = `<p><a href="https://lemon.io/x?utm_source=remotive&amp;utm_medium=job_ad">Lemon.io</a> helps companies hire engineers.</p>
<p> </p>
<p><strong>What you get</strong></p>
<ul style=""><li style="">Competitive rate</li><li><strong>Remote:</strong> work from anywhere</li></ul>
<p><strong> </strong></p>
<p>Apply now!</p>`

    expect(htmlToPlainText(html)).toBe(
      [
        'Lemon.io helps companies hire engineers.',
        '',
        'What you get',
        '',
        '• Competitive rate',
        '• Remote: work from anywhere',
        '',
        'Apply now!',
      ].join('\n'),
    )
  })

  it('drops scripts, styles and images entirely', () => {
    const html =
      '<p>Hi</p><script>alert(1)</script><style>p{color:red}</style><img src="x.png" alt="logo">'
    expect(htmlToPlainText(html)).toBe('Hi')
  })

  it('decodes entities and keeps headings in their original case', () => {
    expect(htmlToPlainText('<h2>About &amp; Benefits</h2><p>R&amp;D team</p>')).toBe(
      'About & Benefits\n\nR&D team',
    )
  })

  it('keeps line breaks from <br>', () => {
    expect(htmlToPlainText('<p>Line one<br>Line two</p>')).toBe('Line one\nLine two')
  })
})
