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
import { Loader2, Save, CheckCircle2, ArrowLeft, Building2, MapPin, Phone, User, Image as ImageIcon, LogOut, ShieldCheck, Store as StoreIcon, MessageCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UploadButton } from '@/lib/uploadthing';
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
  const [whatsappStatus, setWhatsappStatus] = useState<{ connected: boolean; phoneNumber?: string | null; error?: string } | null>(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);

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
      setWhatsappStatus({ connected: false, error: err instanceof Error ? err.message : 'unknown error' });
    } finally {
      setWhatsappLoading(false);
    }
  }

  async function reconnectWhatsapp() {
    if (!token) return;
    setWhatsappLoading(true);
    try {
      const res = await fetch('/api/admin/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        await loadWhatsappStatus();
      } else {
        setWhatsappStatus({ connected: false, error: data.error || 'Reconnection failed' });
      }
    } catch (err) {
      setWhatsappStatus({ connected: false, error: err instanceof Error ? err.message : 'unknown error' });
    } finally {
      setWhatsappLoading(false);
    }
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
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl">
            <ArrowLeft className="h-6 w-6 text-muted-foreground" />
          </Button>
          <h1 className="font-bold text-foreground text-3xl tracking-tight">
            {user?.role === 'super_admin' ? 'Super Admin Settings' : user?.role === 'admin' ? 'Admin Settings' : 'Pharmacy Profile'}
          </h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-60">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Avatar */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-24 w-24 rounded-full bg-secondary/50 border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                    {avatar ? (
                      <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <UploadButton
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
                  />
                </div>
              </CardContent>
            </Card>

            {/* Role & Pharmacy Info */}
            <Card>
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

            {/* WhatsApp Connection */}
            {(user?.role === 'super_admin' || user?.role === 'admin') && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">WhatsApp Connection</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold text-sm">Status</p>
                        <p className="text-xs text-muted-foreground">
                          {whatsappLoading
                            ? 'Checking...'
                            : whatsappStatus
                            ? whatsappStatus.connected
                              ? `Connected (${whatsappStatus.phoneNumber || 'unknown'})`
                              : `Disconnected: ${whatsappStatus.error || 'not connected'}`
                            : 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={whatsappStatus?.connected ? 'default' : 'destructive'}>
                      {whatsappStatus?.connected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  {user?.role === 'super_admin' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={reconnectWhatsapp}
                      disabled={whatsappLoading}
                      className="w-full h-12 rounded-xl gap-2"
                    >
                      {whatsappLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                      {whatsappLoading ? 'Reconnecting...' : 'Reconnect WhatsApp Server'}
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    If disconnected, scan the QR code at the WhatsApp server connect page.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Profile Fields */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{user?.role === 'super_admin' ? 'Profile Information' : 'Pharmacy Information'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {user?.role === 'super_admin' ? 'Full Name' : 'Pharmacy Name'}
                    </div>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your pharmacy name"
                    className="rounded-xl"
                  />
                </div>

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
              </CardContent>
            </Card>

            <Button
              type="submit"
              disabled={saving}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 gap-2 text-base font-bold"
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
