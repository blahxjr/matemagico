import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './page';

describe('home page', () => {
  it('renders the MVP login entry point', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: 'MateMágico Champions' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
  });
});
