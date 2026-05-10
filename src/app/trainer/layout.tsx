import { ReactNode } from 'react';
import { AuthGuard } from '@/components/AuthGuard';

export default function TrainerLayout({ children }: { children: ReactNode }) {
  return <AuthGuard allowedRole="trainer">{children}</AuthGuard>;
}
