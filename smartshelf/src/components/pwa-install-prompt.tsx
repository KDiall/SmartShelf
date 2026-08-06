'use client';
import { useState } from 'react';
import { useInstallPrompt } from '@/hooks/use-install-prompt';
import { useAuthStore } from '@/store/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export function PwaInstallPrompt() {
  const { canInstall, promptInstall } = useInstallPrompt();
  const user = useAuthStore((s) => s.user);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (!user || !canInstall || dismissed) return null;

  async function handleInstall() {
    setInstalling(true);
    const installed = await promptInstall();
    setInstalling(false);
    if (installed) setDismissed(true);
  }

  return (
    <Dialog
      open={canInstall && !dismissed}
      onOpenChange={(open) => {
        if (!open) setDismissed(true);
      }}
    >
      <DialogContent showCloseButton={false} className="max-w-sm text-center">
        <DialogHeader className="items-center">
          <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-primary to-[#2dd4bf] shadow-lg shadow-primary/20 flex items-center justify-center mb-2">
            <Download className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-xl font-extrabold text-[#0f172a]">Install SmartShelf</DialogTitle>
          <DialogDescription>
            Add SmartShelf to your home screen for one-tap access and offline support.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleInstall}
            disabled={installing}
            className="w-full h-12 rounded-2xl font-bold shadow-lg shadow-primary/20"
          >
            {installing ? 'Installing...' : 'Install App'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setDismissed(true)}
            className="w-full h-12 rounded-2xl font-semibold text-[#64748b]"
          >
            Not now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
