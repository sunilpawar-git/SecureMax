/**
 * @jest-environment jsdom
 *
 * Phase 6 tests — DraftQueue actions.
 * Repost/Edit hand the draft text + id back to the page editor; Delete asks
 * for confirmation, calls the DELETE API, and removes the row.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DraftQueue } from '@/app/admin/linkedin/_components/DraftQueue';
import { LINKEDIN_STRINGS } from '@/config/admin-strings';

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

const DRAFTS = [
  {
    id: 'd-1',
    postText: 'First draft about perimeter security and the 4 Ds framework explained.',
    status: 'draft',
    createdAt: '2026-06-01T10:00:00Z',
  },
  {
    id: 'd-2',
    postText: 'Second draft on crisis management table-top exercises for enterprises.',
    status: 'draft',
    createdAt: '2026-06-02T10:00:00Z',
  },
];

function mockDraftsResponse() {
  mockFetch.mockImplementation((url: string, init?: RequestInit) => {
    if (init?.method === 'DELETE') {
      return Promise.resolve({ status: 204, ok: true });
    }
    return Promise.resolve({ ok: true, json: async () => ({ posts: DRAFTS }) });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDraftsResponse();
});

describe('DraftQueue', () => {
  it('renders Repost, Edit, and Delete actions for each pending draft', async () => {
    render(<DraftQueue onUseDraft={jest.fn()} />);
    await screen.findByText(/Pending Drafts \(2\)/);

    expect(screen.getAllByRole('button', { name: LINKEDIN_STRINGS.REPOST })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: LINKEDIN_STRINGS.EDIT })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: LINKEDIN_STRINGS.DELETE })).toHaveLength(2);
  });

  it('Repost passes the draft text and id to onUseDraft', async () => {
    const onUseDraft = jest.fn();
    const user = userEvent.setup();
    render(<DraftQueue onUseDraft={onUseDraft} />);
    await screen.findByText(/Pending Drafts/);

    await user.click(screen.getAllByRole('button', { name: LINKEDIN_STRINGS.REPOST })[0]);
    expect(onUseDraft).toHaveBeenCalledWith(DRAFTS[0].postText, 'd-1');
  });

  it('Edit passes the draft text and id to onUseDraft', async () => {
    const onUseDraft = jest.fn();
    const user = userEvent.setup();
    render(<DraftQueue onUseDraft={onUseDraft} />);
    await screen.findByText(/Pending Drafts/);

    await user.click(screen.getAllByRole('button', { name: LINKEDIN_STRINGS.EDIT })[1]);
    expect(onUseDraft).toHaveBeenCalledWith(DRAFTS[1].postText, 'd-2');
  });

  it('Delete confirms, calls the DELETE API, and removes the row', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<DraftQueue onUseDraft={jest.fn()} />);
    await screen.findByText(/Pending Drafts \(2\)/);

    await user.click(screen.getAllByRole('button', { name: LINKEDIN_STRINGS.DELETE })[0]);

    expect(confirmSpy).toHaveBeenCalledWith(LINKEDIN_STRINGS.DELETE_CONFIRM);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/linkedin?id=d-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
    await waitFor(() => {
      expect(screen.getByText(/Pending Drafts \(1\)/)).toBeInTheDocument();
    });
    confirmSpy.mockRestore();
  });

  it('Delete does nothing when the confirm prompt is declined', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    render(<DraftQueue onUseDraft={jest.fn()} />);
    await screen.findByText(/Pending Drafts \(2\)/);

    await user.click(screen.getAllByRole('button', { name: LINKEDIN_STRINGS.DELETE })[0]);

    const deleteCalls = mockFetch.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === 'DELETE',
    );
    expect(deleteCalls).toHaveLength(0);
    expect(screen.getByText(/Pending Drafts \(2\)/)).toBeInTheDocument();
    confirmSpy.mockRestore();
  });
});
