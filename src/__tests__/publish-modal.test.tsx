/**
 * @jest-environment jsdom
 *
 * PublishModal — platform selection, configured-state gating, publish call,
 * per-platform result rendering.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PublishModal } from '@/app/admin/newsletter/_components/PublishModal';
import { NEWSLETTER_STRINGS } from '@/config/admin-strings';
import type { NewsletterRow } from '@/app/admin/newsletter/_hooks/useNewsletterData';

const NEWSLETTER: NewsletterRow = {
  id: 'nl-1',
  title: 'Weekly Security Briefing',
  status: 'draft',
  articleIds: ['a1', 'a2'],
  createdAt: new Date('2026-06-08T03:00:00Z').toISOString(),
  posts: [{ platform: 'x', status: 'posted', postedAt: new Date().toISOString() }],
};

const CONFIGURED = { linkedin: true, x: true, facebook: false, instagram: false };

const mockFetch = jest.fn();

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

describe('PublishModal', () => {
  it('disables unconfigured and already-posted platforms', () => {
    render(
      <PublishModal
        newsletter={NEWSLETTER}
        configured={CONFIGURED}
        onClose={jest.fn()}
        onPublished={jest.fn()}
      />,
    );

    // facebook/instagram unconfigured → disabled with hint
    expect(screen.getByLabelText(/Facebook/)).toBeDisabled();
    expect(screen.getByLabelText(/Instagram/)).toBeDisabled();
    expect(screen.getAllByText(new RegExp(NEWSLETTER_STRINGS.KEYS_MISSING)).length).toBe(2);
    // x already posted → disabled
    expect(screen.getByLabelText(/X \(Twitter\)/)).toBeDisabled();
    // linkedin available
    expect(screen.getByLabelText(/LinkedIn/)).toBeEnabled();
  });

  it('publishes selected platforms with the caption and shows results', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: { linkedin: { success: true, externalId: 'urn:li:share:1' } },
      }),
    });
    const onPublished = jest.fn();

    render(
      <PublishModal
        newsletter={NEWSLETTER}
        configured={CONFIGURED}
        onClose={jest.fn()}
        onPublished={onPublished}
      />,
    );

    fireEvent.click(screen.getByLabelText(/LinkedIn/));
    fireEvent.change(screen.getByLabelText(NEWSLETTER_STRINGS.CAPTION_LABEL), {
      target: { value: 'Custom caption' },
    });
    fireEvent.click(screen.getByRole('button', { name: NEWSLETTER_STRINGS.PUBLISH_SUBMIT }));

    await waitFor(() => {
      expect(screen.getByText(new RegExp(NEWSLETTER_STRINGS.RESULT_POSTED))).toBeInTheDocument();
    });

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/admin/newsletter/nl-1/publish');
    const body = JSON.parse(opts.body);
    expect(body.platforms).toEqual(['linkedin']);
    expect(body.captions.linkedin).toBe('Custom caption');
    expect(onPublished).toHaveBeenCalled();
  });

  it('shows the publish error when the request fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });

    render(
      <PublishModal
        newsletter={NEWSLETTER}
        configured={CONFIGURED}
        onClose={jest.fn()}
        onPublished={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText(/LinkedIn/));
    fireEvent.click(screen.getByRole('button', { name: NEWSLETTER_STRINGS.PUBLISH_SUBMIT }));

    await waitFor(() => {
      expect(screen.getByText(NEWSLETTER_STRINGS.ERR_PUBLISH)).toBeInTheDocument();
    });
  });

  it('keeps Publish disabled until a platform is selected', () => {
    render(
      <PublishModal
        newsletter={NEWSLETTER}
        configured={CONFIGURED}
        onClose={jest.fn()}
        onPublished={jest.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: NEWSLETTER_STRINGS.PUBLISH_SUBMIT })).toBeDisabled();
  });
});
