import { grantRoleHandler } from '../../../../../lib/bff-admin';

export async function POST(
  request: Request,
  context: { params: Promise<{ membershipId: string }> },
) {
  return grantRoleHandler(request, (await context.params).membershipId);
}
