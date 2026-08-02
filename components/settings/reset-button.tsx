'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Spinner } from '@/components/ui/primitives';

export function ResetButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const reset = async () => {
    setBusy(true);
    try {
      await fetch('/api/reset', { method: 'POST' });
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  if (!confirming) {
    return (
      <Button variant="secondary" onClick={() => setConfirming(true)}>
        Reset demo data
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="danger" onClick={reset} disabled={busy || pending}>
        {busy || pending ? <Spinner /> : 'Yes, wipe it'}
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
        Keep
      </Button>
    </div>
  );
}
