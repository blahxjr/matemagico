import { AuthDomainError } from '../errors/auth-domain-error';

type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type AuthAccountId = Brand<string, 'AuthAccountId'>;
export type PasswordCredentialId = Brand<string, 'PasswordCredentialId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type UserId = Brand<string, 'UserId'>;

function identifier<T extends string>(value: string, name: string): Brand<string, T> {
  if (!value.trim()) {
    throw new AuthDomainError(`${name} must not be empty.`);
  }

  return value as Brand<string, T>;
}

export const authAccountId = (value: string): AuthAccountId =>
  identifier<'AuthAccountId'>(value, 'authAccountId');

export const passwordCredentialId = (value: string): PasswordCredentialId =>
  identifier<'PasswordCredentialId'>(value, 'passwordCredentialId');

export const sessionId = (value: string): SessionId => identifier<'SessionId'>(value, 'sessionId');

export const userId = (value: string): UserId => identifier<'UserId'>(value, 'userId');
