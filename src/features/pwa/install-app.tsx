'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import type { Dictionary } from '@/src/i18n/messages/en';
import { Button } from '@/src/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface InstallAppProps { copy: Dictionary['install']; compact?: boolean; }

export function InstallApp({ copy, compact = false }: InstallAppProps) {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(true);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const stateTimer = window.setTimeout(() => setInstalled(standalone), 0);
    const listener = (installEvent: Event) => {
      installEvent.preventDefault();
      setInstalled(false);
      setEvent(installEvent as BeforeInstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setEvent(null); };

    window.addEventListener('beforeinstallprompt', listener);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.clearTimeout(stateTimer); window.removeEventListener('beforeinstallprompt', listener); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  async function install() {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === 'accepted') setEvent(null);
  }

  if (installed || !event) return null;
  return (
      <Button aria-label={copy.action} onClick={install} size={compact?'icon':'md'} title={copy.action} type="button" variant="subtle">
        <Download aria-hidden="true" className="size-4" />
        {compact ? null : copy.action}
      </Button>
  );
}
