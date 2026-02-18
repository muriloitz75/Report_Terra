"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { usePermissions } from '@/context/PermissionsContext';

export default function Home() {
  const router = useRouter();
  const { status } = useSession();
  const { canViewProcesses, canViewDashboard, canViewReports } = usePermissions();

  useEffect(() => {
    if (status === 'loading') return;
    if (canViewProcesses) router.replace('/processos');
    else if (canViewDashboard) router.replace('/dashboard');
    else if (canViewReports) router.replace('/relatorios');
    else router.replace('/login');
  }, [router, status, canViewProcesses, canViewDashboard, canViewReports]);

  return null;
}
