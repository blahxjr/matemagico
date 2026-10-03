import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './page';

describe('home page', () => {
  it('renders the foundation entry point', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: 'MateMágico Champions' })).toBeInTheDocument();
    expect(screen.getByText('Next.js App Router')).toBeInTheDocument();
  });
});
