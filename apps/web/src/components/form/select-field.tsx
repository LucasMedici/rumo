import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FieldShell } from './field-shell'

type Option = { value: string; label: string }

type Props = Omit<React.ComponentProps<'select'>, 'children'> & {
  name: string
  label: string
  options: readonly Option[]
  /** Label of the empty option (value ""), e.g. "Não informado". Omit to require a choice. */
  placeholder?: string
  errors?: string[] | undefined
  hint?: string
  /** Shows a required marker on the label. */
  markRequired?: boolean
}

/** Native <select> styled like the shadcn Input (accessible and works with FormData). */
export function SelectField({
  name,
  label,
  options,
  placeholder,
  errors,
  hint,
  required,
  markRequired,
  className,
  ...selectProps
}: Props) {
  return (
    <FieldShell name={name} label={label} errors={errors} hint={hint} markRequired={markRequired}>
      {(a11y) => (
        <div className="relative">
          <select
            {...a11y}
            name={name}
            required={required}
            className={cn(
              'h-8 w-full appearance-none rounded-lg border border-input bg-transparent py-1 pr-8 pl-2.5 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30',
              className,
            )}
            {...selectProps}
          >
            {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute inset-y-0 right-2.5 my-auto size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      )}
    </FieldShell>
  )
}
