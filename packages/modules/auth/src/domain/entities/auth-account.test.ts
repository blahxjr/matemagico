import { describe, expect, it } from 'vitest';
import { AuthAccount } from './auth-account';

describe('AuthAccount', () => {
  it('represents the credentials provider and an externally owned User reference', () => {
    const account = AuthAccount.create({
      authAccountId: 'auth-account-1',
      userId: 'user-1',
      provider: 'credentials',
      subject: 'subject-1',
    });

    expect(account.provider).toBe('credentials');
    expect(account.userId).toBe('user-1');
    expect(account.subject).toBe('subject-1');
  });

  it('rejects providers and identifiers outside the MVP model', () => {
    expect(() =>
      AuthAccount.create({
        authAccountId: 'auth-account-1',
        userId: 'user-1',
        provider: 'google',
        subject: 'subject-1',
      }),
    ).toThrow('Unsupported Auth provider');
    expect(() =>
      AuthAccount.create({
        authAccountId: 'auth-account-1',
        userId: ' ',
        provider: 'credentials',
        subject: 'subject-1',
      }),
    ).toThrow('userId must not be empty');
  });
});
