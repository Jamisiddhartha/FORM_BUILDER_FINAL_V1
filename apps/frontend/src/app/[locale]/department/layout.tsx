"use client";

import { ReactNode } from 'react';
import '../investor/investor.css'; // Re-use investor styles for consistent dashboard look
import DepartmentHeader from '@/components/(department)/Header';
import DepartmentSidebar from '@/components/(department)/Sidebar';
import { SidebarProvider, useSidebar } from '@/context/SidebarContext';

function DepartmentLayoutContent({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="tailwind-scope" style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <DepartmentSidebar />

      {/* Main Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          transition: 'margin-left 0.3s ease-in-out',
        }}
        className={`investor-main-content ${collapsed ? 'sidebar-collapsed' : ''}`}
      >
        <DepartmentHeader />

        <main className='bg-white' style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DepartmentLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <DepartmentLayoutContent>{children}</DepartmentLayoutContent>
    </SidebarProvider>
  );
}
