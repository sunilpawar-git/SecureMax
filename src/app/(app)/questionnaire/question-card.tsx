'use client';

import { useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import { CPP_DOMAINS, QUESTION_CARD } from '@/config/strings';
import { QUESTION_STYLES } from '@/config/colors';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cx } from '@/lib/utils';
import type { QuestionNode } from './types';

const DOMAIN_NAME_MAP: Record<string, string> = Object.fromEntries(
  Object.values(CPP_DOMAINS).map((d) => [d.code, d.name]),
);

interface QuestionCardProps {
  question: QuestionNode;
  onSubmit: (answer: string | string[]) => void;
  isLoading: boolean;
  questionNumber: number;
}

export function QuestionCard({ question, onSubmit, isLoading, questionNumber }: QuestionCardProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [textInput, setTextInput] = useState('');

  const domainLabel = DOMAIN_NAME_MAP[question.domain] || question.domain;
  const isText = question.question_type === 'text_input';
  const isMulti = question.question_type === 'multi_choice';
  const isSingle = !isText && !isMulti;

  const handleOptionClick = (option: string) => {
    if (isMulti) {
      setSelectedOptions((prev) =>
        prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option],
      );
    } else {
      setSelectedOptions([option]);
    }
  };

  const handleSubmit = () => {
    if (isText) {
      if (textInput.trim()) {
        onSubmit(textInput.trim());
        setTextInput('');
      }
    } else if (selectedOptions.length > 0) {
      onSubmit(isMulti ? selectedOptions : selectedOptions[0]);
      setSelectedOptions([]);
    }
  };

  const isSubmitDisabled =
    isLoading || (isText && !textInput.trim()) || (!isText && selectedOptions.length === 0);

  // Enter submits a valid choice answer. Captured so it runs before the focused
  // option button's default Enter activation (which would toggle the selection).
  // Skipped for text_input so Enter inserts a newline in the textarea.
  const handleKeyDownCapture = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || isText || isSubmitDisabled) return;
    e.preventDefault();
    handleSubmit();
  };

  return (
    <div
      data-testid="question-card"
      onKeyDownCapture={handleKeyDownCapture}
      className={cx(
        'animate-question-in bg-white dark:bg-slate-800 rounded-xl shadow-sm',
        'border border-gray-100 dark:border-slate-700 p-6',
        !isText && 'pb-24 md:pb-6',
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <Badge variant="emerald">{domainLabel}</Badge>
        <span className={QUESTION_STYLES.meta}>
          {QUESTION_CARD.QUESTION_PREFIX}
          {questionNumber}
        </span>
      </div>

      <h2 className={cx(QUESTION_STYLES.question, 'mb-6')} aria-live="polite">
        {question.text}
      </h2>

      {isText ? (
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder={QUESTION_CARD.TEXT_PLACEHOLDER}
          aria-label={QUESTION_CARD.TEXT_ARIA}
          rows={3}
          className={QUESTION_STYLES.textarea}
        />
      ) : (
        <div
          role={isSingle ? 'radiogroup' : 'group'}
          aria-label={QUESTION_CARD.OPTIONS_ARIA}
          className="space-y-2"
        >
          {question.options?.map((option) => {
            const selected = selectedOptions.includes(option);
            return (
              <button
                key={option}
                type="button"
                data-testid="question-option"
                onClick={() => handleOptionClick(option)}
                role={isSingle ? 'radio' : undefined}
                aria-checked={isSingle ? selected : undefined}
                aria-pressed={isMulti ? selected : undefined}
                className={cx(
                  QUESTION_STYLES.option.base,
                  selected ? QUESTION_STYLES.option.selected : QUESTION_STYLES.option.unselected,
                )}
              >
                {selected && <CheckIcon className="h-4 w-4 shrink-0" aria-hidden="true" />}
                <span>{option}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className={isText ? 'mt-6' : QUESTION_STYLES.ctaBar}>
        <Button
          type="button"
          data-testid="question-continue"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          loading={isLoading}
          size="lg"
          className="w-full"
        >
          {isLoading ? QUESTION_CARD.PROCESSING : QUESTION_CARD.CONTINUE}
        </Button>
      </div>
    </div>
  );
}
