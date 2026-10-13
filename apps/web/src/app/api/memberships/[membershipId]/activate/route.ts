import { activateMembershipHandler } from '../../../../../lib/bff-admin';

export async function POST(
  request: Request,
  context: { params: Promise<{ membershipId: string }> },
) {
  return activateMembershipHandler(request, (await context.params).membershipId);
}
