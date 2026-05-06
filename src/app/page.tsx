import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  if (process.env.PAID !== 'true') return null;

  const session = await auth();

  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}

