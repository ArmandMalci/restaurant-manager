import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the generated Orval module BEFORE importing the SUT.
vi.mock('@/api/notifications/notifications', () => ({
  notificationsControllerGetPublicKey: vi
    .fn()
    .mockResolvedValue({ publicKey: 'BPpublicKeyBase64Url' }),
  notificationsControllerSubscribe: vi.fn().mockResolvedValue({}),
  notificationsControllerUnsubscribe: vi.fn().mockResolvedValue({}),
}));

import { notificationsControllerUnsubscribe } from '@/api/notifications/notifications';
import { unsubscribe } from './notifications';

describe('notifications uses Orval-generated functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unsubscribe calls notificationsControllerUnsubscribe with the subscription endpoint', async () => {
    const fakeSub = {
      endpoint: 'https://push.example/abc',
      unsubscribe: vi.fn().mockResolvedValue(true),
    };
    const registration = {
      pushManager: { getSubscription: vi.fn().mockResolvedValue(fakeSub) },
    };

    // @ts-expect-error minimal navigator stub for jsdom
    globalThis.navigator.serviceWorker = {
      getRegistration: vi.fn().mockResolvedValue(registration),
    };

    await unsubscribe();

    expect(notificationsControllerUnsubscribe).toHaveBeenCalledWith({
      endpoint: 'https://push.example/abc',
    });
    expect(fakeSub.unsubscribe).toHaveBeenCalled();
  });
});
