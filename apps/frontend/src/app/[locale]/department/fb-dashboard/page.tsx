"use client";

import dynamic from 'next/dynamic';

const FormBuilderDashboard = dynamic(
  () => import('@/components/(department)/dashboard/fb/FormBuilderDashboard'),
  { ssr: false }
);

export default function FbDashboardPage() {
  return <FormBuilderDashboard />;
}
