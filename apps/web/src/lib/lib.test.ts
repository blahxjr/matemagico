import { describe, expect, it } from 'vitest';
import { authGuard, safeNext } from './auth-guard';
import { messageForError, GENERIC_ERROR } from './errors';
import { canAccess, navigationFor, primaryRole } from './navigation';

const labels = (roles: string[]) => navigationFor(roles).map((item) => item.label);

describe('navigationFor', () => {
  it('STUDENT sees four items', () => {
    expect(labels(['STUDENT'])).toEqual(['Dashboard', 'Questões', 'Simulados', 'Perfil']);
  });

  it('TEACHER adds Editorial', () => {
    expect(labels(['TEACHER'])).toEqual([
      'Dashboard',
      'Questões',
      'Editorial',
      'Simulados',
      'Gestão de simulados',
      'Rankings',
      'Desempenho',
      'Perfil',
    ]);
  });

  it('SCHOOL_ADMIN adds Editorial and Administração', () => {
    expect(labels(['STUDENT', 'SCHOOL_ADMIN'])).toEqual([
      'Dashboard',
      'Questões',
      'Editorial',
      'Simulados',
      'Administração',
      'Perfil',
    ]);
  });

  it('falls back to STUDENT without roles', () => {
    expect(primaryRole([])).toBe('STUDENT');
    expect(canAccess([], '/app/editorial')).toBe(false);
    expect(canAccess(['TEACHER'], '/app/editorial')).toBe(true);
    expect(canAccess(['TEACHER'], '/app/admin')).toBe(false);
  });
});

describe('authGuard', () => {
  it('redirects protected routes without session to /login', () => {
    expect(authGuard('/app/dashboard', false)).toEqual({
      action: 'redirect',
      to: '/login?next=%2Fapp%2Fdashboard',
    });
    expect(authGuard('/app', false).action).toBe('redirect');
  });

  it('allows protected routes with session and public routes', () => {
    expect(authGuard('/app/dashboard', true)).toEqual({ action: 'next' });
    expect(authGuard('/login', false)).toEqual({ action: 'next' });
    expect(authGuard('/application', false)).toEqual({ action: 'next' });
  });

  it('only accepts safe next paths', () => {
    expect(safeNext('/app/questions')).toBe('/app/questions');
    expect(safeNext('https://evil.test')).toBe('/app/dashboard');
    expect(safeNext('//evil.test')).toBe('/app/dashboard');
    expect(safeNext(null)).toBe('/app/dashboard');
  });
});

describe('messageForError', () => {
  it('maps known codes and prefixes', () => {
    expect(messageForError('AUTH-001')).toBe('Credenciais inválidas.');
    expect(messageForError('MEM-999')).toContain('vínculo');
    expect(messageForError('SC-999')).toContain('escola');
    expect(messageForError('QST-999')).toContain('questão');
    expect(messageForError('ATT-999')).toContain('tentativa');
    expect(messageForError('XYZ')).toBe(GENERIC_ERROR);
    expect(messageForError(null)).toBe(GENERIC_ERROR);
  });
});
