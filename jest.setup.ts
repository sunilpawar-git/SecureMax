/**
 * Jest setup — runs after the test framework is installed in each test file.
 *
 * Registers @testing-library/jest-dom matchers (toBeInTheDocument, toHaveClass,
 * etc.). These are inert for the 57 default node-environment tests and only take
 * effect in files that opt into jsdom via `/** @jest-environment jsdom *​/`.
 */
import '@testing-library/jest-dom';
