/**
 * @jest-environment jsdom
 *
 * QuestionCard — focuses on the branching-critical interaction (Rule 9): Enter
 * submits a choice answer ONLY when a valid selection exists. Also covers the
 * selected-state affordance, multi-select toggling, and an axe smoke pass.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { QuestionCard } from '../question-card';
import { QUESTION_CARD } from '@/config/strings';
import type { QuestionNode } from '../types';

expect.extend(toHaveNoViolations);

const singleChoice: QuestionNode = {
  id: 'q1',
  domain: 'CPP-01',
  text: 'Do you have perimeter fencing?',
  question_type: 'single_choice',
  options: ['Yes', 'No'],
  score_drop_trigger: false,
};

const multiChoice: QuestionNode = {
  ...singleChoice,
  id: 'q2',
  question_type: 'multi_choice',
  options: ['CCTV', 'Guards', 'Alarms'],
};

const textInput: QuestionNode = {
  id: 'q3',
  domain: 'CPP-05',
  text: 'Describe your access policy.',
  question_type: 'text_input',
  score_drop_trigger: false,
};

function renderCard(question: QuestionNode, onSubmit = jest.fn()) {
  render(
    <QuestionCard question={question} onSubmit={onSubmit} isLoading={false} questionNumber={1} />,
  );
  return onSubmit;
}

describe('QuestionCard — Enter-to-submit guard', () => {
  it('does NOT submit on Enter when no option is selected', async () => {
    const user = userEvent.setup();
    const onSubmit = renderCard(singleChoice);
    await user.keyboard('{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the selected option on Enter once a valid selection exists', async () => {
    const user = userEvent.setup();
    const onSubmit = renderCard(singleChoice);
    await user.click(screen.getByRole('radio', { name: 'Yes' }));
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('Yes');
  });

  it('does not hijack Enter for text_input questions', async () => {
    const user = userEvent.setup();
    const onSubmit = renderCard(textInput);
    const textarea = screen.getByLabelText(QUESTION_CARD.TEXT_ARIA);
    await user.type(textarea, 'line one{Enter}line two');
    expect(onSubmit).not.toHaveBeenCalled();
    expect((textarea as HTMLTextAreaElement).value).toContain('\n');
  });
});

describe('QuestionCard — selection behavior', () => {
  it('marks a chosen radio option as checked', async () => {
    const user = userEvent.setup();
    renderCard(singleChoice);
    const yes = screen.getByRole('radio', { name: 'Yes' });
    expect(yes).toHaveAttribute('aria-checked', 'false');
    await user.click(yes);
    expect(yes).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles multiple options and submits them as an array', async () => {
    const user = userEvent.setup();
    const onSubmit = renderCard(multiChoice);
    await user.click(screen.getByRole('button', { name: 'CCTV' }));
    await user.click(screen.getByRole('button', { name: 'Guards' }));
    await user.click(screen.getByTestId('question-continue'));
    expect(onSubmit).toHaveBeenCalledWith(['CCTV', 'Guards']);
  });
});

describe('QuestionCard — accessibility', () => {
  it('has no axe violations (single choice)', async () => {
    const { container } = render(
      <QuestionCard
        question={singleChoice}
        onSubmit={jest.fn()}
        isLoading={false}
        questionNumber={1}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
