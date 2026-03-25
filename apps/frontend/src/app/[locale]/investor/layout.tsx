"use client";
import './investor.css';
import React from 'react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/(investor)/Header';
import Sidebar from '@/components/(investor)/Sidebar';
import Footer from '@/components/(investor)/Footer';
import { SidebarProvider, useSidebar } from '@/context/SidebarContext';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from '@/navigation';

function InvestorLayoutContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    const isInvestorUser =
      String(user?.userType || '').toUpperCase() === 'INVESTOR' ||
      String(user?.roleName || '').toLowerCase() === 'investor';

    if (!user || !isInvestorUser) {
      if (pathname?.includes('/investor')) {
        router.replace('/login');
      }
    }
  }, [loading, user, router, pathname]);

  useEffect(() => {
    // Defensive cleanup for orphan bootstrap backdrops that can block investor pages
    if (typeof document === 'undefined') return;
    const cleanupOrphanBackdrops = () => {
      const hasBootstrapModal = !!document.querySelector('.modal.show, .modal.d-block');
      if (hasBootstrapModal) return;

      const backdrops = document.querySelectorAll('.modal-backdrop');
      if (backdrops.length > 0) {
        backdrops.forEach((el) => el.parentElement?.removeChild(el));
      }

      document.body.classList.remove('modal-open');
      if (document.body.style.overflow === 'hidden') {
        document.body.style.overflow = '';
      }
      if (document.body.style.paddingRight) {
        document.body.style.paddingRight = '';
      }
    };

    cleanupOrphanBackdrops();

    let rafId: number | null = null;
    const scheduleCleanup = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        rafId = null;
        cleanupOrphanBackdrops();
      });
    };

    const observer = new MutationObserver(() => {
      // Throttle repeated DOM mutations to avoid UI lag on clicks/navigation.
      scheduleCleanup();
    });
    // Modal backdrops are direct body children; avoid subtree observation for performance.
    observer.observe(document.body, { childList: true, subtree: false });

    return () => {
      observer.disconnect();
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [pathname]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  const isInvestorUser =
    String(user?.userType || '').toUpperCase() === 'INVESTOR' ||
    String(user?.roleName || '').toLowerCase() === 'investor';

  if (!user || !isInvestorUser) {
    return null;
  }

  return (
    <div className="tailwind-scope" style={{ minHeight: '100vh' }}>
      {/* Sidebar - hidden on mobile, visible on desktop */}
      <Sidebar />

      {/* Main Content - margin adjusts based on sidebar state */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          transition: 'margin-left 0.3s ease-in-out',
        }}
        className={`investor-main-content ${collapsed ? 'sidebar-collapsed' : ''}`}
      >
        <Header />

        <main style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}

export default function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <InvestorLayoutContent>{children}</InvestorLayoutContent>
    </SidebarProvider>
  );
}
