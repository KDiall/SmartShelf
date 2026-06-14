'use client';
import { useEffect } from 'react';

export function usePwa() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('SW registered:', reg.scope);
      }).catch((err) => {
        console.error('SW registration failed:', err);
      });
    }

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then((estimate) => {
        const pct = Math.round((estimate.usage ?? 0) / (estimate.quota ?? 1) * 100);
        if (pct > 80) {
          console.warn(`Storage ${pct}% full — consider clearing old data`);
        }
      });
    }
  }, []);
}
