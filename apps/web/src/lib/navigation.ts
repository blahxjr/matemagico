export type Role = 'STUDENT' | 'TEACHER' | 'SCHOOL_ADMIN';

export interface NavItem {
  key: string;
  label: string;
  href: string;
}

const DASHBOARD: NavItem = { key: 'dashboard', label: 'Dashboard', href: '/app/dashboard' };
const QUESTIONS: NavItem = { key: 'questions', label: 'Questões', href: '/app/questions' };
const EDITORIAL: NavItem = { key: 'editorial', label: 'Editorial', href: '/app/editorial' };
const EXAMS: NavItem = { key: 'exams', label: 'Simulados', href: '/app/exams' };
const MANAGE_EXAMS: NavItem = {
  key: 'manage-exams',
  label: 'Gestão de simulados',
  href: '/app/admin/exams',
};
const RANKINGS: NavItem = { key: 'rankings', label: 'Rankings', href: '/app/admin/rankings' };
const PERFORMANCE: NavItem = {
  key: 'performance',
  label: 'Desempenho',
  href: '/app/admin/performance',
};
const ADMIN: NavItem = { key: 'admin', label: 'Administração', href: '/app/admin' };
const PROFILE: NavItem = { key: 'profile', label: 'Perfil', href: '/app/profile' };

const ROLE_RANK: Role[] = ['SCHOOL_ADMIN', 'TEACHER', 'STUDENT'];

/** Highest-privilege known role; users without a recognised role are treated as STUDENT. */
export function primaryRole(roles: readonly string[]): Role {
  return ROLE_RANK.find((role) => roles.includes(role)) ?? 'STUDENT';
}

export function navigationFor(roles: readonly string[]): NavItem[] {
  switch (primaryRole(roles)) {
    case 'SCHOOL_ADMIN':
      return [DASHBOARD, QUESTIONS, EDITORIAL, EXAMS, ADMIN, PROFILE];
    case 'TEACHER':
      return [DASHBOARD, QUESTIONS, EDITORIAL, EXAMS, MANAGE_EXAMS, RANKINGS, PERFORMANCE, PROFILE];
    default:
      return [DASHBOARD, QUESTIONS, EXAMS, PROFILE];
  }
}

/** Staff areas under /app/admin that teachers may open besides school administrators. */
const STAFF_ADMIN_PATHS = ['/app/admin/exams', '/app/admin/rankings', '/app/admin/performance'];

const isUnder = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

export function isStaff(roles: readonly string[]): boolean {
  return primaryRole(roles) !== 'STUDENT';
}

export function canAccess(roles: readonly string[], pathname: string): boolean {
  if (isStaff(roles) && STAFF_ADMIN_PATHS.some((href) => isUnder(pathname, href))) return true;
  return navigationFor(roles).some((entry) => isUnder(pathname, entry.href));
}

export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: 'Aluno',
  TEACHER: 'Professor',
  SCHOOL_ADMIN: 'Administrador da escola',
};
