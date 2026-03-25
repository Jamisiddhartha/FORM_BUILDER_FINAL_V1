"use client";

export default function Footer() {
  return (
    <footer className="mt-auto investor-bg rounded-[20px] px-6 py-4 m-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-3 text-slate-700">
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center font-semibold">S</div>
          <div className="leading-tight">
            <p className="font-medium">Single Window Clearance System</p>
            <p className="text-xs text-slate-500">Government of India</p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-slate-500">
          <a href="#" className="hover:text-primary transition-colors">Privacy</a>
          <a href="#" className="hover:text-primary transition-colors">Terms</a>
          <a href="#" className="hover:text-primary transition-colors">Support</a>
          <a href="#" className="hover:text-primary transition-colors">RTI</a>
        </div>

        <p className="text-xs text-slate-500">© 2026 All Rights Reserved</p>
      </div>
    </footer>
  );
}
