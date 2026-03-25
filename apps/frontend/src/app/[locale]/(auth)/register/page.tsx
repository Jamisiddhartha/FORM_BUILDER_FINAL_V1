'use client';

import React from 'react';
import RegisterForm from './RegisterForm';

export default function RegisterPage() {
    return (
        <section className="auth-wrap">
            <div className="container-fluid px-5">
                <div className="auth-box bg-white w-100" style={{ maxWidth: '100%' }}>
                    <div className="p-4">
                        <RegisterForm />
                    </div>
                </div>
            </div>
        </section>
    );
}
