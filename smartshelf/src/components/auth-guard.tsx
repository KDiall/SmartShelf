'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export function AuthGuard({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFromStorage();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration gate
    setIsLoading(false);
  }, [loadFromStorage]);

  // Re-validate the stored session against the server so stale tokens
  // (e.g. a user deleted after a database reseed) log out cleanly instead
  // of trapping the user on password screens with "User not found".
  useEffect(() => {
    if (isLoading || !isAuthenticated || !token) return;

    let cancelled = false;
    fetch('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401 || res.status === 404) {
          logout();
          router.replace('/login');
          return;
        }
        if (!res.ok) return;
        const me = await res.json();
        if (cancelled) return;
        if (JSON.stringify(me) !== JSON.stringify(user)) {
          setAuth(token, me);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isLoading, isAuthenticated, token, user, logout, router, setAuth]);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.mustChangePassword && pathname !== '/change-password') {
      router.push('/change-password');
    }
  }, [isLoading, isAuthenticated, user, pathname, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}
