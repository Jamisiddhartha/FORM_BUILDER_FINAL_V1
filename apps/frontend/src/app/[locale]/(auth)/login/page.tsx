'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AuthForm from './AuthForm';
import { useRouter } from '@/navigation';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;

    const normalizedUserType = String(user.userType || '').toUpperCase();
    const normalizedRole = String(user.roleName || '').toLowerCase();

    if (normalizedUserType === 'INVESTOR') {
      router.replace('/investor/dashboard');
      return;
    }
    if (normalizedUserType === 'CIS_USER') {
      router.replace('/department/inspection');
      return;
    }
    if (normalizedRole === 'admin') {
      router.replace('/admin/dashboard');
      return;
    }
    if (normalizedUserType === 'INSPECTOR' || normalizedRole === 'inspector') {
      router.replace('/department/inspector/dashboard');
      return;
    }
    router.replace('/department/dashboard');
  }, [loading, user, router]);

  if (user) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Redirecting...</span>
        </div>
      </div>
    );
  }

  return (
    <section className="auth-wrap">
      <div className="container">
        <div className="auth-box bg-white">
          <div className="row">
            <div className="col-sm-12 col-md-6">
              <AuthForm />
            </div>
            <div className="col-sm-12 col-md-6">
              <div className="ab-rgt position-relative">
                <div className="position-absolute testimony">
                  <div id="carouselExampleDark" className="carousel carousel-dark slide" data-bs-ride="carousel">
                    <div className="carousel-inner">
                      <div className="carousel-item active" data-bs-interval={10000}>
                        <div className="carousel-caption d-none d-md-block">
                          <p className="mb-3">"Testimonial 1"</p>
                          <h5 className="mb-1">Investor Name</h5>
                          <span>Firm Name</span>
                        </div>
                      </div>
                      <div className="carousel-item" data-bs-interval={2000}>
                        <div className="carousel-caption d-none d-md-block">
                          <p className="mb-3">"Testimonial 2"</p>
                          <h5 className="mb-1">Investor Name</h5>
                          <span>Firm Name</span>
                        </div>
                      </div>
                    </div>
                    <button className="carousel-control-prev" type="button" data-bs-target="#carouselExampleDark" data-bs-slide="prev">
                      <img src="/img/icons/arrow-lft.svg" alt="Previous" />
                    </button>
                    <button className="carousel-control-next" type="button" data-bs-target="#carouselExampleDark" data-bs-slide="next">
                      <img src="/img/icons/arrow-rgt.svg" alt="Next" />
                    </button>
                  </div>
                </div>
                <img src="/img/img-auth.jpg" alt="" className="img-fluid w-100 s-bg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
