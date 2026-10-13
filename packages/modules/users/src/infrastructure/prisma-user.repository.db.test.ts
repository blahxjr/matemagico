import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';
import { User } from '../domain/user';
import { PrismaUserRepository } from './prisma-user.repository';

const databaseUrl = process.env.TEST_DATABASE_URL;
const prisma = databaseUrl ? new PrismaClient({ datasourceUrl: databaseUrl }) : null;
afterAll(() => prisma?.$disconnect());

describe.skipIf(!prisma)('PrismaUserRepository (PostgreSQL)', () => {
  const repository = new PrismaUserRepository(prisma!);
  const make = () =>
    User.create({
      userId: randomUUID(),
      email: `${randomUUID()}@repo.test`,
      name: 'Repo User',
      now: new Date(),
    });

  it('adds and finds by id and by e-mail', async () => {
    const user = make();
    expect(await repository.add(user)).toBe('CREATED');
    expect((await repository.findById(user.id))?.email).toBe(user.email);
    expect((await repository.findByEmail(user.email))?.id).toBe(user.id);
    expect(await repository.findById(randomUUID())).toBeNull();
    expect(await repository.findByEmail('missing@repo.test')).toBeNull();
  });

  it('reports a duplicate e-mail as CONFLICT', async () => {
    const user = make();
    await repository.add(user);
    const duplicate = User.create({
      userId: randomUUID(),
      email: user.email,
      name: 'Other',
      now: new Date(),
    });
    expect(await repository.add(duplicate)).toBe('CONFLICT');
  });

  it('persists deactivation', async () => {
    const user = make();
    await repository.add(user);
    await repository.save(user.deactivate(new Date()));
    expect((await repository.findById(user.id))?.status).toBe('INACTIVE');
  });
});
