'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { AuthGuard } from '@/components/auth-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Upload, CheckCircle2, ArrowLeft, Building2, MapPin, Phone, User, Image as ImageIcon, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UploadButton } from '@/lib/uploadthing';

export default function SettingsPage() {
  const router = useRouter();
  const { token, user, setAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState('');
  const [avatar, setAvatar] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setName(data.name || '');
        setAddress(data.address || '');
        setLocation(data.location || '');
        setAvatar(data.avatar || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

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
      setAuth(token, updated);
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
            {user?.role === 'admin' ? 'Admin Settings' : 'Pharmacy Profile'}
          </h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-60">
            <Loader2 className="h-8 w-8 animate-spin text-[#0284c7]" />
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
                        background: '#0284c7',
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

            {/* Profile Fields */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pharmacy Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Pharmacy Name
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
              className="w-full h-12 rounded-xl bg-[#0284c7] hover:bg-[#0284c7]/90 shadow-md shadow-sky-100 gap-2 text-base font-bold"
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
