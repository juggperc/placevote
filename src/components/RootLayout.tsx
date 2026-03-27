import { NavLink, Outlet } from 'react-router-dom';
import { MessageSquare, Network, Map, Vote, FileKey } from 'lucide-react';
import { useUser, useOrganization, UserButton, SignInButton } from '@clerk/clerk-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';

const CLERK_CONFIGURED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const NAV_ITEMS = [
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/ontology', label: 'Ontology', icon: Network },
  { to: '/map', label: 'Map', icon: Map },
];

function ClerkUserSection() {
  const { isSignedIn, isLoaded } = useUser();
  const { organization } = useOrganization();
  const stubOrg = useAppStore((s) => s.organization);

  if (!isLoaded) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />;
  }

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4">
          Sign In
        </button>
      </SignInButton>
    );
  }

  const orgName = organization?.name ?? stubOrg?.name;

  return (
    <div className="flex items-center gap-3">
      {orgName && (
        <span className="hidden text-sm text-muted-foreground sm:inline-block">
          {orgName}
        </span>
      )}
      <UserButton
        afterSignOutUrl="/sign-in"
        appearance={{
          elements: { avatarBox: 'h-8 w-8' },
        }}
      />
    </div>
  );
}

function StubUserSection() {
  const stubUser = useAppStore((s) => s.user);
  const stubOrg = useAppStore((s) => s.organization);

  return (
    <div className="flex items-center gap-3">
      {stubOrg?.name && (
        <span className="hidden text-sm text-muted-foreground sm:inline-block">
          {stubOrg.name}
        </span>
      )}
      {stubUser && (
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
      )}
    </div>
  );
}

function AdminNavLink() {
  const { user } = useUser();
  const stubUser = useAppStore((s) => s.user);
  const isAdmin = user?.publicMetadata?.role === 'admin' || stubUser?.role === 'admin';
  
  if (!isAdmin) return null;
  
  return (
    <NavLink
      to="/admin"
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
          <FileKey className="h-4 w-4" />
          <span>Admin</span>
          {isActive && (
            <span className="absolute -bottom-[calc(0.5rem+1px)] left-3 right-3 h-0.5 rounded-full bg-primary" />
          )}
        </>
      )}
    </NavLink>
  );
}

export default function RootLayout() {
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
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
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
                    {isActive && (
                      <span className="absolute -bottom-[calc(0.5rem+1px)] left-3 right-3 h-0.5 rounded-full bg-primary" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
            {CLERK_CONFIGURED && <AdminNavLink />}
            {!CLERK_CONFIGURED && useAppStore.getState().user?.role === 'admin' && (
              <NavLink
                to="/admin"
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
                    <FileKey className="h-4 w-4" />
                    <span>Admin</span>
                    {isActive && (
                      <span className="absolute -bottom-[calc(0.5rem+1px)] left-3 right-3 h-0.5 rounded-full bg-primary" />
                    )}
                  </>
                )}
              </NavLink>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User section */}
          {CLERK_CONFIGURED ? <ClerkUserSection /> : <StubUserSection />}
        </nav>
      </header>

      {/* ─── Page content ─── */}
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}