"use client";

import React, { useEffect } from "react";
import Script from "next/script";
import { usePathname, useSelectedLayoutSegments } from "next/navigation";
import Header from "@/components/homepage/Header";
import Footer from "@/components/homepage/Footer";

export default function LayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const segments = useSelectedLayoutSegments();

  const isDashboard = segments.includes("admin")
    || segments.includes("user")
    || segments.includes("investor")
    || segments.includes("department");


  useEffect(() => {
    const handleScroll = () => {
      document.body.classList.toggle("sticky-header", window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isDashboard) {
      document.body.classList.add("dashboard-page");
    } else {
      document.body.classList.remove("dashboard-page");
    }
  }, [isDashboard]);

  return (
    <>
      {!isDashboard && <Header />}
      <main>{children}</main>
      {!isDashboard && <Footer />}

      <Script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
        strategy="afterInteractive"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js"
        strategy="afterInteractive"
      />
    </>
  );
}
