import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';
import { School } from '../domain/school';
import { PrismaSchoolRepository } from './prisma-school.repository';

const databaseUrl = process.env.TEST_DATABASE_URL;
const prisma = databaseUrl ? new PrismaClient({ datasourceUrl: databaseUrl }) : null;
afterAll(() => prisma?.$disconnect());

describe.skipIf(!prisma)('PrismaSchoolRepository (PostgreSQL)', () => {
  const repository = new PrismaSchoolRepository(prisma!);
  const make = (slug = `escola-${randomUUID()}`) =>
    School.create({ schoolId: randomUUID(), name: 'Repo School', slug, now: new Date() });

  it('adds and finds by id and by slug', async () => {
    const school = make();
    expect(await repository.add(school)).toBe('CREATED');
    expect((await repository.findById(school.id))?.slug).toBe(school.slug);
    expect((await repository.findBySlug(school.slug))?.id).toBe(school.id);
    expect(await repository.findById(randomUUID())).toBeNull();
    expect(await repository.findBySlug('nao-existe')).toBeNull();
  });

  it('reports a duplicate slug as CONFLICT', async () => {
    const school = make();
    await repository.add(school);
    expect(await repository.add(make(school.slug))).toBe('CONFLICT');
  });

  it('persists deactivation', async () => {
    const school = make();
    await repository.add(school);
    await repository.save(school.deactivate(new Date()));
    expect((await repository.findById(school.id))?.status).toBe('INACTIVE');
  });
});
