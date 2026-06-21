/**
 * @jest-environment jsdom
 *
 * Phase 4 — combined Consent + Profile onboarding screen.
 * Phase 5 — city/country moved into the question graph (written back by
 * ai-service when those nodes are answered), so this screen is consent +
 * optional phone only. Submit is gated on the consent checkbox alone;
 * phone is optional and, if filled, is PATCHed after consent succeeds.
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

describe('OnboardingClient (consent + optional phone)', () => {
  it('renders legal copy and the phone field, with no city/country fields', () => {
    render(<OnboardingClient />);
    expect(screen.getByText(/Digital Personal Data Protection Act, 2023/)).toBeInTheDocument();
    expect(screen.getByLabelText(ONBOARDING.PHONE_LABEL)).toBeInTheDocument();
    expect(screen.queryByLabelText('Country')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('City')).not.toBeInTheDocument();
  });

  it('disables submit until the consent checkbox is checked', () => {
    render(<OnboardingClient />);
    const submit = screen.getByRole('button', { name: /I Agree — Continue to Assessment/ });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(submit).not.toBeDisabled();
  });

  it('navigates straight to questionnaire on consent alone when phone is left blank', async () => {
    searchParamsValue = new URLSearchParams('track=hni');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ consentAt: '2026-01-01T00:00:00.000Z' }),
    });

    render(<OnboardingClient />);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /I Agree — Continue to Assessment/ }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/questionnaire?track=hni'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/consent');
  });

  it('submits consent then phone PATCH, in that order, when phone is filled', async () => {
    searchParamsValue = new URLSearchParams('track=hni');
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ consentAt: '2026-01-01T00:00:00.000Z' }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<OnboardingClient />);
    fireEvent.change(screen.getByLabelText(ONBOARDING.PHONE_LABEL), {
      target: { value: '+91 98765 43210' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /I Agree — Continue to Assessment/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[0][0]).toBe('/api/consent');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/user/profile');
    expect(push).toHaveBeenCalledWith('/questionnaire?track=hni');
  });

  it('does not call the phone PATCH if consent POST fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'nope' }) });

    render(<OnboardingClient />);
    fireEvent.change(screen.getByLabelText(ONBOARDING.PHONE_LABEL), {
      target: { value: '+91 98765 43210' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /I Agree — Continue to Assessment/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(push).not.toHaveBeenCalled();
  });

  it('shows an error and does not navigate if the phone PATCH fails after consent succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ consentAt: '2026-01-01T00:00:00.000Z' }),
      })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Could not save phone' }) });

    render(<OnboardingClient />);
    fireEvent.change(screen.getByLabelText(ONBOARDING.PHONE_LABEL), {
      target: { value: '+91 98765 43210' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /I Agree — Continue to Assessment/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Could not save phone')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('retries only the phone PATCH path on re-submit after a PATCH failure (consent re-fires, is idempotent)', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ consentAt: '2026-01-01T00:00:00.000Z' }),
      })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Could not save phone' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ consentAt: '2026-01-01T00:00:00.000Z' }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<OnboardingClient />);
    fireEvent.change(screen.getByLabelText(ONBOARDING.PHONE_LABEL), {
      target: { value: '+91 98765 43210' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /I Agree — Continue to Assessment/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole('button', { name: /I Agree — Continue to Assessment/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(push).toHaveBeenCalledWith('/questionnaire');
  });

  it('has no axe violations', async () => {
    const { container } = render(<OnboardingClient />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
