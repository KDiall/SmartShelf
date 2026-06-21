'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { AuthGuard } from '@/components/auth-guard';
import { Plus, Trash2, Store, Building2, Phone as PhoneIcon, Users, Pill, ShoppingCart, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

interface PharmacyWithCount {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  createdAt: string;
  _count: { users: number; medicines: number; sales: number };
}

export default function AdminPharmaciesPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);
  const [pharmacies, setPharmacies] = useState<PharmacyWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function loadPharmacies() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pharmacies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPharmacies(await res.json());
    } catch (err) {
      console.error('Failed to load pharmacies', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPharmacies();
  }, [token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/admin/pharmacies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName, phone: newPhone, adminName: newAdminName }),
      });
      const created = await res.json();
      if (!res.ok) throw new Error(created.error || 'Failed to create pharmacy');
      setPharmacies((prev) => [{ ...created, _count: { users: 1, medicines: 0, sales: 0 } }, ...prev]);
      setShowAddModal(false);
      setNewName('');
      setNewAdminName('');
      setNewPhone('');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create pharmacy');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/admin/pharmacies', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setPharmacies((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to delete pharmacy', err);
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  }

  if (currentUser?.role !== 'super_admin') {
    return (
      <AuthGuard>
        <div className="text-center py-20">
          <p className="text-lg font-bold text-muted-foreground">Access denied. Super Admin only.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-xl">
              <ArrowLeft className="h-6 w-6 text-muted-foreground" />
            </Button>
            <h1 className="font-bold text-foreground text-3xl">Pharmacies</h1>
          </div>
          <Button onClick={() => setShowAddModal(true)} size="icon">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground -mt-3">
          Manage all pharmacy branches. Each pharmacy has its own admin, staff, medicines, and sales.
        </p>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-lg">Loading...</div>
        ) : pharmacies.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Store className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-lg font-bold">No pharmacies yet</p>
              <p className="text-sm text-muted-foreground">Create your first pharmacy branch.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pharmacies.map((p) => (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Store className="h-5 w-5 text-primary" />
                        <h3 className="font-bold text-lg">{p.name}</h3>
                      </div>
                      {p.address && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 ml-7">
                          <Building2 className="h-3.5 w-3.5" /> {p.address}
                        </p>
                      )}
                      {p.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 ml-7">
                          <PhoneIcon className="h-3.5 w-3.5" /> {p.phone}
                        </p>
                      )}
                      <div className="flex gap-3 mt-3 ml-7">
                        <Badge variant="secondary" className="gap-1">
                          <Users className="h-3 w-3" /> {p._count.users} users
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <Pill className="h-3 w-3" /> {p._count.medicines} meds
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <ShoppingCart className="h-3 w-3" /> {p._count.sales} sales
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(p.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete confirmation */}
        <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Pharmacy?</DialogTitle>
              <DialogDescription>
                This will permanently delete this pharmacy and all associated data. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button
                variant="destructive"
                disabled={deleteLoading}
                onClick={() => deleteId && handleDelete(deleteId)}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add pharmacy modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Pharmacy Branch</DialogTitle>
              <DialogDescription>Enter the pharmacy name and the admin&apos;s WhatsApp number. The admin will use this number to log in.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Pharmacy Name *</Label>
                <Input id="name" placeholder="e.g. Main Branch" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminName">Admin Name</Label>
                <Input id="adminName" placeholder="e.g. Mohamed Kamara" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Admin WhatsApp Number *</Label>
                <Input id="phone" type="tel" placeholder="+23231569311" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} required />
                <p className="text-xs text-muted-foreground">The admin will log in with this number and receive their OTP here.</p>
              </div>
              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-700 font-medium">{createError}</p>
                </div>
              )}
              <Button type="submit" disabled={creating || !newName || !newPhone} className="w-full">
                {creating ? 'Creating...' : 'Create Pharmacy'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
