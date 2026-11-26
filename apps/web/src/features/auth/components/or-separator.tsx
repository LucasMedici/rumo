import { Separator } from '@/components/ui/separator'

export function OrSeparator({ label = 'ou' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Separator className="flex-1" />
      <span className="text-muted-foreground text-xs uppercase">{label}</span>
      <Separator className="flex-1" />
    </div>
  )
}
