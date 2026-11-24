'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type Props = React.ComponentProps<typeof Input> & {
  name: string
  label: string
  errors?: string[] | undefined
  hint?: string
}

/**
 * Label + input + error/hint, wired for accessibility (aria-invalid, aria-describedby).
 * Password fields get a show/hide toggle.
 */
export function FormField({ name, label, errors, hint, type, className, ...inputProps }: Props) {
  const [revealed, setRevealed] = useState(false)
  const id = `field-${name}`
  const message = errors?.[0]
  const describedBy = message ? `${id}-error` : hint ? `${id}-hint` : undefined
  const isPassword = type === 'password'

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={message ? true : undefined}
          aria-describedby={describedBy}
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
            aria-controls={id}
          >
            {revealed ? <EyeOff /> : <Eye />}
          </Button>
        ) : null}
      </div>
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
