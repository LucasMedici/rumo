'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useMe } from './use-me'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' })

export function MeCard() {
  const { data: me, isPending, isError } = useMe()

  if (isPending) {
    return <p className="text-muted-foreground text-sm">Carregando seu perfil…</p>
  }
  if (isError) {
    return (
      <p className="text-destructive text-sm">
        Não foi possível carregar seu perfil. Verifique se a API está no ar.
      </p>
    )
  }

  const firstName = me.name?.split(' ')[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Olá{firstName ? `, ${firstName}` : ''}!</CardTitle>
        <CardDescription>
          Sua conta está conectada à API do Rumo. Em breve, suas vagas aparecem aqui.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">E-mail</dt>
          <dd>{me.email}</dd>
          <dt className="text-muted-foreground">Membro desde</dt>
          <dd>{dateFormatter.format(new Date(me.createdAt))}</dd>
        </dl>
      </CardContent>
    </Card>
  )
}
