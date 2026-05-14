import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router';
import HomePage from './pages/HomePage';

describe('HomePage', () => {
  it('renders home heading', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /welcome to instigi/i })).toBeInTheDocument();
  });
});
