/**
 * @jest-environment jsdom
 *
 * Phase 9 tests — ApiKeysTable.
 * Key values are always masked in the UI, and the LinkedIn token-age
 * warning appears only when the active linkedin key is older than 50 days.
 */

import { render, screen } from '@testing-library/react';
import { ApiKeysTable } from '@/app/admin/api-keys/_components/ApiKeysTable';
import { API_KEYS_STRINGS } from '@/config/admin-strings';
import type { ApiKeyRow } from '@/app/admin/api-keys/_hooks/useApiKeysData';

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function makeKey(overrides: Partial<ApiKeyRow> = {}): ApiKeyRow {
  return {
    id: 'key-1',
    provider: 'gemini',
    status: 'active',
    maskedKey: 'cd3f',
    createdAt: daysAgo(5),
    rotatedAt: null,
    lastUsedAt: null,
    ...overrides,
  };
}

describe('ApiKeysTable', () => {
  it('shows only the masked preview, never a full key value', () => {
    render(<ApiKeysTable keys={[makeKey()]} onRotate={jest.fn()} />);
    expect(screen.getByText(`${API_KEYS_STRINGS.MASK_PREFIX}cd3f`)).toBeInTheDocument();
  });

  it('shows a dash when no masked preview is available', () => {
    render(
      <ApiKeysTable
        keys={[makeKey({ maskedKey: null, status: 'rotated' })]}
        onRotate={jest.fn()}
      />,
    );
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.queryByText(new RegExp(API_KEYS_STRINGS.MASK_PREFIX))).not.toBeInTheDocument();
  });

  it('warns when the active LinkedIn token is older than 50 days', () => {
    render(
      <ApiKeysTable
        keys={[makeKey({ provider: 'linkedin', createdAt: daysAgo(55) })]}
        onRotate={jest.fn()}
      />,
    );
    expect(screen.getByText(API_KEYS_STRINGS.LINKEDIN_EXPIRY_WARNING)).toBeInTheDocument();
  });

  it('does not warn for a fresh LinkedIn token', () => {
    render(
      <ApiKeysTable
        keys={[makeKey({ provider: 'linkedin', createdAt: daysAgo(10) })]}
        onRotate={jest.fn()}
      />,
    );
    expect(screen.queryByText(API_KEYS_STRINGS.LINKEDIN_EXPIRY_WARNING)).not.toBeInTheDocument();
  });

  it('does not warn when the old linkedin key is not active', () => {
    render(
      <ApiKeysTable
        keys={[
          makeKey({
            id: 'k-old',
            provider: 'linkedin',
            status: 'rotated',
            createdAt: daysAgo(70),
            maskedKey: null,
          }),
          makeKey({ id: 'k-new', provider: 'linkedin', status: 'active', createdAt: daysAgo(2) }),
        ]}
        onRotate={jest.fn()}
      />,
    );
    expect(screen.queryByText(API_KEYS_STRINGS.LINKEDIN_EXPIRY_WARNING)).not.toBeInTheDocument();
  });

  it('offers Rotate only for active keys', () => {
    render(
      <ApiKeysTable
        keys={[
          makeKey({ id: 'k-1', status: 'active' }),
          makeKey({ id: 'k-2', status: 'rotated', maskedKey: null }),
        ]}
        onRotate={jest.fn()}
      />,
    );
    expect(screen.getAllByRole('button', { name: API_KEYS_STRINGS.ROTATE })).toHaveLength(1);
  });
});
