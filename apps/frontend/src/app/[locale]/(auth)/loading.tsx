export default function Loading() {
  return (
    <section className="auth-wrap" aria-busy="true" aria-live="polite">
      <div className="container">
        <div className="auth-box bg-white overflow-hidden">
          <div className="row g-0">
            <div className="col-sm-12 col-md-6 p-4 p-md-5">
              <div className="placeholder-glow">
                <div className="placeholder col-5 mb-3" style={{ height: '2.5rem' }} />
                <div className="placeholder col-8 mb-5" style={{ height: '1rem' }} />
                <div className="placeholder col-12 mb-2" style={{ height: '1rem' }} />
                <div className="placeholder col-12 mb-4" style={{ height: '3rem' }} />
                <div className="placeholder col-4 mb-2" style={{ height: '1rem' }} />
                <div className="placeholder col-12 mb-4" style={{ height: '3rem' }} />
                <div className="placeholder col-12" style={{ height: '3rem' }} />
              </div>
            </div>
            <div className="col-sm-12 col-md-6">
              <div className="bg-body-secondary w-100" style={{ minHeight: '520px' }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
