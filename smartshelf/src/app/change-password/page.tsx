'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { token, user, setAuth, logout } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!token) {
      router.replace('/login');
    }
  }, [token, router]);

  function validate(password: string): string | null {
    if (password.length < 6) return 'Minimum 6 characters';
    if (!/[0-9]/.test(password)) return 'At least one number';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!token) return;

    const validation = validate(newPassword);
    if (validation) {
      setError(validation);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        // The stored session points to a user that no longer exists (e.g.
        // after a database reseed) or the token is invalid. Log out instead
        // of trapping the user on this page.
        const sessionError =
          res.status === 404 ||
          (res.status === 401 && data.error !== 'Current password is incorrect');
        if (sessionError) {
          logout();
          router.replace('/login');
          return;
        }
        throw new Error(data.error || 'Failed to change password');
      }

      setAuth(data.token, data.user);
      setSuccess(true);
      setTimeout(() => router.replace('/'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (!token) return null;

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
          <div className="h-20 w-20 mx-auto mb-5 rounded-3xl shadow-lg bg-gradient-to-br from-primary to-[#2dd4bf] flex items-center justify-center">
            <span className="text-white text-3xl font-black" style={{ fontFamily: 'Manrope, sans-serif' }}>S</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#0f172a] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Change Password
          </h1>
          <p className="text-[#64748b] font-medium mt-1">
            {user?.mustChangePassword
              ? 'You must change your temporary password before continuing.'
              : 'Update your account password.'}
          </p>
        </div>

        <Card className="glass-card rounded-3xl border-0 shadow-xl shadow-[rgba(20,184,166,0.08)]">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-[#64748b] font-semibold text-sm">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrent ? 'text' : 'password'}
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="text-lg rounded-[14px] border-[rgba(15,23,42,0.1)] focus:border-primary h-12 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a]"
                    tabIndex={-1}
                  >
                    {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-[#64748b] font-semibold text-sm">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNew ? 'text' : 'password'}
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="text-lg rounded-[14px] border-[rgba(15,23,42,0.1)] focus:border-primary h-12 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a]"
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-[#94a3b8] font-medium">
                  Min 6 characters with at least one number.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[#64748b] font-semibold text-sm">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="text-lg rounded-[14px] border-[rgba(15,23,42,0.1)] focus:border-primary h-12 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a]"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <p className="text-sm text-emerald-700 font-medium">Password changed. Redirecting...</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || success || !currentPassword || !newPassword || !confirmPassword}
                className="w-full h-12 rounded-2xl font-bold text-base shadow-lg shadow-primary/20 transition-all duration-200 active:scale-[0.98]"
                size="lg"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  'Change Password'
                )}
              </Button>

              {!user?.mustChangePassword && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                  className="w-full rounded-2xl font-semibold text-[#64748b]"
                >
                  Cancel
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  logout();
                  router.replace('/login');
                }}
                className="w-full rounded-2xl font-semibold text-[#64748b]"
              >
                Log out
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
