'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { idb } from '@/lib/idb';
import { normalizePhone } from '@/lib/phone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';

function VerifyForm() {
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendIn, setResendIn] = useState(45);
  const [resendMsg, setResendMsg] = useState('');
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const submitTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Cooldown countdown for the resend button.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function handleResend() {
    if (resending || resendIn > 0) return;
    setResending(true);
    setResendMsg('');
    setError('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(phone) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to resend OTP');
      setResendMsg('A new code was sent via WhatsApp.');
      setResendIn(45);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  }

  useEffect(() => {
    if (!phone) {
      router.push('/login');
    }
  }, [phone, router]);

  // Auto-submit 300ms after all 6 digits entered
  useEffect(() => {
    if (code.length === 6 && !loading) {
      submitTimer.current = setTimeout(() => {
        (document.getElementById('verify-form') as HTMLFormElement)?.requestSubmit();
      }, 300);
    }
    return () => {
      if (submitTimer.current) clearTimeout(submitTimer.current);
    };
  }, [code, loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || code.length !== 6) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(phone), code }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Invalid OTP' }));
        throw new Error(data.error || 'Invalid OTP');
      }

      const data = await res.json();
      await Promise.all([idb.medicines.clear(), idb.sales.clear(), idb.pendingSales.clear()]);
      setAuth(data.token, data.user);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-[#f7fafa]">
      <div className="fixed top-[-15%] left-[-5%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-[#14b8a6]/15 to-[#3b82f6]/10 blur-[120px] pointer-events-none animate-glow-1" />
      <div className="fixed bottom-[-15%] right-[-5%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-[#3b82f6]/12 to-[#14b8a6]/8 blur-[120px] pointer-events-none animate-glow-2" />

      <div
        className={`w-full max-w-sm space-y-6 relative z-10 transition-all duration-700 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="text-center">
          <button onClick={() => router.push('/login')} className="mb-4 text-[#64748b] hover:text-[#0f172a] transition-colors">
            <ArrowLeft className="h-5 w-5 mx-auto" />
          </button>
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

        <Card className="glass-card rounded-3xl border-0 shadow-xl shadow-[rgba(20,184,166,0.08)]">
          <CardContent className="p-6">
            <form id="verify-form" onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-[#64748b] font-semibold text-sm text-center block">6-Digit Code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  required
                  autoFocus
                  className="text-center text-2xl tracking-[0.5em] rounded-[14px] border-[rgba(15,23,42,0.1)] focus:border-primary h-14"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full h-12 rounded-2xl font-bold text-base shadow-lg shadow-primary/20 transition-all duration-200 active:scale-[0.98]"
                size="lg"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  'Verify'
                )}
              </Button>

              {resendMsg && (
                <p className="text-sm text-emerald-600 font-medium text-center">{resendMsg}</p>
              )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || resendIn > 0}
                  className="text-sm font-semibold text-primary disabled:text-[#94a3b8] disabled:cursor-not-allowed"
                >
                  {resending
                    ? 'Sending...'
                    : resendIn > 0
                      ? `Resend code in ${resendIn}s`
                      : 'Resend code'}
                </button>
              </div>
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
        <div className="min-h-screen flex items-center justify-center bg-[#f7fafa]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
