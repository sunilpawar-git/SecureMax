import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import QuestionnaireClient from './questionnaire-client';

export default async function QuestionnairePage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin');

  const { track } = await searchParams;
  const trackQuery = track ? `?track=${encodeURIComponent(track)}` : '';

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { consentAt: true },
  });

  if (!user?.consentAt) redirect(`/onboarding${trackQuery}`);

  return <QuestionnaireClient />;
}
