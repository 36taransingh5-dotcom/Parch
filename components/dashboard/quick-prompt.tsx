'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/primitives';

/** Fires a procurement request straight from the dashboard into the chat. */
export function QuickPrompt() {
  const router = useRouter();
  const [value, setValue] = useState('');

  const submit = (text: string) => {
    const q = text.trim();
    if (!q) return;
    router.push(`/chat?q=${encodeURIComponent(q)}`);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
      className="card flex items-center gap-2 p-2"
    >
      <span className="pl-2 text-ink-3" aria-hidden>
        <svg viewBox="0 0 20 20" className="size-4.5">
          <path
            d="M10 2.5l6.5 4v7l-6.5 4-6.5-4v-7l6.5-4z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask OpsPilot to buy something — “error monitoring under $30/month”"
        className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-[15px] placeholder:text-ink-3 focus:outline-none"
      />
      <Button type="submit" disabled={!value.trim()}>
        Procure
      </Button>
    </form>
  );
}
