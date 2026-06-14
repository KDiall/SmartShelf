'use client';
import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Pill, ShoppingCart, MoreHorizontal, Menu, LogOut, ChevronLeft, FileText } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { usePwa } from '@/hooks/use-pwa';
import { useSync } from '@/hooks/use-sync';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/stock', label: 'Stock', Icon: Pill },
  { href: '/orders', label: 'Orders', Icon: ShoppingCart },
  { href: '/admin/guidelines', label: 'Guidelines', Icon: FileText, adminOnly: true },
  { href: '/more', label: 'More', Icon: MoreHorizontal },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  usePwa();
  useSync();

  const isAuthPage = pathname === '/login' || pathname === '/verify';

  if (isAuthPage) {
    return <>{children}</>;
  }

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  }

  // Baseline must match server's pre-rendered HTML exactly
  const isAdmin = mounted && user?.role === 'admin';

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
          {navItems.map(({ href, label, Icon, adminOnly }) => {
            if (adminOnly && !isAdmin) return null;
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

        {!sidebarCollapsed && mounted && user && (
          <div className="p-4 border-t border-white/10">
            <p className="text-sm text-white/60">{user.name || user.phone}</p>
            <p className="text-xs text-white/40 capitalize">{user.role}</p>
          </div>
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
                    {navItems.map(({ href, label, Icon, adminOnly }) => {
                      if (adminOnly && !isAdmin) return null;
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
                    <button
                      onClick={() => {
                        logout();
                        router.push('/login');
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                      style={{ fontSize: 18 }}
                    >
                      <LogOut className="h-5 w-5" />
                      Log Out
                    </button>
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
          {navItems.map(({ href, label, Icon, adminOnly }) => {
            if (adminOnly && !isAdmin) return null;
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center h-full gap-0.5 text-xs font-semibold transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground'
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
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full', online ? 'bg-success' : 'bg-destructive')} />
      <span className={cn('text-xs font-medium hidden lg:inline', online ? 'text-success' : 'text-destructive')}>
        {online ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}
