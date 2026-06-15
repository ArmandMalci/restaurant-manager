import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the shared apiClient module BEFORE importing the SUT.
vi.mock('./api-client', () => {
  const apiClient = {
    get: vi.fn().mockResolvedValue({ data: { publicKey: 'BPpublicKeyBase64Url' } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  };

  return { apiClient, default: vi.fn() };
});

import { apiClient } from './api-client';
import { unsubscribe } from './notifications';

describe('notifications uses apiClient (not raw axios)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unsubscribe hits the /notifications/subscribe path via apiClient.delete', async () => {
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

    expect(apiClient.delete).toHaveBeenCalledWith('/notifications/subscribe', {
      data: { endpoint: 'https://push.example/abc' },
    });
    expect(fakeSub.unsubscribe).toHaveBeenCalled();
  });
});
