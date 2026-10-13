import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  Dropdown,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Textarea,
  ToastProvider,
  useToast,
} from './index';

describe('Button', () => {
  it('fires onClick and defaults to type=button', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Salvar</Button>);
    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button).toHaveAttribute('type', 'button');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled and busy while loading', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Enviar
      </Button>,
    );
    const button = screen.getByRole('button', { name: /Enviar/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('is reachable and activatable by keyboard', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Ok</Button>);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Ok' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalled();
  });
});

describe('Input and form fields', () => {
  it('associates label, hint and error', () => {
    render(<Input label="E-mail" hint="Use o e-mail da escola" error="Inválido" />);
    const input = screen.getByLabelText('E-mail');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Inválido Use o e-mail da escola');
    expect(screen.getByRole('alert')).toHaveTextContent('Inválido');
  });

  it('accepts typing', async () => {
    render(<Input label="Nome" />);
    await userEvent.type(screen.getByLabelText('Nome'), 'Ada');
    expect(screen.getByLabelText('Nome')).toHaveValue('Ada');
  });

  it('renders textarea, select and checkbox with labels', async () => {
    render(
      <>
        <Textarea label="Enunciado" />
        <Select label="Nível" options={[{ value: 'a', label: 'A' }]} />
        <Checkbox label="Aceito" />
      </>,
    );
    expect(screen.getByLabelText('Enunciado')).toBeInTheDocument();
    expect(screen.getByLabelText('Nível')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Aceito'));
    expect(screen.getByLabelText('Aceito')).toBeChecked();
  });
});

describe('Card, Badge, Alert, PageHeader, EmptyState', () => {
  it('renders content', () => {
    render(
      <>
        <Card aria-label="Resumo">conteúdo</Card>
        <Badge>novo</Badge>
        <Alert tone="error" title="Falha" />
        <PageHeader title="Painel" description="Desc" />
        <EmptyState title="Vazio" />
      </>,
    );
    expect(screen.getByLabelText('Resumo')).toHaveTextContent('conteúdo');
    expect(screen.getByText('novo')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Falha');
    expect(screen.getByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Vazio' })).toBeInTheDocument();
  });
});

describe('Dialog', () => {
  it('is hidden when closed, labelled when open and closes on Escape', async () => {
    const onClose = vi.fn();
    const { rerender } = render(<Dialog open={false} onClose={onClose} title="Confirmar" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(
      <Dialog open onClose={onClose} title="Confirmar" footer={<Button>OK</Button>}>
        texto
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Confirmar' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'OK' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Dropdown', () => {
  it('opens by click, navigates by arrows and selects', async () => {
    const first = vi.fn();
    const second = vi.fn();
    render(
      <Dropdown
        label="Conta"
        items={[
          { key: 'a', label: 'Perfil', onSelect: first },
          { key: 'b', label: 'Sair', onSelect: second },
        ]}
      />,
    );
    const trigger = screen.getByRole('button', { name: /Conta/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    expect(screen.getByRole('menuitem', { name: 'Perfil' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(second).toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes with Escape and returns focus to trigger', async () => {
    render(<Dropdown label="Menu" items={[{ key: 'a', label: 'Um', onSelect: () => {} }]} />);
    await userEvent.click(screen.getByRole('button', { name: /Menu/ }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('button', { name: /Menu/ })).toHaveFocus();
  });
});

describe('Toast', () => {
  function Trigger() {
    const toast = useToast();
    return <button onClick={() => toast.show('Salvo', 'success')}>mostrar</button>;
  }

  it('shows and dismisses a toast', async () => {
    render(
      <ToastProvider durationMs={0}>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText('mostrar'));
    expect(screen.getByRole('status')).toHaveTextContent('Salvo');
    await userEvent.click(screen.getByRole('button', { name: 'Fechar notificação' }));
    expect(screen.queryByText('Salvo')).toBeNull();
  });
});
