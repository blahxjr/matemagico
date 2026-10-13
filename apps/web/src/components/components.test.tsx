import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/app/dashboard',
}));

import { AppNav } from './AppNav';
import { LoginForm } from './LoginForm';
import { LogoutButton } from './LogoutButton';
import { RegisterForm } from './RegisterForm';
import { navigationFor } from '../lib/navigation';

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('LoginForm', () => {
  it('shows field errors and does not call the BFF when invalid', async () => {
    const fetchMock = mockFetch(200, {});
    render(<LoginForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe o e-mail.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('logs in through the BFF and navigates', async () => {
    const fetchMock = mockFetch(200, { result: 'AUTHENTICATED' });
    render(<LoginForm next="/app/questions" />);
    await userEvent.type(screen.getByLabelText('E-mail'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/app/questions'));
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe('/api/auth/login');
  });

  it('shows the mapped API error', async () => {
    mockFetch(401, { error: { code: 'AUTH-001', message: 'Credenciais inválidas.' } });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText('E-mail'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'bad');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciais inválidas.');
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('RegisterForm', () => {
  it('validates password length', async () => {
    const fetchMock = mockFetch(201, {});
    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText('Nome'), 'Ana');
    await userEvent.type(screen.getByLabelText('E-mail'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'curta');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText(/ao menos 12/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('registers and redirects to login', async () => {
    mockFetch(201, { result: 'REGISTERED' });
    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText('Nome'), 'Ana');
    await userEvent.type(screen.getByLabelText('E-mail'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'a-long-password-1');
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/login?registered=1'));
  });
});

describe('LogoutButton', () => {
  it('calls the BFF and returns to /login', async () => {
    const fetchMock = mockFetch(200, { result: 'REVOKED' });
    render(<LogoutButton />);
    await userEvent.click(screen.getByRole('button', { name: 'Sair da conta' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe('/api/auth/logout');
  });
});

describe('AppNav', () => {
  it('renders role-based links with aria-current and a keyboard-operable toggle', async () => {
    render(<AppNav items={navigationFor(['TEACHER'])} />);

    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Editorial' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gestão de simulados' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rankings' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Desempenho' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Administração' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');

    const toggle = screen.getByRole('button', { name: 'Abrir menu' });
    toggle.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
