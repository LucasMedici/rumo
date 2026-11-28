'use client'

import {
  Briefcase,
  ChevronsUpDown,
  Compass,
  FileText,
  LogOut,
  Mic,
  Monitor,
  Moon,
  Search,
  Sun,
  Telescope,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { signOut } from '@/features/auth/actions'
import { useMe } from '@/features/identity/use-me'
import { type ThemePreference, useTheme } from '@/lib/theme'

const NAV = [
  { href: '/discover', label: 'Descobrir', icon: Telescope },
  { href: '/jobs', label: 'Minhas vagas', icon: Briefcase },
  { href: '/searches', label: 'Buscas', icon: Search },
]

/** Modules on the roadmap, shown so the hub structure is visible (not clickable yet). */
const UPCOMING = [
  { label: 'Currículos', icon: FileText },
  { label: 'Entrevistas', icon: Mic },
]

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/jobs" />} tooltip="Rumo">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Compass aria-hidden="true" />
              </span>
              <span className="font-semibold text-base text-foreground tracking-tight">Rumo</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {/* Reading the pathname is request-time data: active state streams in behind Suspense. */}
            <Suspense fallback={<NavItems pathname={null} />}>
              <ActiveNavItems />
            </Suspense>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Em breve</SidebarGroupLabel>
          <SidebarMenu>
            {UPCOMING.map(({ label, icon: Icon }) => (
              <SidebarMenuItem key={label}>
                <SidebarMenuButton aria-disabled="true" tooltip={`${label} (em breve)`}>
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function ActiveNavItems() {
  return <NavItems pathname={usePathname()} />
}

function NavItems({ pathname }: { pathname: string | null }) {
  return NAV.map(({ href, label, icon: Icon }) => {
    const active = pathname !== null && (pathname === href || pathname.startsWith(`${href}/`))
    return (
      <SidebarMenuItem key={href}>
        <SidebarMenuButton
          isActive={active}
          tooltip={label}
          render={<Link href={href} aria-current={active ? 'page' : undefined} />}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </SidebarMenuButton>
        {active ? <SidebarMenuBadge className="sr-only">página atual</SidebarMenuBadge> : null}
      </SidebarMenuItem>
    )
  })
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Automático', icon: Monitor },
]

function UserMenu() {
  const { data: me } = useMe()
  const { preference, setPreference } = useTheme()
  const displayName = me?.name ?? me?.email ?? 'Minha conta'

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" tooltip={displayName} />}
            className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-accent font-medium text-sidebar-accent-foreground text-xs">
              {initials(me?.name ?? me?.email)}
            </span>
            <span className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate font-medium text-sm">{displayName}</span>
              {me?.name ? (
                <span className="truncate text-muted-foreground text-xs">{me.email}</span>
              ) : null}
            </span>
            <ChevronsUpDown className="ml-auto" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="min-w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Tema</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={preference}
                onValueChange={(value) => setPreference(value as ThemePreference)}
              >
                {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <DropdownMenuRadioItem key={value} value={value}>
                    <Icon aria-hidden="true" />
                    {label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut aria-hidden="true" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function initials(nameOrEmail: string | undefined): string {
  if (!nameOrEmail) return '?'
  const parts =
    nameOrEmail
      .split('@')[0]
      ?.split(/[\s._-]+/)
      .filter(Boolean) ?? []
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}
