/**
 * @jest-environment jsdom
 *
 * AppHeader (slim variant) — regression coverage for plan assertions #1/#2:
 * progress shows a bare count ("Question N", no fictional "of M" denominator)
 * and there is no auto-save indicator. A future regression reintroducing either
 * would fail these assertions.
 */
import { render, screen } from '@testing-library/react';
import { AppHeader } from '../AppHeader';
import { QUESTIONNAIRE } from '@/config/strings';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null }),
  signOut: jest.fn(),
}));

describe('AppHeader (slim) — questionnaire progress', () => {
  it('shows "Question N" with no fake denominator', () => {
    render(<AppHeader variant="slim" track="hni" questionNumber={3} />);
    expect(screen.getByText(`${QUESTIONNAIRE.QUESTION_LABEL} 3`)).toBeInTheDocument();
    expect(screen.queryByText(/of\s+\d+/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/~\s*\d+/)).not.toBeInTheDocument();
  });

  it('renders no auto-save indicator', () => {
    render(<AppHeader variant="slim" track="hni" questionNumber={3} />);
    expect(screen.queryByText(/auto[\s-]?sav/i)).not.toBeInTheDocument();
  });
});
