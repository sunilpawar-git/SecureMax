import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import QuestionnaireClient from './questionnaire-client';

export default async function QuestionnairePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { consentAt: true, city: true },
  });

  if (!user?.consentAt) redirect('/onboarding/consent');
  if (!user?.city) redirect('/onboarding/profile');

  return <QuestionnaireClient />;
}
