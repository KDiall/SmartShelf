'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { normalizePhone } from '@/lib/phone';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { isAuthenticated, loadFromStorage } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
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
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      router.push(`/verify?phone=${encodeURIComponent(normalizedPhone)}${data.otp ? `&otp=${data.otp}` : ''}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Glow blobs */}
      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-[#2dd4bf]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm space-y-6 relative z-10">
        <div className="text-center">
          <div className="h-20 w-20 mx-auto mb-5 rounded-3xl shadow-lg bg-gradient-to-br from-primary to-[#2dd4bf] flex items-center justify-center">
            <span className="text-white text-3xl font-black" style={{ fontFamily: 'Manrope, sans-serif' }}>S</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#0f172a] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            SmartShelf
          </h1>
          <p className="text-[#64748b] font-medium mt-1">
            Pharmacy Inventory OS
          </p>
        </div>

        <Card className="glass-card rounded-3xl border-0">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[#64748b] font-semibold text-sm">WhatsApp Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+23231569311"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="text-lg rounded-xl border-[rgba(15,23,42,0.1)] focus:border-primary"
                />
                <p className="text-xs text-[#94a3b8] font-medium">
                  Enter your WhatsApp number to receive a login code.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !phone}
                className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-primary/20"
                size="lg"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-[#94a3b8] font-medium">
          Secure login via WhatsApp OTP
        </p>
      </div>
    </div>
  );
}
