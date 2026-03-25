'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import apiClient from '@/lib/api-client';

export default function VerifyEmailPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');
    const { setUser, setResources, fetchRoles } = useAuth();

    const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('Verifying your email...');

    useEffect(() => {
        if (!token && !searchParams.get('registered')) {
            setStatus('error');
            setMessage('No verification token found.');
        } else if (searchParams.get('registered')) {
            setStatus('verifying'); // Re-use verifying state for "Check Email" UI
            setMessage('Registration successful! Please check your email to verify your account.');
        } else if (token) {
            // Auto-verify if token is present
            handleVerify();
        }
    }, [token, searchParams]);

    const handleVerify = () => {
        if (!token) return;
        setStatus('verifying');
        setMessage('Verifying your email...');

        apiClient.post('/auth/verify-email', { token })
            .then(async (res) => {
                setStatus('success');
                setMessage('Email verified successfully! Redirecting...');

                const { user, profile, resources } = res.data.data;

                // Clear previous state
                setUser(null);
                setResources([]);
                await new Promise(resolve => setTimeout(resolve, 50));

                // Set new user data
                setUser({
                    id: user.id,
                    email: user.email,
                    userType: user.userType,
                    roleId: user.roleId,
                    roleName: user.roleName,
                    isEmailVerified: user.isEmailVerified,
                    lastLoginAt: user.lastLoginAt,
                    firstName: profile?.firstName || profile?.fullName || '',
                    lastName: profile?.lastName || '',
                });

                if (resources) {
                    setResources(resources);
                }

                await fetchRoles();

                // Dynamic redirection logic
                let redirectPath = "/";
                let dashboardResource = null;

                if (resources && resources.length > 0) {
                    if (user.userType === 'INVESTOR') {
                        dashboardResource = resources.find((r: any) => r.code === 'INVESTOR_DASHBOARD');
                    } else if (user.userType === 'DEPARTMENT') {
                        if (user.roleName === 'admin') {
                            dashboardResource = resources.find((r: any) => r.code === 'DASHBOARD_VIEW');
                        } else {
                            dashboardResource = resources.find((r: any) => r.code === 'DEPARTMENT_DASHBOARD');
                        }
                    }

                    if (!dashboardResource) {
                        dashboardResource = resources.find((r: any) =>
                            r.code === 'DASHBOARD_VIEW' ||
                            r.code === 'INVESTOR_DASHBOARD' ||
                            r.code === 'DEPARTMENT_DASHBOARD'
                        );
                    }
                }

                if (dashboardResource) {
                    redirectPath = dashboardResource.path;
                } else {
                    if (user.userType === 'INVESTOR') {
                        redirectPath = "/investor/dashboard";
                    } else if (user.roleName === 'admin' || user.roleId === 9) {
                        redirectPath = "/admin/dashboard";
                    } else {
                        redirectPath = "/user/dashboard";
                    }
                }

                setTimeout(() => {
                    router.replace(redirectPath);
                    router.refresh();
                }, 1500);
            })
            .catch((err) => {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Verification failed. Invalid or expired token.');
            });
    };

    return (
        <div className="container d-flex justify-content-center align-items-center vh-100">
            <div className="card shadow-sm p-4 text-center" style={{ maxWidth: '400px', width: '100%' }}>
                <div className="card-body">
                    {/* State: Just Registered / Check Email */}
                    {searchParams.get('registered') && status !== 'success' && status !== 'error' && (
                        <>
                            <div className="text-primary mb-3">
                                <i className="bi bi-envelope-check" style={{ fontSize: '3rem' }}></i>
                            </div>
                            <h5 className="card-title">Check Your Email</h5>
                            <p className="card-text text-muted">{message}</p>
                        </>
                    )}

                    {/* State: Token Present, Verifying (Auto) */}
                    {/* Removed manual button, showing verifying state instead */}

                    {/* State: Verifying (Spinner) */}
                    {status === 'verifying' && !searchParams.get('registered') && (
                        <>
                            <div className="spinner-border text-primary mb-3" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <h5 className="card-title">Verifying...</h5>
                            <p className="card-text text-muted">{message}</p>
                        </>
                    )}

                    {/* State: Success */}
                    {status === 'success' && (
                        <>
                            <div className="text-success mb-3">
                                <i className="bi bi-check-circle-fill" style={{ fontSize: '3rem' }}></i>
                            </div>
                            <h5 className="card-title">Success!</h5>
                            <p className="card-text">{message}</p>
                            <p className="small text-muted">Redirecting...</p>
                        </>
                    )}

                    {/* State: Error */}
                    {status === 'error' && (
                        <>
                            <div className="text-danger mb-3">
                                <i className="bi bi-x-circle-fill" style={{ fontSize: '3rem' }}></i>
                            </div>
                            <h5 className="card-title">Verification Failed</h5>
                            <p className="card-text text-danger">{message}</p>
                            <button className="btn btn-primary mt-3" onClick={() => router.push('/login')}>
                                Go to Login
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
