/**
 * @jest-environment jsdom
 *
 * Phase 4 — combined Consent + Profile onboarding screen. Consent and
 * profile used to be two full-page navigations; this asserts the merged
 * screen renders both, submits sequentially (consent then profile), and
 * only navigates on combined success.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ONBOARDING } from '@/config/strings';
import OnboardingClient from '../onboarding-client';

expect.extend(toHaveNoViolations);

const push = jest.fn();
let searchParamsValue = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParamsValue,
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({ update: jest.fn() }),
}));

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  push.mockClear();
  fetchMock.mockReset();
  searchParamsValue = new URLSearchParams();
});

function fillProfileFields() {
  fireEvent.change(screen.getByLabelText(ONBOARDING.COUNTRY_LABEL), {
    target: { value: 'India' },
  });
  fireEvent.change(screen.getByLabelText(ONBOARDING.CITY_LABEL), {
    target: { value: 'Mumbai' },
  });
}

describe('OnboardingClient (combined consent + profile)', () => {
  it('renders legal copy and city/country/phone fields together', () => {
    render(<OnboardingClient />);
    expect(screen.getByText(/Digital Personal Data Protection Act, 2023/)).toBeInTheDocument();
    expect(screen.getByLabelText(ONBOARDING.COUNTRY_LABEL)).toBeInTheDocument();
    expect(screen.getByLabelText(ONBOARDING.CITY_LABEL)).toBeInTheDocument();
    expect(screen.getByLabelText(ONBOARDING.PHONE_LABEL)).toBeInTheDocument();
  });

  it('disables submit until checkbox checked AND city/country filled', () => {
    render(<OnboardingClient />);
    const submit = screen.getByRole('button', { name: /I Agree — Continue to Assessment/ });
    expect(submit).toBeDisabled();

    fillProfileFields();
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(submit).not.toBeDisabled();
  });

  it('submits consent then profile, in that order, and navigates with track preserved', async () => {
    searchParamsValue = new URLSearchParams('track=hni');
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ consentAt: '2026-01-01T00:00:00.000Z' }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<OnboardingClient />);
    fillProfileFields();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /I Agree — Continue to Assessment/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[0][0]).toBe('/api/consent');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/user/profile');
    expect(push).toHaveBeenCalledWith('/questionnaire?track=hni');
  });

  it('does not call profile PATCH if consent POST fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'nope' }) });

    render(<OnboardingClient />);
    fillProfileFields();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /I Agree — Continue to Assessment/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(push).not.toHaveBeenCalled();
  });

  it('has no axe violations', async () => {
    const { container } = render(<OnboardingClient />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
