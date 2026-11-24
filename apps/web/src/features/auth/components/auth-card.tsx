import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  title: string
  description?: string
  footer?: React.ReactNode
  children: React.ReactNode
}

export function AuthCard({ title, description, footer, children }: Props) {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      {footer ? <p className="text-center text-muted-foreground text-sm">{footer}</p> : null}
    </div>
  )
}
