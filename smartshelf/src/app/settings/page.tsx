'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { AuthGuard } from '@/components/auth-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, CheckCircle2, ArrowLeft, Building2, MapPin, Phone, User, Image as ImageIcon, LogOut, ShieldCheck, Store as StoreIcon, MessageCircle, RefreshCw, Key } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UploadButton } from '@/lib/uploadthing';
import { Skeleton } from '@/components/ui/skeleton';
import type { Pharmacy } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState('');
  const [avatar, setAvatar] = useState('');
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<{ status: string; phone?: string | null; error?: string } | null>(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [whatsappQr, setWhatsappQr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch('/api/pharmacies/me', {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.ok ? r.json() : null),
    ])
      .then(([data, pharm]) => {
        setName(data.name || '');
        setAddress(data.address || '');
        setLocation(data.location || '');
        setAvatar(data.avatar || '');
        setPharmacy(pharm);
        if (data.role === 'super_admin' || data.role === 'admin') {
          loadWhatsappStatus();
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  // Poll status while bot is connecting so QR appears automatically
  useEffect(() => {
    const s = whatsappStatus?.status;
    if (!s || s === 'ready' || s === 'none' || s === 'failed' || s === 'disconnected') return;
    const interval = setInterval(loadWhatsappStatus, 3000);
    return () => clearInterval(interval);
  }, [whatsappStatus?.status]);

  // Fetch QR image whenever the bot is in qr_ready state
  useEffect(() => {
    if (whatsappStatus?.status !== 'qr_ready') { setWhatsappQr(null); return; }
    fetchWhatsappQr();
    const interval = setInterval(fetchWhatsappQr, 10_000);
    return () => clearInterval(interval);
  }, [whatsappStatus?.status]);

  async function loadWhatsappStatus() {
    if (!token) return;
    setWhatsappLoading(true);
    try {
      const res = await fetch('/api/admin/whatsapp', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setWhatsappStatus(data);
    } catch (err) {
      setWhatsappStatus({ status: 'disconnected', error: err instanceof Error ? err.message : 'unknown' });
    } finally {
      setWhatsappLoading(false);
    }
  }

  async function fetchWhatsappQr() {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/whatsapp?want=qr', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { const d = await res.json(); setWhatsappQr(d.qr); }
    } catch { /* QR not ready yet */ }
  }

  async function startWhatsappBot() {
    if (!token) return;
    setWhatsappLoading(true);
    try {
      const res = await fetch('/api/admin/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setWhatsappStatus({ status: 'initializing' });
      } else {
        setWhatsappStatus({ status: 'failed', error: data.error || 'Failed to start bot' });
      }
    } catch (err) {
      setWhatsappStatus({ status: 'failed', error: err instanceof Error ? err.message : 'unknown' });
    } finally {
      setWhatsappLoading(false);
    }
  }

  async function logoutWhatsappBot() {
    if (!token) return;
    setWhatsappLoading(true);
    try {
      await fetch('/api/admin/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'logout' }),
      });
      setWhatsappStatus({ status: 'none' });
      setWhatsappQr(null);
    } catch { /* ignore */ }
    finally { setWhatsappLoading(false); }
  }

  const logout = useAuthStore((s) => s.logout);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, address, location, avatar }),
      });
      const updated = await res.json();
      const currentUser = useAuthStore.getState().user;
      useAuthStore.setState({ user: { ...currentUser, ...updated } });
      localStorage.setItem('user', JSON.stringify({ ...currentUser, ...updated }));
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        router.push('/');
      }, 1500);
    } catch {
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center gap-3 entrance" style={{ animationDelay: '0ms' }}>
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl">
            <ArrowLeft className="h-6 w-6 text-muted-foreground" />
          </Button>
          <div>
            <h1 className="font-bold text-foreground text-2xl tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {user?.role === 'super_admin' ? 'Super Admin Settings' : user?.role === 'admin' ? 'Admin Settings' : 'Pharmacy Profile'}
            </h1>
            <p className="text-sm text-[#64748b] font-medium mt-0.5">Manage your profile and preferences</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-14 rounded-2xl" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Avatar */}
            <Card className="glass-card rounded-2xl border-0 entrance" style={{ animationDelay: '50ms' }}>
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-24 w-24 rounded-full bg-secondary/50 border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                    {avatar ? (
                      <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  {user?.role !== 'pharmacist' && <UploadButton
                    endpoint="medicineImageUploader"
                    input={{ token: localStorage.getItem('token') ?? '' }}
                    onClientUploadComplete={(res) => {
                      if (res?.[0]) {
                        setAvatar(res[0].ufsUrl ?? res[0].url);
                      }
                    }}
                    onUploadError={(error) => alert(`Upload failed: ${error.message}`)}
                    appearance={{
                      button: {
                        background: '#14b8a6',
                        borderRadius: '0.75rem',
                        height: '2.5rem',
                        color: '#fff',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                      },
                      allowedContent: { display: 'none' },
                    }}
                  />}
                </div>
              </CardContent>
            </Card>

            {/* Role & Pharmacy Info */}
            <Card className="glass-card rounded-2xl border-0 entrance" style={{ animationDelay: '100ms' }}>
              <CardHeader>
                <CardTitle className="text-lg">Account & Branch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold text-sm">Your Role</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {user?.role === 'super_admin' ? 'Super Admin (full access)' : user?.role === 'admin' ? 'Pharmacy Admin' : 'Pharmacist (sales only)'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={user?.role === 'super_admin' ? 'default' : user?.role === 'admin' ? 'secondary' : 'outline'}
                    className={user?.role === 'super_admin' ? 'bg-purple-600' : ''}>
                    {user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : 'Pharmacist'}
                  </Badge>
                </div>
                {pharmacy && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                      <StoreIcon className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold text-sm">{pharmacy.name}</p>
                      <p className="text-xs text-muted-foreground">{pharmacy.address || 'No address set'}</p>
                    </div>
                  </div>
                )}
                {!pharmacy && user?.role !== 'super_admin' && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 text-amber-800">
                    <Building2 className="h-5 w-5" />
                    <p className="text-sm font-medium">No pharmacy assigned — contact Super Admin</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* WhatsApp Bot — super_admin manages the shared bot number */}
            {user?.role === 'super_admin' && (
              <Card className="glass-card rounded-2xl border-0 entrance" style={{ animationDelay: '150ms' }}>
                <CardHeader>
                  <CardTitle className="text-lg">WhatsApp Bot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status row */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold text-sm">Bot Status</p>
                        <p className="text-xs text-muted-foreground">
                          {whatsappLoading
                            ? 'Checking...'
                            : whatsappStatus?.status === 'ready'
                            ? `Connected — ${whatsappStatus.phone || 'active'}`
                            : whatsappStatus?.status === 'qr_ready'
                            ? 'Waiting for QR scan...'
                            : whatsappStatus?.status === 'initializing' || whatsappStatus?.status === 'authenticating'
                            ? 'Connecting...'
                            : whatsappStatus?.error || 'Not connected'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={whatsappStatus?.status === 'ready' ? 'default' : 'destructive'}
                      className={whatsappStatus?.status === 'ready' ? 'bg-emerald-600' : ''}>
                      {whatsappStatus?.status === 'ready' ? 'Online' : 'Offline'}
                    </Badge>
                  </div>

                  {/* QR code — shown when bot is waiting to be scanned */}
                  {whatsappStatus?.status === 'qr_ready' && (
                    <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-dashed border-border">
                      {whatsappQr ? (
                        <>
                          <p className="text-sm font-semibold text-center">Scan with the bot phone</p>
                          <img src={whatsappQr} alt="WhatsApp QR" className="w-52 h-52 rounded-xl" />
                          <p className="text-xs text-muted-foreground text-center">
                            Open WhatsApp on the bot phone → Linked Devices → Link a device
                          </p>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating QR code...
                        </div>
                      )}
                    </div>
                  )}

                  {/* Connecting spinner */}
                  {(whatsappStatus?.status === 'initializing' || whatsappStatus?.status === 'authenticating') && (
                    <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {whatsappStatus.status === 'authenticating' ? 'Authenticating...' : 'Starting bot...'}
                    </div>
                  )}

                  {/* Start bot button */}
                  {(!whatsappStatus || whatsappStatus.status === 'none' || whatsappStatus.status === 'disconnected' || whatsappStatus.status === 'failed') && (
                    <Button
                      type="button"
                      onClick={startWhatsappBot}
                      disabled={whatsappLoading}
                      className="w-full h-12 rounded-xl gap-2 bg-[#25d366] hover:bg-[#1da851] text-white font-semibold"
                    >
                      {whatsappLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
                      {whatsappLoading ? 'Starting...' : 'Start WhatsApp Bot'}
                    </Button>
                  )}

                  {/* Reconnect / logout buttons when active */}
                  {whatsappStatus?.status === 'ready' && (
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={startWhatsappBot} disabled={whatsappLoading} className="flex-1 h-11 rounded-xl gap-2">
                        {whatsappLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Reconnect
                      </Button>
                      <Button type="button" variant="outline" onClick={logoutWhatsappBot} disabled={whatsappLoading} className="flex-1 h-11 rounded-xl gap-2 border-destructive/40 text-destructive hover:bg-destructive/5">
                        Logout Bot
                      </Button>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    This is the shared bot number. All pharmacies can message it for inventory and treatment queries. It also sends restock order notifications.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Profile Fields */}
            <Card className="glass-card rounded-2xl border-0 entrance" style={{ animationDelay: '200ms' }}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {user?.role === 'admin' ? 'Pharmacy Information' : 'Profile Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {user?.role === 'admin' ? 'Pharmacy Name' : 'Full Name'}
                    </div>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={user?.role === 'admin' ? 'Your pharmacy name' : 'Your name'}
                    className="rounded-xl"
                  />
                </div>

                {user?.role === 'admin' && (
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        Phone Number
                      </div>
                    </Label>
                    <Input
                      id="phone"
                      value={user?.phone || ''}
                      disabled
                      className="rounded-xl bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground">Used for login and WhatsApp orders</p>
                  </div>
                )}

                {user?.role !== 'super_admin' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="address">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          Address
                        </div>
                      </Label>
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Street, city, etc."
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          Location
                        </div>
                      </Label>
                      <Input
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Freetown, Sierra Leone"
                        className="rounded-xl"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Button
              type="submit"
              disabled={saving}
              className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 gap-2 text-base font-bold entrance"
              style={{ animationDelay: '250ms' }}
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>

            {saved && (
              <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#10b981] text-white px-8 py-4 rounded-2xl shadow-2xl font-bold animate-in zoom-in slide-in-from-bottom-10 z-50 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 shrink-0" />
                Profile saved successfully
              </div>
            )}
            {/* Admin links */}
            {user?.role === 'super_admin' && (
              <div className="border-t border-border pt-6">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/admin/pharmacies')}
                  className="w-full justify-start h-auto p-4 bg-primary/5 hover:bg-primary/10 rounded-2xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <StoreIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-primary text-lg">Manage Pharmacies</p>
                      <p className="text-sm text-muted-foreground">Create and manage all pharmacy branches</p>
                    </div>
                  </div>
                </Button>
              </div>
            )}

            {/* Change Password */}
            <div className="border-t border-border pt-6">
              <Button
                variant="ghost"
                onClick={() => router.push('/change-password')}
                className="w-full justify-start h-auto p-4 bg-primary/5 hover:bg-primary/10 rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Key className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-primary text-lg">Change Password</p>
                    <p className="text-sm text-muted-foreground">Update your account password</p>
                  </div>
                </div>
              </Button>
            </div>

            {/* Logout */}
            <div className="border-t border-border pt-6">
              <Button
                variant="ghost"
                onClick={() => { logout(); router.push('/login'); }}
                className="w-full justify-start h-auto p-4 bg-destructive/5 hover:bg-destructive/10 rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <LogOut className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-destructive text-lg">Log Out</p>
                    <p className="text-sm text-muted-foreground">Sign out of SmartShelf</p>
                  </div>
                </div>
              </Button>
            </div>
          </form>
        )}
      </div>
    </AuthGuard>
  );
}
