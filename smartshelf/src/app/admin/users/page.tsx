'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { AuthGuard } from '@/components/auth-guard';
import { Plus, Trash2, ShieldCheck, User, Store } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { normalizePhone } from '@/lib/phone';
import type { AdminUser, Pharmacy } from '@/types';

export default function AdminUsersPage() {
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('pharmacist');
  const [newPharmacyId, setNewPharmacyId] = useState('');
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  async function loadUsers() {
    if (!token) return;
    setLoading(true);
    try {
      const fetches = [
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/pharmacies/me', { headers: { Authorization: `Bearer ${token}` } }),
      ];
      if (currentUser?.role === 'super_admin') {
        fetches.push(fetch('/api/admin/pharmacies', { headers: { Authorization: `Bearer ${token}` } }));
      }
      const results = await Promise.all(fetches);
      if (results[0].ok) setUsers(await results[0].json());
      if (results[1].ok) setPharmacy(await results[1].json());
      if (results[2]?.ok) setPharmacies(await results[2].json());
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setCreateError('');

    const normalizedPhone = normalizePhone(newPhone);
    if (!normalizedPhone) {
      setCreateError('Please enter a valid phone number');
      setCreating(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newName,
          phone: normalizedPhone,
          role: newRole,
          pharmacyId: newPharmacyId || undefined,
        }),
      });

      const text = await res.text();
      let data: { error?: string; user?: AdminUser } = {};
      try {
        data = JSON.parse(text);
      } catch {
        // leave data empty; use text below
      }
      if (!res.ok) throw new Error(data.error || text || 'Failed to create user');
      if (!data.user) throw new Error('Unexpected response from server');

      setUsers((prev) => [data.user!, ...prev]);
      setShowAddModal(false);
      setNewName('');
      setNewPhone('');
      setNewRole('pharmacist');
      setNewPharmacyId('');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error('Failed to delete user', err);
    }
    setDeleteId(null);
  }

  return (
    <AuthGuard>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-foreground text-3xl" style={{ fontSize: 28 }}>
            Manage Users
          </h1>
          <Button onClick={() => setShowAddModal(true)} size="icon">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {pharmacy && currentUser?.role === 'admin' && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Store className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-sm">{pharmacy.name}</p>
                <p className="text-xs text-muted-foreground">Pharmacy {pharmacy.address ? `- ${pharmacy.address}` : ''}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-lg">
            Loading...
          </div>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground text-lg">No users yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <Card key={u.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-foreground text-lg">
                        {u.name || 'Unnamed'}
                      </p>
                      {u.role === 'super_admin' ? (
                        <Badge variant="default" className="flex items-center gap-1 bg-purple-600">
                          <ShieldCheck className="h-3 w-3" /> Super Admin
                        </Badge>
                      ) : u.role === 'admin' ? (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <User className="h-3 w-3" /> Pharmacist
                        </Badge>
                      )}
                      {!u.verified && (
                        <span className="text-[10px] bg-warning text-white font-semibold px-2 py-0.5 rounded-full">Pending</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{u.phone}</p>
                  </div>
                  {currentUser?.id !== u.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(u.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete confirmation modal */}
        <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete User?</DialogTitle>
              <DialogDescription>This cannot be undone. They will lose access immediately.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button
                variant="destructive"
                onClick={() => deleteId && handleDelete(deleteId)}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add user modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>Create a new staff account. OTP will be sent to their WhatsApp.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Mohamed Kamara"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+23231569311"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  required
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  OTP and account notification sent here.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={newRole}
                  onChange={(e) => { setNewRole(e.target.value); setNewPharmacyId(''); }}
                  className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                >
                  <option value="pharmacist">Pharmacist</option>
                  {currentUser?.role === 'super_admin' && <option value="admin">Admin</option>}
                </select>
              </div>
              {currentUser?.role === 'super_admin' && (
                <div className="space-y-2">
                  <Label htmlFor="pharmacy">Pharmacy</Label>
                  <select
                    id="pharmacy"
                    value={newPharmacyId}
                    onChange={(e) => setNewPharmacyId(e.target.value)}
                    className="flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                  >
                    <option value="">Select a pharmacy...</option>
                    {pharmacies.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {pharmacies.length === 0 && (
                    <p className="text-xs text-destructive">No pharmacies exist. Create a pharmacy first.</p>
                  )}
                  {pharmacies.length > 0 && !newPharmacyId && (
                    <p className="text-xs text-destructive">You must select a pharmacy before creating a user.</p>
                  )}
                </div>
              )}
              {createError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                  <p className="text-sm text-destructive">{createError}</p>
                </div>
              )}
              <Button
                type="submit"
                disabled={creating || !newPhone || (currentUser?.role === 'super_admin' && !newPharmacyId)}
                className="w-full"
              >
                {creating ? 'Creating...' : 'Create User & Send OTP'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
