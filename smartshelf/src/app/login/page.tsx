'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpFallback, setOtpFallback] = useState('');
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
    setOtpFallback('');

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      if (data.otpFallback) {
        setOtpFallback(data.otpFallback);
        setError(data.whapiError || 'WhatsApp unavailable');
        return;
      }

      router.push(`/verify?phone=${encodeURIComponent(phone.replace(/[^0-9]/g, ''))}`);
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
          <img src="/smartshelf-logo.png" alt="SmartShelf" className="h-16 w-16 mx-auto mb-4 rounded-2xl shadow-lg" />
          <h1 className="text-3xl font-extrabold text-primary" style={{ fontSize: 28 }}>
            SmartShelf
          </h1>
          <p className="text-muted-foreground mt-1" style={{ fontSize: 18 }}>
            Pharmacy Inventory OS
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+23276000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your WhatsApp number to receive a login code.
                </p>
              </div>

              {error && !otpFallback && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {otpFallback && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-amber-800 font-medium">WhatsApp unavailable</p>
                  <p className="text-xs text-amber-700">Use this OTP code to log in:</p>
                  <p className="text-3xl font-bold text-center text-amber-900 tracking-[0.3em]">{otpFallback}</p>
                  <p className="text-xs text-amber-600 text-center">Expires in 5 minutes</p>
                  <Button
                    onClick={() => router.push(`/verify?phone=${encodeURIComponent(phone.replace(/[^0-9]/g, ''))}`)}
                    className="w-full mt-2"
                    size="lg"
                  >
                    Enter OTP
                  </Button>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !phone}
                className="w-full"
                size="lg"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
