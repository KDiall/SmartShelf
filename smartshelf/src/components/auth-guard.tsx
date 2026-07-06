'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export function AuthGuard({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFromStorage();
    setIsLoading(false);
  }, [loadFromStorage]);

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
