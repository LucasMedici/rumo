'use client'

import {
  type CreateFeedInput,
  createFeedSchema,
  type Feed,
  githubIssuesConfigSchema,
  githubJobRepos,
  remotiveCategories,
  remotiveConfigSchema,
  type SourceKey,
  sourceKeys,
} from '@rumo/contracts'
import { useState } from 'react'
import type { z } from 'zod'
import { FormField } from '@/components/form/form-field'
import { FormMessage } from '@/components/form/form-message'
import { SelectField } from '@/components/form/select-field'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api-client'
import {
  GITHUB_REPO_LABELS,
  parseList,
  REMOTIVE_CATEGORY_LABELS,
  SOURCE_DESCRIPTIONS,
  SOURCE_LABELS,
} from '../format'

type FieldErrors = Record<string, string[] | undefined>

type Props = {
  /** Present when editing (the source can't change). */
  feed?: Feed
  submitLabel: string
  onSubmit: (input: CreateFeedInput) => Promise<unknown>
  onCancel: () => void
}

const listText = (value: unknown) => (Array.isArray(value) ? value.join(', ') : '')
const text = (value: unknown) => (typeof value === 'string' ? value : '')

export function FeedForm({ feed, submitLabel, onSubmit, onCancel }: Props) {
  const [sourceKey, setSourceKey] = useState<SourceKey>(
    (feed?.sourceKey as SourceKey | undefined) ?? 'github-issues',
  )
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string>()
  const [pending, setPending] = useState(false)
  const config = feed?.config ?? {}

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(undefined)

    const parsed = createFeedSchema.safeParse(
      readForm(new FormData(event.currentTarget), sourceKey),
    )
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }

    setErrors({})
    setPending(true)
    try {
      await onSubmit(parsed.data)
    } catch (error) {
      setFormError(
        error instanceof ApiError && error.code === 'VALIDATION_ERROR'
          ? 'Confira os campos da busca.'
          : 'Não foi possível salvar a busca agora. Tente novamente.',
      )
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
      <FormMessage error={formError} />

      {feed ? null : (
        <SelectField
          name="sourceKey"
          label="Fonte"
          value={sourceKey}
          onChange={(event) => setSourceKey(event.target.value as SourceKey)}
          options={sourceKeys.map((key) => ({ value: key, label: SOURCE_LABELS[key] ?? key }))}
          hint={SOURCE_DESCRIPTIONS[sourceKey]}
        />
      )}

      <FormField
        name="name"
        label="Nome da busca"
        markRequired
        placeholder={sourceKey === 'remotive' ? 'Ex.: TypeScript remoto' : 'Ex.: Backend BR'}
        defaultValue={feed?.name}
        errors={errors.name}
      />

      {sourceKey === 'remotive' ? (
        <>
          <SelectField
            name="category"
            label="Categoria"
            placeholder="Todas"
            defaultValue={text(config.category) || 'software-development'}
            options={remotiveCategories.map((value) => ({
              value,
              label: REMOTIVE_CATEGORY_LABELS[value] ?? value,
            }))}
            errors={errors.category}
          />
          <FormField
            name="search"
            label="Termo de busca"
            placeholder="Ex.: typescript"
            hint="A Remotive procura o termo no título e na descrição. Informe um termo, uma categoria ou os dois."
            defaultValue={text(config.search)}
            errors={errors.search}
          />
        </>
      ) : (
        <>
          <SelectField
            name="repo"
            label="Repositório"
            markRequired
            defaultValue={text(config.repo) || 'backend-br/vagas'}
            options={githubJobRepos.map((value) => ({
              value,
              label: GITHUB_REPO_LABELS[value] ?? value,
            }))}
            errors={errors.repo}
          />
          <FormField
            name="labels"
            label="Labels obrigatórias"
            placeholder="Ex.: Remoto, Pleno"
            hint="Separadas por vírgula. A vaga precisa ter todas. Deixe vazio para não filtrar."
            defaultValue={listText(config.labels)}
            errors={errors.labels}
          />
          <FormField
            name="keywords"
            label="Palavras-chave"
            placeholder="Ex.: node, typescript"
            hint="Separadas por vírgula. Basta uma aparecer no título, nas labels ou no texto."
            defaultValue={listText(config.keywords)}
            errors={errors.keywords}
          />
        </>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

function readForm(data: FormData, sourceKey: SourceKey) {
  const value = (key: string) => String(data.get(key) ?? '').trim()
  const optional = (key: string) => value(key) || undefined
  const name = value('name')

  if (sourceKey === 'remotive') {
    return {
      sourceKey,
      name,
      config: { search: optional('search'), category: optional('category') },
    }
  }
  return {
    sourceKey,
    name,
    config: {
      repo: value('repo'),
      labels: parseList(value('labels')),
      keywords: parseList(value('keywords')),
    },
  }
}

/** pt-BR messages for the few things that can go wrong in this form. */
function fieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {}
  for (const issue of error.issues) {
    const [first, second] = issue.path.map(String)
    const field = first === 'config' && second ? second : (first ?? 'form')
    const message =
      field === 'name'
        ? 'Dê um nome com pelo menos 2 caracteres.'
        : field === 'search' && issue.code === 'custom'
          ? 'Informe um termo de busca ou escolha uma categoria.'
          : field === 'search'
            ? 'O termo precisa ter entre 2 e 100 caracteres.'
            : field === 'labels'
              ? 'Use até 5 labels.'
              : field === 'keywords'
                ? 'Use até 10 palavras-chave, cada uma com pelo menos 2 caracteres.'
                : 'Valor inválido.'
    errors[field] ??= [message]
  }
  return errors
}

/** Edit keeps the source: send only name + config (validated by the source schema). */
export function toUpdateInput(input: CreateFeedInput) {
  const schema = input.sourceKey === 'remotive' ? remotiveConfigSchema : githubIssuesConfigSchema
  return { name: input.name, config: schema.parse(input.config) as Record<string, unknown> }
}
