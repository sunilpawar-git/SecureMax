/**
 * @jest-environment jsdom
 *
 * Phase 5 — onboarding client pages RTL + axe smoke.
 * next/navigation and next-auth/react are mocked (these are client pages, not
 * the async Server-Component auth pages). We assert the restyled shells render
 * their SSOT/consent copy and pass an accessibility smoke check.
 */
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ONBOARDING } from '@/config/strings';
import ProfilePage from '../profile/page';
import ConsentPage from '../consent/page';

expect.extend(toHaveNoViolations);

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({ update: jest.fn() }),
}));

describe('ProfilePage (restyled)', () => {
  it('renders the heading, country/city fields, and the submit CTA from ONBOARDING', () => {
    render(<ProfilePage />);
    expect(screen.getByRole('heading', { name: ONBOARDING.PROFILE_HEADING })).toBeInTheDocument();
    expect(screen.getByLabelText(ONBOARDING.COUNTRY_LABEL)).toBeInTheDocument();
    expect(screen.getByLabelText(ONBOARDING.CITY_LABEL)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ONBOARDING.PROFILE_SUBMIT })).toBeInTheDocument();
  });

  it('disables the CTA until both fields are filled', () => {
    render(<ProfilePage />);
    expect(screen.getByRole('button', { name: ONBOARDING.PROFILE_SUBMIT })).toBeDisabled();
  });

  it('has no axe violations', async () => {
    const { container } = render(<ProfilePage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ConsentPage (restyled, copy unchanged)', () => {
  it('renders the DPDPA attestation checkbox and consent CTA', () => {
    render(<ConsentPage />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /I Agree — Continue to Assessment/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Digital Personal Data Protection Act, 2023/)).toBeInTheDocument();
  });

  it('disables the consent CTA until the attestation box is checked', () => {
    render(<ConsentPage />);
    expect(screen.getByRole('button', { name: /I Agree — Continue to Assessment/ })).toBeDisabled();
  });

  it('has no axe violations', async () => {
    const { container } = render(<ConsentPage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
