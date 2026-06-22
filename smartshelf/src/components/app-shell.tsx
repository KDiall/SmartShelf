'use client';
import { useState, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Pill, ShoppingCart, BarChart3, Menu, ChevronLeft, FileText, Loader2, AlertCircle, CheckCircle2, Settings, Store, Users } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { usePharmacyStore } from '@/store/pharmacy';
import { usePwa } from '@/hooks/use-pwa';
import { useSync } from '@/hooks/use-sync';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  Icon: typeof Home;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  tenantOnly?: boolean;
};

// tenantOnly: inventory/sales features hidden from the platform-only super admin.
// superAdminOnly: platform management features only the super admin sees.
const navItems: NavItem[] = [
  { href: '/', label: 'Home', Icon: Home, tenantOnly: true },
  { href: '/stock', label: 'Stock', Icon: Pill, tenantOnly: true },
  { href: '/orders', label: 'Orders', Icon: ShoppingCart, tenantOnly: true },
  { href: '/admin/pharmacies', label: 'Pharmacies', Icon: Store, superAdminOnly: true },
  { href: '/admin/users', label: 'Users', Icon: Users, adminOnly: true },
  { href: '/admin/guidelines', label: 'Guidelines', Icon: FileText, superAdminOnly: true },
  { href: '/more', label: 'Reports', Icon: BarChart3, tenantOnly: true },
  { href: '/settings', label: 'Settings', Icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const syncStatus = usePharmacyStore((s) => s.syncStatus);
  const isOnline = usePharmacyStore((s) => s.isOnline);
  const retrySync = usePharmacyStore((s) => s.retrySync);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard
    setMounted(true);
  }, []);

  usePwa();
  useSync();

  // Baseline must match server's pre-rendered HTML exactly
  const isAdmin = mounted && (user?.role === 'admin' || user?.role === 'super_admin');
  const isSuperAdmin = mounted && user?.role === 'super_admin';

  // The super admin is platform-only: keep them out of tenant (inventory/sales) pages.
  useEffect(() => {
    if (!isSuperAdmin) return;
    const allowed = pathname.startsWith('/admin') || pathname === '/settings';
    if (!allowed) {
      router.replace('/admin/pharmacies');
    }
  }, [isSuperAdmin, pathname, router]);

  const visibleNav = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.tenantOnly && isSuperAdmin) return false;
    return true;
  });

  const isAuthPage = pathname === '/login' || pathname === '/verify';

  if (isAuthPage) {
    return <>{children}</>;
  }

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed left-0 top-0 h-full bg-primary text-white z-50 transition-all duration-200 shadow-xl',
          sidebarCollapsed ? 'w-16' : 'w-60'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          {!sidebarCollapsed && (
            <Link href="/" className="flex items-center gap-2">
              <img src="/smartshelf-logo.png" alt="SmartShelf" className="h-8 w-8 rounded-lg" />
              <span className="font-bold text-lg">SmartShelf</span>
            </Link>
          )}
          {sidebarCollapsed && (
            <Link href="/" className="mx-auto">
              <img src="/smartshelf-logo.png" alt="SmartShelf" className="h-8 w-8 rounded-lg" />
            </Link>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-white/70 hover:text-white p-1"
          >
            <ChevronLeft className={cn('h-5 w-5 transition-transform', sidebarCollapsed && 'rotate-180')} />
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {visibleNav.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-xl transition-colors',
                  active
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                )}
                title={sidebarCollapsed ? label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span style={{ fontSize: 18 }}>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {!sidebarCollapsed && mounted && (
          <>
            <button
              onClick={retrySync}
              className="flex items-center gap-2 px-4 py-2 mx-3 mb-1 rounded-xl text-xs font-medium transition-colors"
            >
              {syncStatus === 'syncing' && <Loader2 className="h-3 w-3 animate-spin text-yellow-400" />}
              {syncStatus === 'error' && <AlertCircle className="h-3 w-3 text-red-400" />}
              {syncStatus === 'success' && <CheckCircle2 className="h-3 w-3 text-green-400" />}
              {syncStatus === 'idle' && isOnline && <span className="h-2 w-2 rounded-full bg-green-400" />}
              {syncStatus === 'idle' && !isOnline && <span className="h-2 w-2 rounded-full bg-red-400" />}
              {syncStatus === 'syncing' && <span className="text-yellow-400">Syncing...</span>}
              {syncStatus === 'error' && <span className="text-red-400">Sync failed — tap to retry</span>}
              {syncStatus === 'success' && <span className="text-green-400">Synced</span>}
              {syncStatus === 'idle' && isOnline && <span className="text-green-400/70">Connected</span>}
              {syncStatus === 'idle' && !isOnline && <span className="text-red-400">Offline</span>}
            </button>
              {user && (
              <div className="p-4 border-t border-white/10">
                <p className="text-sm text-white/60">{user.name || user.phone}</p>
                <p className="text-xs text-white/40 capitalize">{user.role === 'super_admin' ? 'Super Admin' : user.role}</p>
              </div>
            )}
          </>
        )}
      </aside>

      {/* Main content area */}
      <div className={cn('flex-1 transition-all duration-200', sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60')}>
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between h-14 px-4 max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <button
                  onClick={() => setMenuOpen(true)}
                  className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-muted"
                >
                  <Menu className="h-6 w-6 text-primary" />
                </button>
                <SheetContent side="left" className="w-72 bg-primary text-primary-foreground border-r-0 p-0">
                  <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <img src="/smartshelf-logo.png" alt="SmartShelf" className="h-8 w-8 rounded-lg" />
                      <span className="font-bold text-lg">SmartShelf</span>
                    </div>
                  </div>

                  <nav className="py-4 space-y-1 px-3">
                    {visibleNav.map(({ href, label, Icon }) => {
                      const active = isActive(href);
                      return (
                        <SheetClose key={href} render={<Link href={href} />} className={cn(
                          'flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors',
                          active
                            ? 'bg-white text-primary font-bold shadow-md'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                        )} style={{ fontSize: 18 }}>
                          <Icon className="h-5 w-5" />
                          {label}
                        </SheetClose>
                      );
                    })}
                  </nav>

                  <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
                    {mounted && user && (
                      <div className="mb-3 px-1">
                        <p className="text-sm text-white/80 font-medium">{user.name || 'Pharmacist'}</p>
                        <p className="text-xs text-white/50">{user.phone}</p>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              <Link href="/" className="flex items-center gap-2">
                <img src="/smartshelf-logo.png" alt="SmartShelf" className="h-7 w-7 rounded-lg" />
                <span className="font-bold text-lg text-primary hidden lg:inline">SmartShelf</span>
              </Link>
            </div>

            <OnlineIndicator />
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-6">
          {children}
          <div className="lg:hidden mobile-bottom-spacer" />
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white z-50 bottom-nav-shadow safe-area-bottom">
        <div className="flex items-center h-16">
          {visibleNav.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center h-full gap-0.5 text-xs font-semibold transition-colors',
                  active ? 'text-primary nav-active-pill' : 'text-muted-foreground'
                )}
              >
                <Icon className={cn('h-6 w-6', active ? 'text-primary' : 'text-muted-foreground')} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function OnlineIndicator() {
  const online = useSyncExternalStore(
    (callback) => {
      window.addEventListener('online', callback);
      window.addEventListener('offline', callback);
      return () => {
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
      };
    },
    () => navigator.onLine,
    () => true,
  );

  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full', online ? 'bg-success' : 'bg-destructive')} />
      <span className={cn('text-xs font-medium hidden lg:inline', online ? 'text-success' : 'text-destructive')}>
        {online ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}
