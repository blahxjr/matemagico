import { describe, expect, it, vi } from 'vitest';
import { InMemoryUserRepository } from '../infrastructure/in-memory-user.repository';
import {
  CreateUserService,
  DeactivateUserService,
  FindUserByEmailService,
  GetUserService,
  UserDirectory,
} from './user.services';
import { User } from '../domain/user';

const NOW = new Date('2026-10-10T12:00:00Z');

function setup() {
  const users = new InMemoryUserRepository();
  const events = { publishUserRegistered: vi.fn(async () => undefined) };
  let n = 0;
  const create = new CreateUserService({
    users,
    events,
    clock: { now: () => NOW },
    ids: { next: () => `user-${++n}` },
  });
  return { users, events, create };
}

describe('User domain', () => {
  it('normalizes e-mail and trims name', () => {
    const user = User.create({ userId: 'u', email: '  Ana@Escola.COM ', name: ' Ana ', now: NOW });
    expect(user.email).toBe('ana@escola.com');
    expect(user.name).toBe('Ana');
    expect(user.status).toBe('ACTIVE');
  });

  it.each([
    ['bad e-mail', { email: 'nope', name: 'A' }],
    ['non-string e-mail', { email: 42, name: 'A' }],
    ['blank name', { email: 'a@b.co', name: '  ' }],
    ['long name', { email: 'a@b.co', name: 'x'.repeat(121) }],
    ['non-string name', { email: 'a@b.co', name: null }],
  ])('rejects %s', (_label, input) => {
    expect(() => User.create({ userId: 'u', now: NOW, ...input })).toThrowError(
      expect.objectContaining({ code: 'USR-001' }),
    );
  });

  it('rejects blank id and unknown status', () => {
    expect(() => User.create({ userId: ' ', email: 'a@b.co', name: 'A', now: NOW })).toThrow();
    expect(() =>
      User.create({ userId: 'u', email: 'a@b.co', name: 'A', now: NOW, status: 'X' as never }),
    ).toThrow();
  });
});

describe('CreateUser', () => {
  it('creates a user and publishes UserRegistered', async () => {
    const { create, events, users } = setup();
    const view = await create.execute({ email: 'Ana@Escola.com', name: 'Ana' });
    expect(view).toMatchObject({ userId: 'user-1', email: 'ana@escola.com', status: 'ACTIVE' });
    expect(await users.findById('user-1')).not.toBeNull();
    expect(events.publishUserRegistered).toHaveBeenCalledWith({
      userId: 'user-1',
      occurredAt: NOW,
    });
  });

  it('supports PENDING users', async () => {
    const { create } = setup();
    expect((await create.execute({ email: 'a@b.co', name: 'A', status: 'PENDING' })).status).toBe(
      'PENDING',
    );
  });

  it('rejects an invalid status and missing input', async () => {
    const { create } = setup();
    await expect(
      create.execute({ email: 'a@b.co', name: 'A', status: 'INACTIVE' as never }),
    ).rejects.toMatchObject({ code: 'USR-001' });
    await expect(create.execute(undefined as never)).rejects.toMatchObject({ code: 'USR-001' });
  });

  it('rejects duplicate e-mails regardless of case', async () => {
    const { create } = setup();
    await create.execute({ email: 'a@b.co', name: 'A' });
    await expect(create.execute({ email: 'A@B.CO', name: 'B' })).rejects.toMatchObject({
      code: 'USR-003',
    });
  });

  it('maps a conflict reported by the repository (race) to USR-003', async () => {
    const { create, users } = setup();
    vi.spyOn(users, 'add').mockResolvedValue('CONFLICT');
    await expect(create.execute({ email: 'a@b.co', name: 'A' })).rejects.toMatchObject({
      code: 'USR-003',
    });
  });

  it('maps repository failures to USR-004 and still succeeds if the event fails', async () => {
    const { create, users, events } = setup();
    events.publishUserRegistered.mockRejectedValueOnce(new Error('bus down'));
    await expect(create.execute({ email: 'a@b.co', name: 'A' })).resolves.toBeDefined();
    vi.spyOn(users, 'findByEmail').mockRejectedValue(new Error('db'));
    await expect(create.execute({ email: 'c@d.co', name: 'C' })).rejects.toMatchObject({
      code: 'USR-004',
    });
  });
});

describe('GetUser / FindUserByEmail / DeactivateUser / UserDirectory', () => {
  it('gets and finds users', async () => {
    const { create, users } = setup();
    await create.execute({ email: 'a@b.co', name: 'A' });
    expect((await new GetUserService({ users }).execute({ userId: 'user-1' })).email).toBe(
      'a@b.co',
    );
    expect(
      (await new FindUserByEmailService({ users }).execute({ email: ' A@B.co ' })).userId,
    ).toBe('user-1');
  });

  it('reports not found and invalid input', async () => {
    const { users } = setup();
    await expect(new GetUserService({ users }).execute({ userId: 'x' })).rejects.toMatchObject({
      code: 'USR-002',
    });
    await expect(new GetUserService({ users }).execute({ userId: '' })).rejects.toMatchObject({
      code: 'USR-001',
    });
    await expect(
      new FindUserByEmailService({ users }).execute({ email: 'a@b.co' }),
    ).rejects.toMatchObject({ code: 'USR-002' });
    await expect(
      new FindUserByEmailService({ users }).execute({ email: 'bad' }),
    ).rejects.toMatchObject({ code: 'USR-001' });
  });

  it('deactivates idempotently and the directory stops reporting the user active', async () => {
    const { create, users } = setup();
    await create.execute({ email: 'a@b.co', name: 'A' });
    const directory = new UserDirectory(users);
    expect(await directory.isActiveUser('user-1')).toBe(true);

    const deactivate = new DeactivateUserService({ users, clock: { now: () => NOW } });
    expect((await deactivate.execute({ userId: 'user-1' })).status).toBe('INACTIVE');
    expect((await deactivate.execute({ userId: 'user-1' })).status).toBe('INACTIVE');
    await expect(deactivate.execute({ userId: 'nope' })).rejects.toMatchObject({ code: 'USR-002' });
    await expect(deactivate.execute({ userId: '' })).rejects.toMatchObject({ code: 'USR-001' });

    expect(await directory.isActiveUser('user-1')).toBe(false);
    expect(await directory.isActiveUser('missing')).toBe(false);
    expect(await directory.exists('user-1')).toBe(true);
    expect(await directory.exists('missing')).toBe(false);
    expect((await directory.findUserById('user-1'))?.status).toBe('INACTIVE');
    expect(await directory.findUserById('missing')).toBeNull();
    expect((await directory.findUserByEmail('A@b.co'))?.userId).toBe('user-1');
    expect(await directory.findUserByEmail('z@b.co')).toBeNull();
  });
});
