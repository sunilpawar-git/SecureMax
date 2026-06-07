/**
 * @jest-environment jsdom
 *
 * Phase 0 smoke test — proves the per-file jsdom opt-in works end to end:
 * React Testing Library render, @testing-library/jest-dom matchers (wired via
 * jest.setup.ts), and jest-axe accessibility assertions. The 57 default tests
 * stay in the node environment; only files with the directive above use jsdom.
 *
 * RTL convention for this codebase: `render` + `screen` + `userEvent`; mock
 * next-auth `useSession`/`signOut` in component tests; `axe()`-smoke each
 * touched component.
 */
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

function Greeting({ name }: { name: string }) {
  return (
    <main>
      <h1>Hello {name}</h1>
      <button type="button">Continue</button>
    </main>
  );
}

describe('jsdom per-file opt-in', () => {
  it('renders into a real DOM and matches jest-dom matchers', () => {
    render(<Greeting name="World" />);
    expect(screen.getByRole('heading', { name: 'Hello World' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('passes a jest-axe accessibility smoke check', async () => {
    const { container } = render(<Greeting name="World" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
