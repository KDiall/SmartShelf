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
  const [code, setCode] = useState('');
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
        const data = await res.json().catch(() => ({ error: 'Invalid OTP' }));
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
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-[#2dd4bf]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm space-y-6 relative z-10">
        <div className="text-center">
          <div className="h-20 w-20 mx-auto mb-5 rounded-3xl shadow-lg bg-gradient-to-br from-primary to-[#2dd4bf] flex items-center justify-center">
            <span className="text-white text-3xl font-black" style={{ fontFamily: 'Manrope, sans-serif' }}>S</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#0f172a] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Verify OTP
          </h1>
          <p className="text-[#64748b] font-medium mt-1">
            Code sent to {phone}
          </p>
        </div>

        <Card className="glass-card rounded-3xl border-0">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-[#64748b] font-semibold text-sm">6-Digit Code</Label>
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
                  className="text-center text-2xl tracking-[0.5em] rounded-xl border-[rgba(15,23,42,0.1)] focus:border-primary"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20"
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
