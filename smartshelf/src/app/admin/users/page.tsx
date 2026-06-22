'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { AuthGuard } from '@/components/auth-guard';
import { Plus, Trash2, ShieldCheck, User, Store, Users as UsersIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { cn } from '@/lib/utils';
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
      <div className="space-y-6">
        <div className="flex items-center justify-between entrance" style={{ animationDelay: '0ms' }}>
          <div>
            <h1 className="font-extrabold text-[#0f172a] text-2xl tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Manage Users
            </h1>
            <p className="text-sm text-[#64748b] font-medium mt-1">Add and manage staff accounts</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="h-10 w-10 rounded-2xl">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {pharmacy && currentUser?.role === 'admin' && (
          <Card className="glass-card rounded-2xl border-0 entrance" style={{ animationDelay: '50ms' }}>
            <CardContent className="p-4 flex items-center gap-3">
              <Store className="h-5 w-5 text-primary" />
              <div>
                <p className="font-bold text-sm text-[#0f172a]">{pharmacy.name}</p>
                <p className="text-xs text-[#64748b]">Pharmacy {pharmacy.address ? `- ${pharmacy.address}` : ''}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <Card className="glass-card rounded-3xl border-0 entrance" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-12 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <UsersIcon className="h-8 w-8 text-primary" />
              </div>
              <p className="text-[#0f172a] font-bold text-lg">No users yet</p>
              <p className="text-xs text-[#64748b] mt-2 font-medium">Tap the + button to add your first staff member.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {users.map((u, idx) => (
              <Card key={u.id} className="glass-card rounded-2xl border-0 entrance" style={{ animationDelay: `${idx * 60}ms` }}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                      'h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 font-bold text-sm',
                      u.role === 'super_admin' ? 'bg-purple-50 text-purple-600' : u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-[#f1f5f9] text-[#64748b]'
                    )}>
                      {(u.name || u.phone)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-[#0f172a] text-base truncate">
                          {u.name || 'Unnamed'}
                        </p>
                        {u.role === 'super_admin' ? (
                          <Badge variant="default" className="flex items-center gap-1 bg-purple-600 text-[10px] px-2 py-0.5">
                            <ShieldCheck className="h-3 w-3" /> Super Admin
                          </Badge>
                        ) : u.role === 'admin' ? (
                          <Badge variant="secondary" className="flex items-center gap-1 text-[10px] px-2 py-0.5">
                            <ShieldCheck className="h-3 w-3" /> Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1 text-[10px] px-2 py-0.5">
                            <User className="h-3 w-3" /> Pharmacist
                          </Badge>
                        )}
                        {!u.verified && (
                          <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-200">Pending</span>
                        )}
                      </div>
                      <p className="text-sm text-[#64748b] mt-0.5">{u.phone}</p>
                    </div>
                  </div>
                  {currentUser?.id !== u.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(u.id)}
                      className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10 shrink-0 ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete confirmation modal */}
        <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
          <DialogContent className="sm:max-w-sm rounded-3xl">
            <DialogHeader>
              <DialogTitle>Delete User?</DialogTitle>
              <DialogDescription>This cannot be undone. They will lose access immediately.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" className="rounded-2xl" />}>Cancel</DialogClose>
              <Button
                variant="destructive"
                onClick={() => deleteId && handleDelete(deleteId)}
                className="rounded-2xl"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add user modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="sm:max-w-md rounded-3xl">
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
                  className="rounded-[14px]"
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
                  className="text-lg rounded-[14px]"
                />
                <p className="text-xs text-[#64748b] font-medium">
                  OTP and account notification sent here.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-[#64748b] font-semibold text-sm">Role</Label>
                <select
                  id="role"
                  value={newRole}
                  onChange={(e) => { setNewRole(e.target.value); setNewPharmacyId(''); }}
                  className="flex h-10 w-full min-w-0 rounded-[14px] border border-[rgba(15,23,42,0.1)] bg-white px-3 py-1 text-sm font-medium text-[#0f172a] transition-colors outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                >
                  <option value="pharmacist">Pharmacist</option>
                  {currentUser?.role === 'super_admin' && <option value="admin">Admin</option>}
                </select>
              </div>
              {currentUser?.role === 'super_admin' && (
                <div className="space-y-2">
                  <Label htmlFor="pharmacy" className="text-[#64748b] font-semibold text-sm">Pharmacy</Label>
                  <select
                    id="pharmacy"
                    value={newPharmacyId}
                    onChange={(e) => setNewPharmacyId(e.target.value)}
                    className="flex h-10 w-full min-w-0 rounded-[14px] border border-[rgba(15,23,42,0.1)] bg-white px-3 py-1 text-sm font-medium text-[#0f172a] transition-colors outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                  >
                    <option value="">Select a pharmacy...</option>
                    {pharmacies.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {pharmacies.length === 0 && (
                    <p className="text-xs text-destructive font-medium">No pharmacies exist. Create a pharmacy first.</p>
                  )}
                  {pharmacies.length > 0 && !newPharmacyId && (
                    <p className="text-xs text-destructive font-medium">You must select a pharmacy before creating a user.</p>
                  )}
                </div>
              )}
              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
                  <p className="text-sm text-red-700 font-medium">{createError}</p>
                </div>
              )}
              <Button
                type="submit"
                disabled={creating || !newPhone || (currentUser?.role === 'super_admin' && !newPharmacyId)}
                className="w-full h-12 rounded-2xl font-bold text-base shadow-lg shadow-primary/20"
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
