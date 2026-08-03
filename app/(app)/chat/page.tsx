import { Suspense } from 'react';
import { ChatPanel } from '@/components/chat/chat-panel';
import { Spinner } from '@/components/ui/primitives';

export const metadata = { title: 'Chat · Parch' };

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center text-ink-3">
          <Spinner />
        </div>
      }
    >
      <ChatPanel />
    </Suspense>
  );
}
