'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { AuthGuard } from '@/components/auth-guard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2, AlertCircle, Loader2, FileUp, Trash2 } from 'lucide-react';
import { UploadDropzone } from '@/lib/uploadthing';

export default function GuidelinesPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [managedGuidelines, setManagedGuidelines] = useState<{
    id: string; name: string; url: string; status: string;
    userId: string | null; createdAt: string; updatedAt: string;
  }[]>([]);

  async function loadGuidelines() {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/guidelines', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setManagedGuidelines(await res.json());
    } catch (err) {
      console.error('Failed to load guidelines', err);
    }
  }

  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      router.replace('/');
    }
  }, [user, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    loadGuidelines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function ingestGuideline(url: string, filename: string) {
    if (!token) return;
    setIngesting(true);
    setStatus('idle');

    try {
      const res = await fetch('/api/admin/guidelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url, filename }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to ingest guideline');

      setStatus('success');
      setMessage(`${filename} has been queued for AI ingestion.`);
      loadGuidelines();
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong during ingestion');
    } finally {
      setIngesting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/guidelines', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setManagedGuidelines(prev => prev.filter(g => g.id !== id));
      }
    } catch (err) {
      console.error('Delete failed', err);
    }
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-foreground text-3xl mb-1">Medical Guidelines</h1>
          <p className="text-muted-foreground">Ground the AI assistant in official treatment guidelines by uploading PDFs.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileUp className="h-5 w-5 text-primary" />
                  Upload Guidelines (PDF)
                </CardTitle>
                <CardDescription>
                  Upload one or more Standard Treatment Guideline PDFs. They will be processed and indexed by the AI.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <UploadDropzone
                  endpoint="stgUploader"
                  input={{ token: token ?? '' }}
                  onUploadBegin={() => setUploading(true)}
                  onClientUploadComplete={(res) => {
                    setUploading(false);
                    if (res) {
                      res.forEach(file => {
                        ingestGuideline(file.ufsUrl ?? file.url, file.name);
                      });
                    }
                  }}
                  onUploadError={(error: Error) => {
                    setUploading(false);
                    setStatus('error');
                    setMessage(`Upload failed: ${error.message}`);
                  }}
                  appearance={{
                    label: { color: '#14b8a6' },
                    button: {
                      background: '#14b8a6',
                      color: '#fff',
                    },
                  }}
                  className="border-2 border-dashed border-primary/20 rounded-xl p-8 hover:border-primary/40 transition-colors"
                />

                {uploading && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <p className="text-sm font-medium">Uploading PDF to storage...</p>
                  </div>
                )}

                {ingesting && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <p className="text-sm font-medium">AI is indexing your guidelines...</p>
                  </div>
                )}

                {status === 'success' && !uploading && !ingesting && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981]">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{message}</p>
                  </div>
                )}

                {status === 'error' && !uploading && !ingesting && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444]">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{message}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Managed Knowledge Base</CardTitle>
                <CardDescription>Documents currently used to ground the AI chatbot.</CardDescription>
              </CardHeader>
              <CardContent>
                {managedGuidelines.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8 italic bg-secondary/30 rounded-xl border border-dashed">No documents uploaded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {managedGuidelines.map((file) => (
                      <div key={file.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-border shadow-sm group">
                        <div className="h-10 w-10 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{file.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            Added {new Date(file.createdAt).toLocaleDateString()} &bull; {file.status}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(file.id)}
                          className="text-destructive opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all h-9 w-9 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Why this matters?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <p>Grounds the chatbot in official medical protocol.</p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <p>Prevents wrong prescriptions by providing accurate guidance.</p>
                </div>
                <div className="flex gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <p>Supports pharmacists with instant knowledge retrieval via WhatsApp.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
