/**
 * @jest-environment jsdom
 *
 * QuestionnaireLayout — integration coverage for the restyled questionnaire DOM.
 * The Playwright golden-path specs never drive into the questionnaire UI (they
 * stop at "page loads"), so this is the only place the `data-testid` hooks added
 * in Phase 2 (question-card / question-option / question-continue) are exercised
 * end to end: select an option → press Continue → onSubmit fires with the answer,
 * and the inline-vs-fixed-bar CTA split (choice vs text_input) is real.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestionnaireLayout } from '../questionnaire-layout';
import { QUESTION_CARD } from '@/config/strings';
import type { QuestionNode } from '../types';

const choiceQuestion: QuestionNode = {
  id: 'q1',
  domain: 'CPP-01',
  text: 'Do you have perimeter fencing?',
  question_type: 'single_choice',
  options: ['Yes', 'No'],
  score_drop_trigger: false,
};

const textQuestion: QuestionNode = {
  id: 'q2',
  domain: 'CPP-05',
  text: 'Describe your access control policy.',
  question_type: 'text_input',
  score_drop_trigger: false,
};

function renderLayout(question: QuestionNode, onSubmit = jest.fn()) {
  render(
    <QuestionnaireLayout
      question={question}
      onSubmit={onSubmit}
      isLoading={false}
      questionNumber={1}
      radarScores={{}}
      error={null}
    />,
  );
  return onSubmit;
}

describe('QuestionnaireLayout — choice question (fixed CTA bar)', () => {
  it('selects an option via data-testid hooks then submits via Continue', async () => {
    const user = userEvent.setup();
    const onSubmit = renderLayout(choiceQuestion);

    expect(screen.getByTestId('question-card')).toBeInTheDocument();

    const options = screen.getAllByTestId('question-option');
    expect(options.map((el) => el.textContent)).toEqual(['Yes', 'No']);

    const continueBtn = screen.getByTestId('question-continue');
    expect(continueBtn).toBeDisabled();

    await user.click(options[0]);
    expect(continueBtn).toBeEnabled();

    await user.click(continueBtn);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('Yes');

    // Choice questions render the Continue button inside the fixed bottom CTA bar,
    // not inline under the question — assertion #11 of the overhaul plan.
    const ctaBar = continueBtn.parentElement;
    expect(ctaBar?.className).toEqual(expect.stringContaining('fixed'));

    // Containing-block guard: a `position: fixed` element pins to the viewport
    // only if NO ancestor has a non-`none` transform. `animate-question-in`
    // leaves `transform: translateY(0)` behind via `animation-fill-mode: both`,
    // so the CTA bar must not be a descendant of any element carrying that
    // class — otherwise it pins to the card instead of the screen (a bug
    // `className` string-matching alone cannot catch, since jsdom never
    // computes layout/containing-blocks).
    for (let node = ctaBar?.parentElement; node; node = node.parentElement) {
      expect(node.className).not.toEqual(expect.stringContaining('animate-question-in'));
    }
  });
});

describe('QuestionnaireLayout — text_input question (inline Continue)', () => {
  it('renders no option buttons and submits the typed answer inline', async () => {
    const user = userEvent.setup();
    const onSubmit = renderLayout(textQuestion);

    expect(screen.queryAllByTestId('question-option')).toHaveLength(0);

    const textarea = screen.getByLabelText(QUESTION_CARD.TEXT_ARIA);
    const continueBtn = screen.getByTestId('question-continue');
    expect(continueBtn).toBeDisabled();

    await user.type(textarea, 'Visitors are logged and escorted at all times.');
    expect(continueBtn).toBeEnabled();

    await user.click(continueBtn);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('Visitors are logged and escorted at all times.');

    // text_input flows the Continue button inline (mt-6), never inside the
    // fixed bottom bar — keeps it clear of the on-screen keyboard (assertion #11).
    expect(continueBtn.parentElement?.className).toEqual(expect.stringContaining('mt-6'));
    expect(continueBtn.parentElement?.className).not.toEqual(expect.stringContaining('fixed'));
  });
});
