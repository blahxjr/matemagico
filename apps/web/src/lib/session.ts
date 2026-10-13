import { cookies } from 'next/headers';
import { apiRequest } from './api';
import { SESSION_COOKIE } from './config';

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  roles: string[];
  schools: {
    schoolId: string;
    name: string;
    slug: string;
    membershipId: string;
    roles: string[];
  }[];
}

export async function getSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function getSessionUser(): Promise<
  { user: SessionUser; errorCode: null } | { user: null; errorCode: string }
> {
  const token = await getSessionToken();
  if (!token) return { user: null, errorCode: 'AUTH-003' };
  const result = await apiRequest<SessionUser>('/auth/me', { token });
  if (!result.data) return { user: null, errorCode: result.errorCode ?? 'AUTH-003' };
  return { user: result.data, errorCode: null };
}
