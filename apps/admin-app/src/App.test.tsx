import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders admin heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /instigi admin/i })).toBeInTheDocument();
  });
});
