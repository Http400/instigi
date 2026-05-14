import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /instigi web app/i })).toBeInTheDocument();
  });
});
