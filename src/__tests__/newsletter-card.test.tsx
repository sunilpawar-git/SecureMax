/**
 * @jest-environment jsdom
 *
 * Phase 7 tests — NewsletterCard.
 * Intent: the preview image loads from the ADMIN image route (drafts are not
 * publicly visible), status badge and platform post results render, and
 * delete asks for confirmation before firing.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewsletterCard } from '@/app/admin/newsletter/_components/NewsletterCard';
import { NEWSLETTER_STRINGS } from '@/config/admin-strings';
import type { NewsletterRow } from '@/app/admin/newsletter/_hooks/useNewsletterData';

function makeNewsletter(overrides: Partial<NewsletterRow> = {}): NewsletterRow {
  return {
    id: 'nl-1',
    title: 'Weekly Threat Digest',
    status: 'draft',
    articleIds: ['ti-1', 'ti-2'],
    createdAt: '2026-06-08T03:00:00.000Z',
    posts: [],
    ...overrides,
  };
}

const noopAsync = () => Promise.resolve(false);
const noopFetchEmail = () => Promise.resolve(null);

const defaultProps = {
  configured: {},
  onDelete: jest.fn(),
  onPublished: jest.fn(),
  onCopyWhatsApp: jest.fn(noopAsync),
  onFetchEmail: jest.fn(noopFetchEmail),
};

describe('NewsletterCard', () => {
  it('loads the preview from the admin image route (not the public one)', () => {
    render(<NewsletterCard newsletter={makeNewsletter()} {...defaultProps} />);
    const img = screen.getByAltText(NEWSLETTER_STRINGS.PREVIEW_ALT);
    expect(img).toHaveAttribute('src', '/api/admin/newsletter/nl-1/image');
  });

  it('shows the status badge and cited-article count', () => {
    render(<NewsletterCard newsletter={makeNewsletter()} {...defaultProps} />);
    expect(screen.getByText(NEWSLETTER_STRINGS.STATUS_LABEL.draft)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`2 ${NEWSLETTER_STRINGS.ARTICLES_CITED}`)),
    ).toBeInTheDocument();
  });

  it('shows per-platform post results when present', () => {
    render(
      <NewsletterCard
        newsletter={makeNewsletter({
          posts: [{ platform: 'linkedin', status: 'posted', postedAt: '2026-06-08' }],
        })}
        {...defaultProps}
      />,
    );
    expect(screen.getByText('linkedin: posted')).toBeInTheDocument();
  });

  it('asks for confirmation before deleting', async () => {
    const user = userEvent.setup();
    const onDelete = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    render(<NewsletterCard newsletter={makeNewsletter()} {...defaultProps} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: NEWSLETTER_STRINGS.DELETE_CTA }));
    expect(onDelete).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: NEWSLETTER_STRINGS.DELETE_CTA }));
    expect(onDelete).toHaveBeenCalledWith('nl-1');
    confirmSpy.mockRestore();
  });

  it('renders the Copy WhatsApp and Preview Email buttons', () => {
    render(<NewsletterCard newsletter={makeNewsletter()} {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: NEWSLETTER_STRINGS.COPY_WHATSAPP }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: NEWSLETTER_STRINGS.PREVIEW_EMAIL }),
    ).toBeInTheDocument();
  });
});
