'use client';

import { useState } from 'react';
import { CPP_DOMAINS } from '@/config/strings';
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

  const handleOptionClick = (option: string) => {
    if (question.question_type === 'multi_choice') {
      setSelectedOptions((prev) =>
        prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option],
      );
    } else {
      setSelectedOptions([option]);
    }
  };

  const handleSubmit = () => {
    if (question.question_type === 'text_input') {
      if (textInput.trim()) {
        onSubmit(textInput.trim());
        setTextInput('');
      }
    } else if (question.question_type === 'multi_choice') {
      if (selectedOptions.length > 0) {
        onSubmit(selectedOptions);
        setSelectedOptions([]);
      }
    } else {
      if (selectedOptions.length === 1) {
        onSubmit(selectedOptions[0]);
        setSelectedOptions([]);
      }
    }
  };

  const isSubmitDisabled =
    isLoading ||
    (question.question_type === 'text_input' && !textInput.trim()) ||
    (question.question_type !== 'text_input' && selectedOptions.length === 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-medium px-2 py-1 bg-emerald-50 text-emerald-700 rounded">
          {domainLabel}
        </span>
        <span className="text-xs text-gray-400">Q{questionNumber}</span>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-6">{question.text}</h2>

      {question.question_type === 'text_input' ? (
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Type your answer..."
          rows={3}
          className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2
            focus:ring-emerald-500 focus:border-transparent resize-none"
        />
      ) : (
        <div className="space-y-2">
          {question.options?.map((option) => (
            <button
              key={option}
              onClick={() => handleOptionClick(option)}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all
                ${
                  selectedOptions.includes(option)
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-medium'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className="mt-6 w-full py-3 bg-emerald-700 text-white rounded-lg font-medium
          hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Processing...' : 'Continue'}
      </button>
    </div>
  );
}
