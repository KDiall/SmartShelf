'use client';

import { Card, CardContent } from '@/components/ui/card';
import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mx-auto">
          <WifiOff className="h-12 w-12 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">You&apos;re Offline</h1>
        <p className="text-muted-foreground">
          SmartShelf is still usable — your sales will sync automatically when you&apos;re back online.
        </p>
        <Card>
          <CardContent className="p-6 space-y-3 text-left text-sm text-muted-foreground">
            <p>✅ View your inventory and stock levels</p>
            <p>✅ Record sales (they&apos;ll sync when online)</p>
            <p>✅ Browse all pages you&apos;ve visited</p>
            <p>❌ Add or edit medicines</p>
            <p>❌ Send WhatsApp orders</p>
          </CardContent>
        </Card>
        <button
          onClick={() => window.location.reload()}
          className="w-full h-12 rounded-xl bg-[#0284c7] text-white font-bold shadow-md hover:bg-[#0284c7]/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
