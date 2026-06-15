'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function VerifyForm() {
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const devOtp = searchParams.get('otp') || '';
  const [code, setCode] = useState(devOtp);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    if (!phone) {
      router.push('/login');
    }
  }, [phone, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Invalid OTP');
      }

      const data = await res.json();
      setAuth(data.token, data.user);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src="/smartshelf-logo.png" alt="SmartShelf" className="h-14 w-14 mx-auto mb-3 rounded-2xl shadow-md" />
          <h1 className="text-3xl font-bold text-primary" style={{ fontSize: 28 }}>
            Verify OTP
          </h1>
          <p className="text-muted-foreground mt-1" style={{ fontSize: 18 }}>
            Code sent to {phone}
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="code">6-Digit Code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="text-center text-2xl tracking-[0.5em]"
                />
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full"
                size="lg"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
