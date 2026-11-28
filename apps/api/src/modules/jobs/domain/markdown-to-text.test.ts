import { describe, expect, it } from 'vitest'
import { markdownToPlainText } from './markdown-to-text.js'

describe('markdownToPlainText', () => {
  it('turns headings, emphasis and lists into readable text', () => {
    const md = [
      '### Sobre a empresa',
      '',
      'A **Mimix AI** desenvolve uma _plataforma_ de software.',
      '',
      '### Requisitos',
      '',
      '- Node.js',
      '- TypeScript',
    ].join('\n')

    expect(markdownToPlainText(md)).toBe(
      [
        'Sobre a empresa',
        '',
        'A Mimix AI desenvolve uma plataforma de software.',
        '',
        'Requisitos',
        '',
        '• Node.js',
        '• TypeScript',
      ].join('\n'),
    )
  })

  it('keeps link URLs (in community posts that is how you apply)', () => {
    expect(markdownToPlainText('Candidate-se [aqui](https://empresa.com/vaga)')).toBe(
      'Candidate-se aqui (https://empresa.com/vaga)',
    )
    expect(markdownToPlainText('Site: https://empresa.com')).toBe('Site: https://empresa.com')
  })

  it('drops GitHub issue-form placeholders, HTML comments and images', () => {
    const md =
      '### Faixa salarial\n\n_No response_\n\n<!-- preencha aqui -->\n\n![logo](https://x.com/logo.png)\n\nFim'
    expect(markdownToPlainText(md)).toBe('Faixa salarial\n\nFim')
  })

  it('never keeps raw HTML or scripts from the markdown', () => {
    const text = markdownToPlainText('Oi <b>tudo</b> bem<script>alert(1)</script>')
    expect(text).toBe('Oi tudo bem')
  })

  it('keeps single line breaks (GitHub style)', () => {
    expect(markdownToPlainText('Linha 1\nLinha 2')).toBe('Linha 1\nLinha 2')
  })
})
