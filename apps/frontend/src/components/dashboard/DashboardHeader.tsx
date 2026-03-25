'use client';

import { useState, useRef, useEffect } from 'react';
import { Link } from '@/navigation';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardHeader() {
    const { user, logout } = useAuth();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };

        if (isProfileOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isProfileOpen]);

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <header style={{ padding: '0.75rem 1.5rem' }}>
            <div className="d-flex justify-content-between align-items-center">
                {/* Logo */}
                <div className="d-flex align-items-center"></div>

                {/* User Menu */}
                <div ref={profileRef}>
                    <div className="dropdown">
                        <button
                            className="btn btn-light d-flex align-items-center gap-2 border"
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            style={{ borderRadius: '50px', padding: '0.5rem 1rem' }}
                        >
                            <div
                                className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
                                style={{ width: '32px', height: '32px', fontSize: '14px', fontWeight: 'bold' }}
                            >
                                {user?.email?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span className="d-none d-md-inline fw-medium">{user?.email || 'User'}</span>
                            <i className={`bi bi-chevron-${isProfileOpen ? 'up' : 'down'}`}></i>
                        </button>

                        <ul className={`dropdown-menu dropdown-menu-end ${isProfileOpen ? "show" : ""}`} style={{ marginTop: '0.5rem' }}>
                            <li>
                                <div className="dropdown-item-text">
                                    <small className="text-muted">Logged in as</small>
                                    <div className="fw-semibold">{user?.roleName || 'User'}</div>
                                    <small className="text-muted">{user?.email}</small>
                                </div>
                            </li>
                            <li><hr className="dropdown-divider" /></li>
                            <li>
                                <Link className="dropdown-item" href="/profile" prefetch onClick={() => setIsProfileOpen(false)}>
                                    <i className="bi bi-person me-2"></i> My Profile
                                </Link>
                            </li>
                            <li>
                                <Link className="dropdown-item" href="/settings" prefetch onClick={() => setIsProfileOpen(false)}>
                                    <i className="bi bi-gear me-2"></i> Settings
                                </Link>
                            </li>
                            <li><hr className="dropdown-divider" /></li>
                            <li>
                                <button className="dropdown-item text-danger" onClick={handleLogout}>
                                    <i className="bi bi-box-arrow-right me-2"></i> Logout
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </header>
    );
}
