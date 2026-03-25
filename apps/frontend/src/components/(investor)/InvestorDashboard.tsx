'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import InprincipleNewProjectModal from './inprinciple/InprincipleNewProjectModal';
import { InprincipleApplicationList } from './inprinciple/applicationcomponent';

const sliderSlides = [
  {
    title: 'Queries',
    total: '15',
    donut: [
      { color: '#2563EB', dashOffset: 60 },
      { color: '#60A5FA', dashOffset: 360 },
    ],
    stats: [
      { label: 'Open Queries', value: '5', color: 'bg-blue-400' },
      { label: 'Closed Queries', value: '10', color: 'bg-blue-600' },
    ],
  },
  {
    title: 'Grievances',
    total: '12',
    donut: [
      { color: '#E5E7EB', dashOffset: 0, base: true },
      { color: '#2563EB', dashOffset: 141 },
      { color: '#60A5FA', dashOffset: 235 },
    ],
    stats: [
      { label: 'Open Queries', value: '5', color: 'bg-blue-400' },
      { label: 'Closed Queries', value: '10', color: 'bg-blue-600' },
    ],
  },
  {
    title: 'Tickets',
    total: '20',
    donut: [
      { color: '#E5E7EB', dashOffset: 0, base: true },
      { color: '#2563EB', dashOffset: 70 },
      { color: '#60A5FA', dashOffset: 225 },
    ],
    stats: [
      { label: 'Open Queries', value: '5', color: 'bg-blue-400' },
      { label: 'Closed Queries', value: '10', color: 'bg-blue-600' },
    ],
  },
];

export const InvestorDashboard = () => {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [showNewProject, setShowNewProject] = useState(false);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [isRouting, setIsRouting] = useState(false);
  const [applicationCount, setApplicationCount] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSliderIndex((prev) => (prev + 1) % sliderSlides.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    // One-time defensive cleanup. Continuous cleanup is handled at layout level.
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.modal-backdrop').forEach((el) => el.remove());
    document.body.classList.remove('modal-open');
    if (document.body.style.overflow === 'hidden') document.body.style.overflow = '';
    if (document.body.style.paddingRight) document.body.style.paddingRight = '';
  }, []);

  useEffect(() => {
    if (!isRouting) return;
    const id = window.setTimeout(() => setIsRouting(false), 8000);
    return () => window.clearTimeout(id);
  }, [isRouting]);

  const nextSlide = () => setSliderIndex((prev) => (prev + 1) % sliderSlides.length);
  const prevSlide = () => setSliderIndex((prev) => (prev - 1 + sliderSlides.length) % sliderSlides.length);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white rounded-2xl min-h-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Welcome to Investor Monitoring Panel</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-gray-700">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-sm font-semibold">
                {applicationCount}
              </span>
              <span className="text-sm font-medium">Active Projects</span>
            </div>

            <button
              className="flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white bg-primary transition"
              onClick={() => setShowNewProject(true)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 24C8.8174 24 5.76516 22.7357 3.51472 20.4853C1.26428 18.2348 0 15.1826 0 12C0 8.8174 1.26428 5.76516 3.51472 3.51472C5.76516 1.26428 8.8174 0 12 0C15.1826 0 18.2348 1.26428 20.4853 3.51472C22.7357 5.76516 24 8.8174 24 12C24 15.1826 22.7357 18.2348 20.4853 20.4853C18.2348 22.7357 15.1826 24 12 24ZM12 21.6C14.5461 21.6 16.9879 20.5886 18.7882 18.7882C20.5886 16.9879 21.6 14.5461 21.6 12C21.6 9.45392 20.5886 7.01212 18.7882 5.21178C16.9879 3.41143 14.5461 2.4 12 2.4C9.45392 2.4 7.01212 3.41143 5.21178 5.21178C3.41143 7.01212 2.4 9.45392 2.4 12C2.4 14.5461 3.41143 16.9879 5.21178 18.7882C7.01212 20.5886 9.45392 21.6 12 21.6ZM13.2 10.8H15.6C15.9183 10.8 16.2235 10.9264 16.4485 11.1515C16.6736 11.3765 16.8 11.6817 16.8 12C16.8 12.3183 16.6736 12.6235 16.4485 12.8485C16.2235 13.0736 15.9183 13.2 15.6 13.2H13.2V15.6C13.2 15.9183 13.0736 16.2235 12.8485 16.4485C12.6235 16.6736 12.3183 16.8 12 16.8C11.6817 16.8 11.3765 16.6736 11.1515 16.4485C10.9264 16.2235 10.8 15.9183 10.8 15.6V13.2H8.4C8.08174 13.2 7.77652 13.0736 7.55147 12.8485C7.32643 12.6235 7.2 12.3183 7.2 12C7.2 11.6817 7.32643 11.3765 7.55147 11.1515C7.77652 10.9264 8.08174 10.8 8.4 10.8H10.8V8.4C10.8 8.08174 10.9264 7.77652 11.1515 7.55147C11.3765 7.32643 11.6817 7.2 12 7.2C12.3183 7.2 12.6235 7.32643 12.8485 7.55147C13.0736 7.77652 13.2 8.08174 13.2 8.4V10.8Z" fill="white" />
              </svg>
              Add Project
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 mt-10">
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <InprincipleApplicationList serviceId="943.0" onCountChange={setApplicationCount} />
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="rounded-[20px] bg-gray-50 p-6">
              <h4 className="text-lg font-semibold">Action Required</h4>
              <div className="mt-4 space-y-4">
                <div className="rounded-[20px] border border-gray-200 bg-white p-6">
                  <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                  <ul className="mt-4 max-h-36 divide-y divide-gray-200 overflow-y-auto pr-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <li key={`notif-${i}`} className="flex items-center justify-between gap-4 py-2">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-700"></span>
                          <span className="truncate">It is a long established fact ...</span>
                        </div>
                        <button className="rounded-full border bg-primary-outline px-4 py-1.5 text-xs font-semibold text-primary hover:text-white">
                          Reply
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[20px] border border-gray-200 bg-white p-6">
                  <h3 className="text-lg font-semibold text-gray-900">Pending Payments</h3>
                  <ul className="mt-4 max-h-36 divide-y divide-gray-200 overflow-y-auto pr-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <li key={`pay-${i}`} className="flex items-center justify-between gap-4 py-2">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-700"></span>
                          <span className="truncate">It is a long established fact ...</span>
                        </div>
                        <button className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${i === 0 ? 'bg-primary text-white' : 'bg-primary-outline text-primary hover:text-white'}`}>
                          Pay Now
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-[20px] border bg-white p-6">
              <h4 className="text-lg text-center font-semibold">Incentive</h4>
              <p className="mt-2 text-sm text-center text-gray-600">Uttarakhand Mega Industrial & Investment Policy, 2025</p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                {[
                  { label: 'Applied', value: '4', bg: 'bg-blue-50 border-blue-200', pill: 'bg-blue-400' },
                  { label: 'Rejected', value: '0', bg: 'bg-red-50 border-red-200', pill: 'bg-red-400' },
                  { label: 'Approved', value: '1', bg: 'bg-green-50 border-green-200', pill: 'bg-green-500' },
                  { label: 'In Progress', value: '1', bg: 'bg-yellow-50 border-yellow-200', pill: 'bg-yellow-500' },
                ].map((item) => (
                  <div key={item.label} className={`flex items-center justify-between rounded-full border ${item.bg} px-4 py-2`}>
                    <span className="text-sm font-medium text-gray-800">{item.label}</span>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full ${item.pill} text-sm font-semibold text-white`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative w-full overflow-hidden rounded-2xl border bg-white py-5 shadow-sm">
              <div
                className="flex w-full transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${sliderIndex * 100}%)` }}
              >
                {sliderSlides.map((slide) => (
                  <div key={slide.title} className="w-full shrink-0">
                    <h2 className="mb-6 text-center text-lg font-semibold">{slide.title}</h2>

                    <div className="relative mx-auto mb-6 h-40 w-40">
                      <svg className="h-full w-full -rotate-90">
                        {slide.donut.map((d, i) =>
                          d.base ? (
                            <circle key={`${slide.title}-base`} cx="80" cy="80" r="60" stroke={d.color} strokeWidth="24" fill="none" />
                          ) : (
                            <circle
                              key={`${slide.title}-${i}`}
                              cx="80"
                              cy="80"
                              r="60"
                              stroke={d.color}
                              strokeWidth="24"
                              strokeDasharray="282"
                              strokeDashoffset={d.dashOffset}
                              strokeLinecap="round"
                              fill="none"
                            />
                          ),
                        )}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold">{slide.total}</div>
                    </div>

                    <div className="space-y-4 px-5">
                      {slide.stats.map((stat, i) => (
                        <div key={stat.label}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`h-3 w-3 rounded-full ${stat.color}`}></span>
                              <span className="text-sm text-gray-700">{stat.label}</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">{stat.value}</span>
                          </div>
                          {i === 0 && <div className="h-px bg-gray-200 mt-4"></div>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={prevSlide}
                className="absolute left-4 top-6 flex h-9 w-9 items-center justify-center rounded-full bg-primary opacity-25 hover:opacity-100"
              >
                <svg width="6" height="10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0.233766 5.59702L4.67532 9.77612C4.98701 10.0746 5.45455 10.0746 5.76623 9.77612C6.07792 9.47761 6.07792 9.02985 5.76623 8.73134L1.94805 5L5.76623 1.26866C6.07792 0.970149 6.07792 0.522388 5.76623 0.22388C5.61039 0.0746267 5.45455 0 5.22078 0C4.98701 0 4.83117 0.0746267 4.67532 0.22388L0.233766 4.40299C-0.0779221 4.77612 -0.0779221 5.22388 0.233766 5.59702C0.233766 5.52239 0.233766 5.52239 0.233766 5.59702Z" fill="white" />
                </svg>
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-6 flex h-9 w-9 items-center justify-center rounded-full bg-primary opacity-25 hover:opacity-100"
              >
                <svg width="6" height="10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.76623 5.59702L1.32468 9.77612C1.01299 10.0746 0.545454 10.0746 0.233766 9.77612C-0.0779223 9.47761 -0.0779223 9.02985 0.233766 8.73134L4.05195 5L0.233766 1.26866C-0.0779223 0.970149 -0.0779223 0.522388 0.233766 0.22388C0.38961 0.0746267 0.545455 0 0.779221 0C1.01299 0 1.16883 0.0746267 1.32468 0.22388L5.76623 4.40299C6.07792 4.77612 6.07792 5.22388 5.76623 5.59702C5.76623 5.52239 5.76623 5.52239 5.76623 5.59702Z" fill="white" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <InprincipleNewProjectModal
        isOpen={showNewProject}
        onClose={() => setShowNewProject(false)}
        onProceed={({ proposalType, serviceId, departmentId }) => {
          setShowNewProject(false);
          setIsRouting(true);
          const params = new URLSearchParams({ proposal: proposalType, departmentId });
          if (serviceId) {
            params.set('serviceId', serviceId);
          }
          router.push(`/${locale}/investor/inprinciple/new?${params.toString()}`);
        }}
      />

      {isRouting && (
        <div className="investor-route-loader pointer-events-none">
          <div className="investor-route-loader-track">
            <img
              src="https://investuttarakhand.uk.gov.in/themes/new_investuk/img/logo-invest-uttarakhand.png"
              alt="Invest Uttarakhand"
              className="investor-route-loader-logo"
            />
          </div>
        </div>
      )}
    </div>
  );
};

