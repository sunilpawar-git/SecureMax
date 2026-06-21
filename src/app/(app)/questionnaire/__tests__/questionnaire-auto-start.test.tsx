/**
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { useAutoStart } from '../use-auto-start';
import type { SessionState } from '../types';

describe('useAutoStart', () => {
  it('auto-starts when track is present and no session param', () => {
    const handleStart = jest.fn();
    renderHook(() => useAutoStart('hni', null, 'idle' as SessionState, handleStart));
    expect(handleStart).toHaveBeenCalledWith('hni');
    expect(handleStart).toHaveBeenCalledTimes(1);
  });

  it('does not auto-start when a session param is present (resume takes precedence)', () => {
    const handleStart = jest.fn();
    renderHook(() => useAutoStart('hni', 'session-123', 'idle' as SessionState, handleStart));
    expect(handleStart).not.toHaveBeenCalled();
  });

  it('does not double-invoke handleStart on re-render', () => {
    const handleStart = jest.fn();
    const { rerender } = renderHook(
      ({
        track,
        sessionId,
        state,
      }: {
        track: string | null;
        sessionId: string | null;
        state: SessionState;
      }) => useAutoStart(track, sessionId, state, handleStart),
      { initialProps: { track: 'hni', sessionId: null, state: 'idle' as SessionState } },
    );
    rerender({ track: 'hni', sessionId: null, state: 'idle' as SessionState });
    rerender({ track: 'hni', sessionId: null, state: 'idle' as SessionState });
    expect(handleStart).toHaveBeenCalledTimes(1);
  });

  it('does not auto-start when track is absent (picker still renders)', () => {
    const handleStart = jest.fn();
    renderHook(() => useAutoStart(null, null, 'idle' as SessionState, handleStart));
    expect(handleStart).not.toHaveBeenCalled();
  });

  it('does not auto-start when sessionState is not idle', () => {
    const handleStart = jest.fn();
    renderHook(() => useAutoStart('hni', null, 'active' as SessionState, handleStart));
    expect(handleStart).not.toHaveBeenCalled();
  });
});
