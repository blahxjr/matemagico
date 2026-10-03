import { MembershipDomainError } from '../errors/membership-domain-error';

type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type MembershipId = Brand<string, 'MembershipId'>;
export type UserId = Brand<string, 'UserId'>;
export type SchoolId = Brand<string, 'SchoolId'>;
export type RoleId = Brand<string, 'RoleId'>;
export type GrantId = Brand<string, 'GrantId'>;

function identifier<T extends string>(value: string, name: string): Brand<string, T> {
  if (typeof value !== 'string' || !value.trim()) {
    throw new MembershipDomainError(`${name} must not be empty.`);
  }
  return value as Brand<string, T>;
}

export const membershipId = (value: string): MembershipId =>
  identifier<'MembershipId'>(value, 'membershipId');
export const userId = (value: string): UserId => identifier<'UserId'>(value, 'userId');
export const schoolId = (value: string): SchoolId => identifier<'SchoolId'>(value, 'schoolId');
export const roleId = (value: string): RoleId => identifier<'RoleId'>(value, 'roleId');
export const grantId = (value: string): GrantId => identifier<'GrantId'>(value, 'grantId');
