'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';
import { AdminSandbox } from '@/components/admin/AdminSandbox';

export default function AdminSandboxPage() {
  return (
    <>
      <AdminTabs activeTab="sandbox" />
      <AdminSandbox />
    </>
  );
}
