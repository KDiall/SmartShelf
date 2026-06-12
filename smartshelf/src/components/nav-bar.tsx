'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShieldAlert, RefreshCw, Pill, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

const nav = [
  { href: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/medicines', label: 'Medicines', Icon: Pill },
  { href: '/risks', label: 'Risks', Icon: ShieldAlert },
  { href: '/restock', label: 'Restock', Icon: RefreshCw },
];

export function NavBar() {
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);

  if (pathname === '/login' || pathname === '/verify') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-50">
      <div className="max-w-2xl mx-auto flex">
        {nav.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center py-3 text-xs transition-colors ${
              pathname === href
                ? 'text-green-600 font-semibold'
                : 'text-muted-foreground'
            }`}
          >
            <Icon className="h-5 w-5 mb-1" />
            {label}
          </Link>
        ))}
        <button
          onClick={logout}
          className="flex-1 flex flex-col items-center py-3 text-xs text-muted-foreground"
        >
          <LogOut className="h-5 w-5 mb-1" />
          Logout
        </button>
      </div>
    </nav>
  );
}
