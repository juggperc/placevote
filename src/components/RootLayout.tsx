import { NavLink, Outlet } from 'react-router-dom';
import { MessageSquare, Network, Map, Vote, FileKey } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';

const CLERK_CONFIGURED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

/* Lazy-load Clerk components only when configured */
let UserButton: React.ComponentType<{ afterSignOutUrl?: string; appearance?: Record<string, unknown> }> | null = null;
let useOrganization: (() => { organization?: { name: string } | null }) | null = null;

if (CLERK_CONFIGURED) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const clerk = await import('@clerk/clerk-react');
  UserButton = clerk.UserButton;
  useOrganization = clerk.useOrganization;
}

const NAV_ITEMS = [
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/ontology', label: 'Ontology', icon: Network },
  { to: '/map', label: 'Map', icon: Map },
];

export default function RootLayout() {
  const org = useOrganization?.()?.organization;
  const stubOrg = useAppStore((s) => s.organization);
  const stubUser = useAppStore((s) => s.user);

  const orgName = org?.name ?? stubOrg?.name;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ─── Top Navigation Bar ─── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <nav className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          {/* Logo / Brand */}
          <NavLink
            to="/chat"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Vote className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Placevote
            </span>
          </NavLink>

          {/* Nav tabs */}
          <div className="flex items-center gap-1">
            {[
              ...NAV_ITEMS,
              ...(stubUser?.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: FileKey }] : [])
            ].map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                    {/* Active indicator */}
                    {isActive && (
                      <span className="absolute -bottom-[calc(0.5rem+1px)] left-3 right-3 h-0.5 rounded-full bg-primary" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Org & User */}
          <div className="flex items-center gap-3">
            {orgName && (
              <span className="hidden text-sm text-muted-foreground sm:inline-block">
                {orgName}
              </span>
            )}

            {/* Clerk UserButton when configured, fallback avatar when not */}
            {CLERK_CONFIGURED && UserButton ? (
              <UserButton
                afterSignOutUrl="/sign-in"
                appearance={{
                  elements: { avatarBox: 'h-8 w-8' },
                }}
              />
            ) : stubUser ? (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                title={stubUser.displayName}
              >
                {stubUser.displayName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
            ) : null}
          </div>
        </nav>
      </header>

      {/* ─── Page content ─── */}
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
