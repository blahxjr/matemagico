import { describe, expect, it, vi } from 'vitest';
import { InMemorySchoolRepository } from '../infrastructure/in-memory-school.repository';
import {
  CreateSchoolService,
  DeactivateSchoolService,
  FindSchoolBySlugService,
  GetSchoolService,
  SchoolDirectory,
} from './school.services';
import { School } from '../domain/school';

const NOW = new Date('2026-10-10T12:00:00Z');

function setup() {
  const schools = new InMemorySchoolRepository();
  const events = { publishSchoolCreated: vi.fn(async () => undefined) };
  let n = 0;
  const create = new CreateSchoolService({
    schools,
    events,
    clock: { now: () => NOW },
    ids: { next: () => `school-${++n}` },
  });
  return { schools, events, create };
}

describe('School domain', () => {
  it('normalizes slug and starts ACTIVE', () => {
    const school = School.create({
      schoolId: 's',
      name: ' Escola ',
      slug: ' Escola-Demo ',
      now: NOW,
    });
    expect(school).toMatchObject({ name: 'Escola', slug: 'escola-demo', status: 'ACTIVE' });
  });

  it.each(['ab', 'has space', 'under_score', '-lead', 'trail-', 'dou--ble', 'x'.repeat(64), ''])(
    'rejects slug %j',
    (slug) => {
      expect(() => School.create({ schoolId: 's', name: 'E', slug, now: NOW })).toThrowError(
        expect.objectContaining({ code: 'SCH-001' }),
      );
    },
  );

  it('rejects invalid names and ids', () => {
    expect(() => School.create({ schoolId: 's', name: ' ', slug: 'abc', now: NOW })).toThrow();
    expect(() => School.create({ schoolId: 's', name: 1, slug: 'abc', now: NOW })).toThrow();
    expect(() =>
      School.create({ schoolId: 's', name: 'x'.repeat(161), slug: 'abc', now: NOW }),
    ).toThrow();
    expect(() => School.create({ schoolId: '', name: 'E', slug: 'abc', now: NOW })).toThrow();
    expect(() => School.create({ schoolId: 's', name: 'E', slug: 7, now: NOW })).toThrow();
  });
});

describe('CreateSchool', () => {
  it('creates a school and publishes SchoolCreated', async () => {
    const { create, events } = setup();
    const view = await create.execute({ name: 'Escola Demo', slug: 'escola-demo' });
    expect(view).toMatchObject({ schoolId: 'school-1', slug: 'escola-demo', status: 'ACTIVE' });
    expect(events.publishSchoolCreated).toHaveBeenCalledWith({
      schoolId: 'school-1',
      occurredAt: NOW,
    });
  });

  it('rejects duplicate slugs, repository conflicts and failures', async () => {
    const { create, schools, events } = setup();
    await create.execute({ name: 'A', slug: 'escola-a' });
    await expect(create.execute({ name: 'B', slug: 'ESCOLA-A' })).rejects.toMatchObject({
      code: 'SCH-003',
    });

    vi.spyOn(schools, 'add').mockResolvedValueOnce('CONFLICT');
    await expect(create.execute({ name: 'C', slug: 'escola-c' })).rejects.toMatchObject({
      code: 'SCH-003',
    });

    events.publishSchoolCreated.mockRejectedValueOnce(new Error('bus'));
    await expect(create.execute({ name: 'D', slug: 'escola-d' })).resolves.toBeDefined();

    vi.spyOn(schools, 'findBySlug').mockRejectedValue(new Error('db'));
    await expect(create.execute({ name: 'E', slug: 'escola-e' })).rejects.toMatchObject({
      code: 'SCH-004',
    });
    await expect(create.execute(undefined as never)).rejects.toMatchObject({ code: 'SCH-001' });
  });
});

describe('GetSchool / FindSchoolBySlug / SchoolDirectory', () => {
  it('gets and finds schools', async () => {
    const { create, schools } = setup();
    await create.execute({ name: 'A', slug: 'escola-a' });
    expect((await new GetSchoolService({ schools }).execute({ schoolId: 'school-1' })).slug).toBe(
      'escola-a',
    );
    expect(
      (await new FindSchoolBySlugService({ schools }).execute({ slug: 'Escola-A' })).schoolId,
    ).toBe('school-1');
    await expect(
      new GetSchoolService({ schools }).execute({ schoolId: 'x' }),
    ).rejects.toMatchObject({ code: 'SCH-002' });
    await expect(new GetSchoolService({ schools }).execute({ schoolId: '' })).rejects.toMatchObject(
      { code: 'SCH-001' },
    );
    await expect(
      new FindSchoolBySlugService({ schools }).execute({ slug: 'zzz' }),
    ).rejects.toMatchObject({ code: 'SCH-002' });
    await expect(
      new FindSchoolBySlugService({ schools }).execute({ slug: '!' }),
    ).rejects.toMatchObject({ code: 'SCH-001' });
  });

  it('directory reports enabled schools only', async () => {
    const { create, schools } = setup();
    await create.execute({ name: 'A', slug: 'escola-a' });
    const directory = new SchoolDirectory(schools);
    expect(await directory.isEnabledSchool('school-1')).toBe(true);
    expect(await directory.isEnabledSchool('nope')).toBe(false);
    expect(await directory.exists('school-1')).toBe(true);
    expect(await directory.exists('nope')).toBe(false);
    expect((await directory.findSchoolById('school-1'))?.slug).toBe('escola-a');
    expect(await directory.findSchoolById('nope')).toBeNull();
    expect((await directory.findSchoolBySlug('ESCOLA-A'))?.schoolId).toBe('school-1');
    expect(await directory.findSchoolBySlug('nope-nope')).toBeNull();
  });
});

describe('DeactivateSchool', () => {
  const actor = { userId: 'admin' };

  function deactivation(allowed: boolean) {
    const base = setup();
    const authorizer = { canManageSchool: vi.fn(async () => allowed) };
    const service = new DeactivateSchoolService({
      schools: base.schools,
      authorizer,
      clock: { now: () => NOW },
    });
    return { ...base, authorizer, service };
  }

  it('deactivates when the actor can manage the school, idempotently', async () => {
    const { create, service, authorizer, schools } = deactivation(true);
    await create.execute({ name: 'A', slug: 'escola-a' });
    expect((await service.execute({ schoolId: 'school-1', actor })).status).toBe('INACTIVE');
    expect((await service.execute({ schoolId: 'school-1', actor })).status).toBe('INACTIVE');
    expect(authorizer.canManageSchool).toHaveBeenCalledWith(actor, 'school-1');
    expect(await new SchoolDirectory(schools).isEnabledSchool('school-1')).toBe(false);
  });

  it('denies unauthorized and anonymous actors without touching the school', async () => {
    const { create, service, schools } = deactivation(false);
    await create.execute({ name: 'A', slug: 'escola-a' });
    await expect(service.execute({ schoolId: 'school-1', actor })).rejects.toMatchObject({
      code: 'SCH-005',
    });
    await expect(service.execute({ schoolId: 'school-1', actor: null })).rejects.toMatchObject({
      code: 'SCH-005',
    });
    await expect(
      service.execute({ schoolId: 'school-1', actor: { userId: ' ' } }),
    ).rejects.toMatchObject({ code: 'SCH-005' });
    expect((await schools.findById('school-1'))?.status).toBe('ACTIVE');
  });

  it('validates input, reports missing schools and authorizer failures', async () => {
    const { service, authorizer } = deactivation(true);
    await expect(service.execute({ schoolId: '', actor })).rejects.toMatchObject({
      code: 'SCH-001',
    });
    await expect(service.execute({ schoolId: 'nope', actor })).rejects.toMatchObject({
      code: 'SCH-002',
    });
    authorizer.canManageSchool.mockRejectedValueOnce(new Error('down'));
    await expect(service.execute({ schoolId: 'nope', actor })).rejects.toMatchObject({
      code: 'SCH-004',
    });
  });
});
