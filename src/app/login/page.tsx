import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { CRM_COOKIE, getCrmPassword, verifyCrmToken } from '@/lib/crmAuth';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  const cookieStore = await cookies();
  if (await verifyCrmToken(cookieStore.get(CRM_COOKIE)?.value, getCrmPassword())) {
    redirect('/');
  }

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
