import { Label } from '@/components/ui/label'

export type FieldA11y = {
  id: string
  'aria-invalid': true | undefined
  'aria-describedby': string | undefined
}

type Props = {
  name: string
  label: string
  errors?: string[] | undefined
  hint?: string | undefined
  /** Shows a required marker on the label (visual only; validation stays in the schema). */
  markRequired?: boolean | undefined
  className?: string
  /** Renders the control with the ids/aria attributes that link it to the label and messages. */
  children: (a11y: FieldA11y) => React.ReactNode
}

/** Label + control + error/hint, shared by every form field. */
export function FieldShell({
  name,
  label,
  errors,
  hint,
  markRequired,
  className,
  children,
}: Props) {
  const id = `field-${name}`
  const message = errors?.[0]
  const describedBy = message ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className={className ?? 'grid gap-2'}>
      <Label htmlFor={id}>
        {label}
        {markRequired ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {children({
        id,
        'aria-invalid': message ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {message ? (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {message}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-muted-foreground text-sm">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
