import { createExamHandler } from '../../../lib/bff-admin';

export async function POST(request: Request) {
  return createExamHandler(request);
}
