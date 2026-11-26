'use client'

import {
  employmentTypes,
  type ImportJobInput,
  importJobSchema,
  type JobDetail,
  salaryPeriods,
  seniorities,
  workModes,
} from '@rumo/contracts'
import Link from 'next/link'
import { useState } from 'react'
import { FormField } from '@/components/form/form-field'
import { FormMessage } from '@/components/form/form-message'
import { SelectField } from '@/components/form/select-field'
import { TextareaField } from '@/components/form/textarea-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError } from '@/lib/api-client'
import { type FieldErrors, fieldErrorsFromApi, fieldErrorsFromZod } from '../form-errors'
import {
  COUNTRIES,
  CURRENCIES,
  countryName,
  EMPLOYMENT_TYPE_LABELS,
  SALARY_PERIOD_LABELS,
  SENIORITY_LABELS,
  WORK_MODE_LABELS,
} from '../format'

const NOT_INFORMED = 'Não informado'

const options = <T extends string>(values: readonly T[], labels: Record<T, string>) =>
  values.map((value) => ({ value, label: labels[value] }))

type Props = {
  /** Present when editing. */
  job?: JobDetail
  submitLabel: string
  pendingLabel: string
  cancelHref: string
  onSubmit: (input: ImportJobInput) => Promise<unknown>
}

/** Import/edit form. Validates with the same schema the API uses, then shows field errors in pt-BR. */
export function JobForm({ job, submitLabel, pendingLabel, cancelHref, onSubmit }: Props) {
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string>()
  const [pending, setPending] = useState(false)

  const countryOptions = [
    ...new Set([...COUNTRIES, ...(job?.countryCode ? [job.countryCode] : [])]),
  ]
    .map((code) => ({ value: code, label: countryName(code) }))
    .sort((a, b) => (a.value === 'BR' ? -1 : b.value === 'BR' ? 1 : a.label.localeCompare(b.label)))

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(undefined)

    const parsed = importJobSchema.safeParse(readForm(event.currentTarget))
    if (!parsed.success) {
      setErrors(fieldErrorsFromZod(parsed.error))
      return
    }

    setErrors({})
    setPending(true)
    try {
      await onSubmit(parsed.data)
    } catch (error) {
      const apiErrors = error instanceof ApiError ? fieldErrorsFromApi(error.details) : null
      if (apiErrors) setErrors(apiErrors)
      else setFormError('Não foi possível salvar a vaga agora. Tente novamente em instantes.')
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6" noValidate>
      <FormMessage error={formError} />

      <Card>
        <CardHeader>
          <CardTitle>Sobre a vaga</CardTitle>
          <CardDescription>Campos com * são obrigatórios.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField
            name="title"
            label="Cargo"
            markRequired
            placeholder="Ex.: Senior Backend Engineer"
            defaultValue={job?.title}
            errors={errors.title}
          />
          <FormField
            name="companyName"
            label="Empresa"
            markRequired
            placeholder="Ex.: Nubank"
            defaultValue={job?.company.name}
            errors={errors.companyName}
          />
          <div className="sm:col-span-2">
            <FormField
              name="applyUrl"
              label="Link da vaga"
              type="url"
              inputMode="url"
              placeholder="https://"
              hint="Onde a vaga foi publicada ou onde você se candidata."
              defaultValue={job?.applyUrl ?? undefined}
              errors={errors.applyUrl}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <SelectField
            name="workMode"
            label="Modalidade"
            placeholder={NOT_INFORMED}
            options={options(workModes, WORK_MODE_LABELS)}
            defaultValue={job?.workMode ?? ''}
            errors={errors.workMode}
          />
          <SelectField
            name="seniority"
            label="Senioridade"
            placeholder={NOT_INFORMED}
            options={options(seniorities, SENIORITY_LABELS)}
            defaultValue={job?.seniority ?? ''}
            errors={errors.seniority}
          />
          <SelectField
            name="employmentType"
            label="Tipo de contrato"
            placeholder={NOT_INFORMED}
            options={options(employmentTypes, EMPLOYMENT_TYPE_LABELS)}
            defaultValue={job?.employmentType ?? ''}
            errors={errors.employmentType}
          />
          <SelectField
            name="countryCode"
            label="País"
            placeholder={NOT_INFORMED}
            options={countryOptions}
            defaultValue={job?.countryCode ?? ''}
            errors={errors.countryCode}
          />
          <div className="sm:col-span-2">
            <FormField
              name="locationText"
              label="Localização"
              placeholder="Ex.: São Paulo, SP · Remote (Americas)"
              defaultValue={job?.locationText ?? undefined}
              errors={errors.locationText}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salário</CardTitle>
          <CardDescription>Opcional. Preencha o mínimo, o máximo ou os dois.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField
            name="salaryMin"
            label="Mínimo"
            inputMode="numeric"
            placeholder="Ex.: 8000"
            defaultValue={job?.salary?.min ?? undefined}
            errors={errors.salaryMin}
          />
          <FormField
            name="salaryMax"
            label="Máximo"
            inputMode="numeric"
            placeholder="Ex.: 12000"
            defaultValue={job?.salary?.max ?? undefined}
            errors={errors.salaryMax}
          />
          <SelectField
            name="salaryCurrency"
            label="Moeda"
            options={CURRENCIES.map((code) => ({ value: code, label: code }))}
            defaultValue={job?.salary?.currency ?? 'BRL'}
            errors={errors.salaryCurrency}
          />
          <SelectField
            name="salaryPeriod"
            label="Período"
            options={options(salaryPeriods, SALARY_PERIOD_LABELS)}
            defaultValue={job?.salary?.period ?? 'month'}
            errors={errors.salaryPeriod}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Descrição</CardTitle>
          <CardDescription>
            Cole o texto completo da vaga: responsabilidades, requisitos, benefícios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TextareaField
            name="description"
            label="Texto da vaga"
            markRequired
            rows={14}
            defaultValue={job?.description}
            errors={errors.description}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          size="lg"
          render={<Link href={cancelHref} />}
          nativeButton={false}
        >
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  )
}

/** Reads the form into the API shape: empty → null, numbers parsed, salary meta only with amounts. */
function readForm(form: HTMLFormElement) {
  const data = new FormData(form)
  const text = (key: string) => {
    const value = String(data.get(key) ?? '').trim()
    return value === '' ? null : value
  }
  const amount = (key: string) => {
    const value = text(key)
    if (value === null) return null
    const number = Number(value.replace(/[.\s]/g, '').replace(',', '.'))
    return Number.isFinite(number) ? number : value // non-numbers fail validation with a clear message
  }

  const salaryMin = amount('salaryMin')
  const salaryMax = amount('salaryMax')
  const hasSalary = salaryMin !== null || salaryMax !== null

  return {
    title: text('title') ?? '',
    companyName: text('companyName') ?? '',
    description: text('description') ?? '',
    applyUrl: text('applyUrl'),
    locationText: text('locationText'),
    countryCode: text('countryCode'),
    workMode: text('workMode'),
    seniority: text('seniority'),
    employmentType: text('employmentType'),
    salaryMin,
    salaryMax,
    salaryCurrency: hasSalary ? text('salaryCurrency') : null,
    salaryPeriod: hasSalary ? text('salaryPeriod') : null,
  }
}
