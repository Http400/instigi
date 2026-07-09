import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ExercisesPage from './ExercisesPage';

describe('ExercisesPage', () => {
  it('renders the toolbar, table, placeholder rows and count footer', () => {
    render(<ExercisesPage />);

    expect(
      screen.getByPlaceholderText(/search exercises/i)
    ).toBeInTheDocument();

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();

    expect(
      screen.getByRole('columnheader', { name: /exercise/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /category/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /metrics/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /actions/i })
    ).toBeInTheDocument();

    expect(screen.getByText('Bench Press')).toBeInTheDocument();

    expect(screen.getByText('5 exercises')).toBeInTheDocument();
  });
});
