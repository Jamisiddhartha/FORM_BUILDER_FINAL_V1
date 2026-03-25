'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePathname, useRouter } from "@/navigation";
import { useLocale, useTranslations } from 'next-intl';

export default function DepartmentHeader() {
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const { user, logout } = useAuth();
    // const t = useTranslations('DepartmentDashboard');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const changeLanguage = (lang: string) => {
        router.replace(pathname, { locale: lang });
    };

    const getDisplayName = () => {
        if (!user) return 'User';
        if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
        if (user.firstName) return user.firstName;
        return user.email || 'User';
    };

    const handleLogout = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowProfile(false);
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <header className="bg-white investor-header rounded-[20px] px-6 py-2 m-3 mx-4 flex items-center justify-between shrink-0 shadow-sm border border-slate-200">
            {/* Left: Search */}
            <div className="relative w-[320px] hidden md:block">
                <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </span>
                <input
                    type="text"
                    placeholder="Search..."
                    className="w-full h-[50px] pl-12 pr-4 py-2 rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                />
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
                <select
                    className="h-10 rounded-full bg-white px-4 text-sm text-slate-600 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary"
                    value={locale}
                    onChange={(e) => changeLanguage(e.target.value)}
                >
                    <option value="en">Eng</option>
                    <option value="hi">Hin</option>
                </select>

                <button className="header-icon-btn">
                    <svg className="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v12H7l-3 3V4z" />
                    </svg>
                </button>

                <div className="relative">
                    <button
                        onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
                        className="header-icon-btn"
                    >
                        <svg className="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </button>
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                        3
                    </span>

                    {showNotifications && (
                        <div className="absolute right-0 top-full mt-3 w-80 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                <h4 className="text-slate-800 font-medium text-sm">Notifications</h4>
                                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">3</span>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                <div className="px-4 py-3 border-l-4 border-green-500 cursor-pointer hover:bg-slate-50">
                                    <p className="text-slate-900 text-sm font-medium">System Alert</p>
                                    <p className="text-slate-500 text-xs mt-1">Maintenance scheduled</p>
                                    <p className="text-slate-400 text-xs mt-1">2 hours ago</p>
                                </div>
                            </div>
                            <div className="px-4 py-2 border-t border-slate-100">
                                <button className="text-primary text-sm font-medium w-full text-center hover:text-primary">
                                    View All
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative">
                    <button
                        onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
                        className="flex items-center gap-3 pl-3 border-l border-slate-200"
                    >
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-700 font-semibold">
                            <img src="/img/icons/profile.svg" alt="Profile" />
                        </div>
                        <div className="leading-tight text-left hidden md:block">
                            <p className="text-sm font-medium text-slate-800">{getDisplayName()}</p>
                            <p className="text-xs text-slate-500">{user?.roleName || 'Dept. User'}</p>
                        </div>
                    </button>

                    {showProfile && (
                        <div className="absolute right-0 mt-3 w-44 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50">
                            <a href="/department/profile" className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
                                My Profile
                            </a>
                            <div className="border-t border-slate-100"></div>
                            <button onClick={handleLogout} className="flex w-full items-center px-4 py-2 text-sm text-primary hover:bg-red-50">
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
