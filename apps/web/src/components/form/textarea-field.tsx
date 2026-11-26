import { Textarea } from '@/components/ui/textarea'
import { FieldShell } from './field-shell'

type Props = React.ComponentProps<typeof Textarea> & {
  name: string
  label: string
  errors?: string[] | undefined
  hint?: string
  /** Shows a required marker on the label. */
  markRequired?: boolean
}

export function TextareaField({
  name,
  label,
  errors,
  hint,
  required,
  markRequired,
  ...textareaProps
}: Props) {
  return (
    <FieldShell name={name} label={label} errors={errors} hint={hint} markRequired={markRequired}>
      {(a11y) => <Textarea {...a11y} name={name} required={required} {...textareaProps} />}
    </FieldShell>
  )
}
