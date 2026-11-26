'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { FieldShell } from './field-shell'

type Props = React.ComponentProps<typeof Input> & {
  name: string
  label: string
  errors?: string[] | undefined
  hint?: string
  /** Shows a required marker on the label. */
  markRequired?: boolean
}

/** Text input field. Password fields get a show/hide toggle. */
export function FormField({
  name,
  label,
  errors,
  hint,
  type,
  className,
  required,
  markRequired,
  ...inputProps
}: Props) {
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'

  return (
    <FieldShell name={name} label={label} errors={errors} hint={hint} markRequired={markRequired}>
      {(a11y) => (
        <div className="relative">
          <Input
            {...a11y}
            name={name}
            type={isPassword && revealed ? 'text' : type}
            required={required}
            className={cn(isPassword && 'pr-10', className)}
            {...inputProps}
          />
          {isPassword ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute inset-y-0 right-1 my-auto text-muted-foreground hover:text-foreground"
              onClick={() => setRevealed((value) => !value)}
              aria-label={revealed ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={revealed}
              aria-controls={a11y.id}
            >
              {revealed ? <EyeOff /> : <Eye />}
            </Button>
          ) : null}
        </div>
      )}
    </FieldShell>
  )
}
