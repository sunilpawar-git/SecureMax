/**
 * @jest-environment jsdom
 *
 * Behaviour tests for useNewsletterData — the hook that was stuck at loading:true.
 *
 * Regressions guarded:
 * 1. loading resolves to false after a successful fetch (not stuck forever)
 * 2. AbortError on unmount is swallowed — no user-facing error shown
 * 3. Fetch is cancelled when the component unmounts (no state updates after death)
 * 4. refresh() (via refreshKey) triggers a second fetch
 * 5. Error state is set when the API returns a non-OK response
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useNewsletterData } from '@/app/admin/newsletter/_hooks/useNewsletterData';

const MOCK_NEWSLETTERS = [
  {
    id: 'nl-1',
    title: 'Weekly Digest',
    status: 'draft',
    articleIds: ['a1', 'a2'],
    createdAt: '2026-06-08T00:00:00.000Z',
    posts: [],
  },
];

const MOCK_RESPONSE = { newsletters: MOCK_NEWSLETTERS, configured: { linkedin: true } };

function mockFetch(response: unknown, status = 200): jest.SpyInstance {
  const impl = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
  } as Response);
  global.fetch = impl;
  return impl;
}

afterEach(() => {
  jest.restoreAllMocks();
  // Reset the global fetch stub
  (global as { fetch?: unknown }).fetch = undefined;
});

describe('useNewsletterData', () => {
  it('starts in loading state and resolves to false after fetch', async () => {
    mockFetch(MOCK_RESPONSE);
    const { result } = renderHook(() => useNewsletterData());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.newsletters).toHaveLength(1);
    expect(result.current.newsletters[0].id).toBe('nl-1');
    expect(result.current.configured).toEqual({ linkedin: true });
    expect(result.current.error).toBeNull();
  });

  it('does not show an error when the fetch is aborted on unmount', async () => {
    // Return a promise that never resolves so unmount happens mid-flight
    global.fetch = jest.fn().mockImplementation(
      (_input: unknown, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          if (init?.signal) {
            init.signal.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }
        }),
    );

    const { result, unmount } = renderHook(() => useNewsletterData());

    expect(result.current.loading).toBe(true);

    // Unmount while fetch is still pending — should abort silently
    act(() => unmount());

    // Give any pending microtasks a chance to run
    await act(async () => {
      await Promise.resolve();
    });

    // Error must not be set — AbortError is an internal cleanup signal
    expect(result.current.error).toBeNull();
  });

  it('sets error state when the API returns a non-OK response', async () => {
    mockFetch({ error: 'Forbidden' }, 403);
    const { result } = renderHook(() => useNewsletterData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.newsletters).toHaveLength(0);
  });

  it('refresh() triggers a second fetch and updates the list', async () => {
    const fetchSpy = mockFetch(MOCK_RESPONSE);
    const { result } = renderHook(() => useNewsletterData());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Now trigger a refresh and check the hook re-fetches
    act(() => result.current.refresh());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('remove() deletes an item then re-fetches', async () => {
    const fetchMock = jest.fn().mockImplementation((_url: unknown, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => MOCK_RESPONSE,
      } as Response);
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useNewsletterData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.remove('nl-1');
    });

    // GET should have been called twice: initial mount + after delete
    const getCalls = (fetchMock.mock.calls as [unknown, RequestInit | undefined][]).filter(
      (call) => !call[1]?.method || call[1].method === 'GET',
    );
    expect(getCalls.length).toBeGreaterThanOrEqual(2);
  });
});
