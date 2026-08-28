import { describe, expect, it } from 'vitest';
import { notificationHref } from '@/src/features/notifications/notification-copy';
import type { NotificationRecord } from '@/src/types/domain';

const notification = (type: string, id: string): NotificationRecord => ({
  id: 'notification-id',
  recipient_id: 'recipient-id',
  type: 'diagnostic.assigned',
  title_key: null,
  message_key: null,
  data: {},
  related_entity_type: type,
  related_entity_id: id,
  read_at: null,
  created_at: '2026-08-28T00:00:00Z',
});

describe('notification routing', () => {
  it('routes diagnostic provider notifications to their scoped work item', () => {
    expect(notificationHref(notification('lab_order', 'lab-id'), 'en', 'provider')).toBe('/en/provider/diagnostics/lab/lab-id');
    expect(notificationHref(notification('radiology_order', 'radiology-id'), 'fr', 'provider')).toBe('/fr/provider/diagnostics/radiology/radiology-id');
  });

  it('keeps diagnostic entities inside the notification center for unrelated portals', () => {
    expect(notificationHref(notification('lab_order', 'lab-id'), 'ar', 'patient')).toBe('/ar/notifications');
  });
});
