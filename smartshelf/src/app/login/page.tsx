'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { normalizePhone } from '@/lib/phone';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { isAuthenticated, loadFromStorage, setAuth } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, [loadFromStorage]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      setError('Please enter a valid phone number');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setAuth(data.token, data.user);

      if (data.user.mustChangePassword) {
        router.replace('/change-password');
      } else {
        router.replace('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-[#f7fafa]">
      {/* Animated glowing orbs */}
      <div className="fixed top-[-15%] left-[-5%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-[#14b8a6]/15 to-[#3b82f6]/10 blur-[120px] pointer-events-none animate-glow-1" />
      <div className="fixed bottom-[-15%] right-[-5%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-[#3b82f6]/12 to-[#14b8a6]/8 blur-[120px] pointer-events-none animate-glow-2" />

      <div
        className={`w-full max-w-sm space-y-6 relative z-10 transition-all duration-700 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="text-center">
          <div className="h-20 w-20 mx-auto mb-5 rounded-3xl shadow-lg bg-gradient-to-br from-primary to-[#2dd4bf] flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
            <span className="text-white text-3xl font-black relative" style={{ fontFamily: 'Manrope, sans-serif' }}>S</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#0f172a] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            SmartShelf
          </h1>
          <p className="text-[#64748b] font-medium mt-1">
            The Operating System for Community Pharmacies
          </p>
        </div>

        <Card className="glass-card rounded-3xl border-0 shadow-xl shadow-[rgba(20,184,166,0.08)]">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[#64748b] font-semibold text-sm">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="031 569 311"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="text-lg rounded-[14px] border-[rgba(15,23,42,0.1)] focus:border-primary h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#64748b] font-semibold text-sm">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="text-lg rounded-[14px] border-[rgba(15,23,42,0.1)] focus:border-primary h-12 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a]"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !phone || !password}
                className="w-full h-12 rounded-2xl font-bold text-base shadow-lg shadow-primary/20 transition-all duration-200 active:scale-[0.98]"
                size="lg"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Logging in...
                  </span>
                ) : (
                  'Log In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-[#94a3b8] font-medium">
          Secured with password authentication
        </p>
      </div>
    </div>
  );
}
