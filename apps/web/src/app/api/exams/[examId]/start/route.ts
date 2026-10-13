import { startAttemptHandler } from '../../../../../lib/bff-attempts';

export async function POST(request: Request, context: { params: Promise<{ examId: string }> }) {
  return startAttemptHandler(request, (await context.params).examId);
}
