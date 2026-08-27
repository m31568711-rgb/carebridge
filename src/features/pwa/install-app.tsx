'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import type { Dictionary } from '@/src/i18n/messages/en';
import { Button } from '@/src/components/ui/button';
import { Dialog } from '@/src/components/ui/dialog';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface InstallAppProps {
  copy: Dictionary['install'];
  closeLabel: string;
}

export function InstallApp({ copy, closeLabel }: InstallAppProps) {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const listener = (installEvent: Event) => {
      installEvent.preventDefault();
      setEvent(installEvent as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', listener);
    return () => window.removeEventListener('beforeinstallprompt', listener);
  }, []);

  async function install() {
    if (!event) {
      setOpen(true);
      return;
    }

    await event.prompt();
    await event.userChoice;
    setEvent(null);
  }

  return (
    <>
      <Button onClick={install} type="button" variant="subtle">
        <Download aria-hidden="true" className="size-4" />
        {copy.action}
      </Button>
      <Dialog closeLabel={closeLabel} onClose={() => setOpen(false)} open={open} title={copy.unavailableTitle}>
        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Smartphone aria-hidden="true" className="size-7" /></span>
          <p className="mt-5 text-sm leading-6 text-slate-600">{copy.unavailableDescription}</p>
        </div>
      </Dialog>
    </>
  );
}
