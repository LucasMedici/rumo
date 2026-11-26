import { importJobSchema } from '@rumo/contracts'
import { describe, expect, it } from 'vitest'
import { fieldErrorsFromApi, fieldErrorsFromZod } from './form-errors'

const valid = {
  title: 'Backend Engineer',
  companyName: 'Acme',
  description: 'Build APIs with Node.js and Postgres every day.',
}

function errorsFor(input: Record<string, unknown>) {
  const result = importJobSchema.safeParse(input)
  if (result.success) throw new Error('expected validation to fail')
  return fieldErrorsFromZod(result.error)
}

describe('fieldErrorsFromZod', () => {
  it('translates required fields to pt-BR', () => {
    expect(errorsFor({ title: '', companyName: '', description: '' })).toEqual({
      title: ['Informe o cargo.'],
      companyName: ['Informe a empresa.'],
      description: ['Cole a descrição da vaga (pelo menos 20 caracteres).'],
    })
  })

  it('explains invalid links and salary rules', () => {
    expect(
      errorsFor({
        ...valid,
        applyUrl: 'javascript:alert(1)',
        salaryMin: 10,
        salaryMax: 5,
        salaryCurrency: null,
        salaryPeriod: null,
      }),
    ).toEqual({
      applyUrl: ['Informe um link válido, começando com http:// ou https://.'],
      salaryMax: ['O máximo precisa ser maior ou igual ao mínimo.'],
      salaryCurrency: ['Escolha a moeda do salário.'],
      salaryPeriod: ['Escolha o período do salário.'],
    })
  })

  it('reports non-numeric salary', () => {
    expect(
      errorsFor({ ...valid, salaryMin: 'oito mil', salaryCurrency: 'BRL', salaryPeriod: 'month' }),
    ).toEqual({ salaryMin: ['Informe um número inteiro, sem centavos.'] })
  })
})

describe('fieldErrorsFromApi', () => {
  it('maps API validation details to fields', () => {
    expect(fieldErrorsFromApi([{ path: '/applyUrl', message: 'Invalid URL' }])).toEqual({
      applyUrl: ['Informe um link válido, começando com http:// ou https://.'],
    })
  })

  it('returns null when details are missing or unknown', () => {
    expect(fieldErrorsFromApi(undefined)).toBeNull()
    expect(fieldErrorsFromApi([{ message: 'no path' }])).toBeNull()
  })
})
