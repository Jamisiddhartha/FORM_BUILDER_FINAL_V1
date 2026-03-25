'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '@/navigation';
import apiClient from '@/lib/api-client';
import { useTranslations } from "next-intl";

const COMMON_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];

export default function RegisterForm() {
    const router = useRouter();
    const [registerAs, setRegisterAs] = useState('Investor');
    const [showPassword, setShowPassword] = useState(false);
    const t = useTranslations("RegisterPage");
    // Refs for file inputs
    const investorPanRef = useRef<HTMLInputElement>(null);
    const consultantPanRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        pan: '',
        firstName: '',
        lastName: '',
        fullName: '',
        legalEntityName: '',
        mobile: '',
        address: '',
        country: '',
        state: '',
        district: '',
        email: '',
        password: '',
        confirmPassword: '',
        // Applicant Info (for On Behalf of Investor)
        cons_pan: '',
        cons_mobile: '',
        cons_fullName: '',
        cons_email: '',
        cons_country: '',
        cons_state: '',
    });

    const [countries, setCountries] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);

    // Email suggestion state
    const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);
    const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);

    const [showPasswordCriteria, setShowPasswordCriteria] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // PAN Upload State
    const [isUploadingInvestorPan, setIsUploadingInvestorPan] = useState(false);
    const [isUploadingConsultantPan, setIsUploadingConsultantPan] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Check Registration State
    const [emailCheckStatus, setEmailCheckStatus] = useState<{ status: string; message: string } | null>(null);
    const [panCheckStatus, setPanCheckStatus] = useState<{ status: string; message: string } | null>(null);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [isCheckingPan, setIsCheckingPan] = useState(false);

    // Fetch Countries on mount
    useEffect(() => {
        apiClient.get('/master/countries?isActive=true').then(res => {
            setCountries(res.data || []);
        }).catch(console.error);
    }, []);

    useEffect(() => {
        if (formData.country) {
            apiClient.get(`/master/states?countryId=${formData.country}&isActive=true`).then(res => {
                setStates(res.data || []);
            }).catch(console.error);
        } else {
            setStates([]);
        }
    }, [formData.country]);

    // Check Email Status
    useEffect(() => {
        const checkEmail = async () => {
            if (formData.email && formData.email.includes('@')) {
                setIsCheckingEmail(true);
                try {
                    const res = await apiClient.post('/auth/check-registration', {
                        email: formData.email
                    });
                    setEmailCheckStatus(res.data.email);
                } catch (err) {
                    console.error(err);
                    setEmailCheckStatus(null);
                } finally {
                    setIsCheckingEmail(false);
                }
            } else {
                setEmailCheckStatus(null);
            }
        };

        const timeoutId = setTimeout(checkEmail, 1000);
        return () => clearTimeout(timeoutId);
    }, [formData.email]);

    // Check PAN Status
    useEffect(() => {
        const checkPan = async () => {
            if (formData.pan && formData.pan.length === 10) {
                setIsCheckingPan(true);
                try {
                    const res = await apiClient.post('/auth/check-registration', {
                        pan: formData.pan
                    });
                    setPanCheckStatus(res.data.pan);
                } catch (err) {
                    console.error(err);
                    setPanCheckStatus(null);
                } finally {
                    setIsCheckingPan(false);
                }
            } else {
                setPanCheckStatus(null);
            }
        };

        const timeoutId = setTimeout(checkPan, 1000);
        return () => clearTimeout(timeoutId);
    }, [formData.pan]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Email suggestion logic
        if (name === 'email') {
            if (value.includes('@')) {
                const [, domainPart] = value.split('@');
                if (domainPart !== undefined) {
                    const filtered = COMMON_DOMAINS.filter(d => d.startsWith(domainPart));
                    setEmailSuggestions(filtered);
                    setShowEmailSuggestions(filtered.length > 0);
                } else {
                    setShowEmailSuggestions(false);
                }
            } else {
                setShowEmailSuggestions(false);
            }
        }
    };

    const handleEmailSuggestionClick = (domain: string) => {
        const [localPart] = formData.email.split('@');
        setFormData(prev => ({ ...prev, email: `${localPart}@${domain}` }));
        setShowEmailSuggestions(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'pan' | 'cons_pan') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Cancel any ongoing request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Create new controller
            const controller = new AbortController();
            abortControllerRef.current = controller;

            if (fieldName === 'pan') {
                setIsUploadingInvestorPan(true);
            } else {
                setIsUploadingConsultantPan(true);
            }

            const formData = new FormData();
            formData.append('pan', file);

            // Generate idempotency key
            const idempotencyKey = crypto.randomUUID();
            formData.append('idempotency_key', idempotencyKey);

            try {
                const response = await fetch('https://preprodinvestuttarakhand.com/uat_swcs/ukautofill/pan-register', {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                // Populate fields
                if (data.extracted_data) {
                    setFormData(prev => ({
                        ...prev,
                        [fieldName]: data.extracted_data.pan_no || prev[fieldName],
                        // Map name_on_pan to fullName or cons_fullName based on fieldName
                        [fieldName === 'pan' ? 'fullName' : 'cons_fullName']: data.extracted_data.name_on_pan || prev[fieldName === 'pan' ? 'fullName' : 'cons_fullName']
                    }));
                }

            } catch (error: any) {
                if (error.name === 'AbortError') {
                    console.log('Request cancelled due to new upload');
                } else {
                    console.error('Upload failed:', error);
                    alert(`Upload failed: ${error.message}`);
                }
            } finally {
                if (fieldName === 'pan') {
                    setIsUploadingInvestorPan(false);
                } else {
                    setIsUploadingConsultantPan(false);
                }
                abortControllerRef.current = null;
            }
        }
    };

    const validatePassword = (pwd: string) => {
        const criteria = {
            length: pwd.length >= 8,
            upper: /[A-Z]/.test(pwd),
            lower: /[a-z]/.test(pwd),
            number: /[0-9]/.test(pwd),
            special: /[^A-Za-z0-9]/.test(pwd),
        };
        return criteria;
    };

    const passwordCriteria = validatePassword(formData.password);
    const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (!isPasswordValid) {
            setError("Password does not meet all criteria");
            return;
        }

        setSubmitting(true);

        try {
            const nameParts = formData.fullName.trim().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || '.';

            const payload: any = {
                email: formData.email,
                password: formData.password,
                firstName,
                lastName,
                pan: formData.pan,
                mobile: formData.mobile,
                legalEntityName: formData.legalEntityName,
                address: formData.address,
                country: countries.find(c => c.id.toString() === formData.country)?.name,
                state: states.find(s => s.id.toString() === formData.state)?.name,
                district: formData.district, // Now sending text directly
                roleId: 2, // Default Investor Role
            };

            // Add Applicant Info if "On Behalf of Investor"
            if (registerAs === 'On Behalf of Investor') {
                payload.cons_pan = formData.cons_pan;
                payload.cons_mobile = formData.cons_mobile;
                payload.cons_fullName = formData.cons_fullName;
                payload.cons_email = formData.cons_email;
                payload.cons_country = formData.cons_country; // Assuming text input for now or same dropdown logic
                payload.cons_state = formData.cons_state;
            }

            await apiClient.post('/auth/register', payload);

            // Redirect to verify email page instead of login
            router.push('/verify-email?registered=true');
        } catch (err: any) {
            const message = err.response?.data?.message;
            if (message === 'EMAIL_EXISTS_UNVERIFIED') {
                setError("EMAIL_EXISTS_UNVERIFIED");
            } else {
                setError(message || "Registration failed. Please try again.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleResendVerification = async () => {
        try {
            await apiClient.post('/auth/resend-verification', { email: formData.email });
            alert('Verification email sent successfully!');
            setError(null);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to send verification email.');
        }
    };
    const roles = [
        { key: 'investor', label: t('Investor') },
        { key: 'onBehalf', label: t('On Behalf of Investor') },
        { key: 'exhibitor', label: t('Exhibitor') },
        { key: 'organisor', label: t('Organisor') }
    ];
    return (
        <div className="register-form">
            <h4 className="mb-4">{t("Register as")}</h4>

            {/* Role Selection - Radio Buttons */}
            <div className="mb-4">
                <div className="d-flex flex-wrap gap-4">
                    {roles.map(({ key, label }) => (
                        <div key={key} className="form-check">
                            <input
                                className="form-check-input"
                                type="radio"
                                name="registerAs"
                                id={`role-${key}`}
                                value={key}                // Use key as value
                                checked={registerAs === key} // Compare using key
                                onChange={() => setRegisterAs(key)}
                            />
                            <label className="form-check-label" htmlFor={`role-${key}`}>
                                {label} 
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            {error && error !== 'EMAIL_EXISTS_UNVERIFIED' && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handleSubmit}>
                {/* Applicant Information Section (Conditional) */}
                {registerAs === 'onBehalf' && (
                    <div className="mb-4 p-3 border rounded bg-light">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="mb-0">{t("Consultant Information")}</h5>
                            <div>
                                <button
                                    className="btn btn-sm btn-outline-primary"
                                    type="button"
                                    onClick={() => consultantPanRef.current?.click()}
                                    disabled={isUploadingConsultantPan}
                                >
                                    {isUploadingConsultantPan ? (
                                        <React.Fragment><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Uploading...</React.Fragment>
                                    ) : (
                                        <React.Fragment><i className="bi bi-upload me-2"></i>{t("Upload PAN")}</React.Fragment>
                                    )}
                                </button>
                                <input
                                    type="file"
                                    ref={consultantPanRef}
                                    className="d-none"
                                    accept="image/*,.pdf"
                                    onChange={(e) => handleFileUpload(e, 'cons_pan')}
                                />
                            </div>
                        </div>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label">{t("Full Name")}</label>
                                <input type="text" className="form-control" name="cons_fullName" value={formData.cons_fullName} onChange={handleChange} required />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">{t("Email")}</label>
                                <input type="email" className="form-control" name="cons_email" value={formData.cons_email} onChange={handleChange} required />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">{t("Mobile")}</label>
                                <input type="tel" className="form-control" name="cons_mobile" value={formData.cons_mobile} onChange={handleChange} required />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">{t("PAN")}</label>
                                <input type="text" className="form-control" name="cons_pan" value={formData.cons_pan} onChange={handleChange} required />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">{t("Country")}</label>
                                <input type="text" className="form-control" name="cons_country" value={formData.cons_country} onChange={handleChange} required />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">{t("State")}</label>
                                <input type="text" className="form-control" name="cons_state" value={formData.cons_state} onChange={handleChange} required />
                            </div>
                        </div>
                    </div>
                )}

                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">{t("Investor Information")}</h5>
                    <div>
                        <button
                            className="btn btn-sm btn-outline-primary"
                            type="button"
                            onClick={() => investorPanRef.current?.click()}
                            disabled={isUploadingInvestorPan}
                        >
                            {isUploadingInvestorPan ? (
                                <React.Fragment><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Uploading...</React.Fragment>
                            ) : (
                                <React.Fragment><i className="bi bi-upload me-2"></i>{t("Upload PAN")}</React.Fragment>
                            )}
                        </button>
                        <input
                            type="file"
                            ref={investorPanRef}
                            className="d-none"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileUpload(e, 'pan')}
                        />
                    </div>
                </div>
                <div className="row g-3">
                    {/* PAN */}
                    <div className="col-md-4">
                        <label className="form-label">{t("PAN")}</label>
                        <input
                            type="text"
                            className="form-control"
                            name="pan"
                            value={formData.pan}
                            onChange={handleChange}
                            placeholder="Enter your PAN"
                        />
                        {isCheckingPan && <div className="text-muted small mt-1">Checking availability...</div>}
                        {!isCheckingPan && panCheckStatus && (
                            <div className={`small mt-1 ${panCheckStatus.status === 'AVAILABLE' ? 'text-success' : 'text-danger'}`}>
                                {panCheckStatus.status === 'AVAILABLE' ? <i className="bi bi-check-circle me-1"></i> : <i className="bi bi-exclamation-circle me-1"></i>}
                                {panCheckStatus.message}
                            </div>
                        )}
                    </div>

                    {/* Full Name */}
                    <div className="col-md-4">
                        <label className="form-label">{t("Full Name")}</label>
                        <input
                            type="text"
                            className="form-control"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            placeholder="Enter your full name"
                            required
                        />
                    </div>

                    {/* Legal Entity Name */}
                    <div className="col-md-4">
                        <label className="form-label">{t("Legal Entity Name")}</label>
                        <input
                            type="text"
                            className="form-control"
                            name="legalEntityName"
                            value={formData.legalEntityName}
                            onChange={handleChange}
                            placeholder="Enter legal entity name"
                        />
                    </div>

                    {/* Mobile */}
                    <div className="col-md-4">
                        <label className="form-label">{t("Mobile")}</label>
                        <input
                            type="tel"
                            className="form-control"
                            name="mobile"
                            value={formData.mobile}
                            onChange={handleChange}
                            placeholder="Enter your mobile no."
                            required
                        />
                    </div>

                    {/* Address */}
                    <div className="col-md-8">
                        <label className="form-label">{t("Address")}</label>
                        <input
                            type="text"
                            className="form-control"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="Enter your address"
                        />
                    </div>

                    {/* Country */}
                    <div className="col-md-4">
                        <label className="form-label">{t("Country")}</label>
                        <select
                            className="form-select"
                            name="country"
                            value={formData.country}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Country</option>
                            {countries.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* State */}
                    <div className="col-md-4">
                        <label className="form-label">{t("State")}</label>
                        <select
                            className="form-select"
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            disabled={!formData.country}
                            required
                        >
                            <option value="">Select State</option>
                            {states.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* District */}
                    <div className="col-md-4">
                        <label className="form-label">{t("District")}</label>
                        <input
                            type="text"
                            className="form-control"
                            name="district"
                            value={formData.district}
                            onChange={handleChange}
                            placeholder="Enter District"
                            required
                        />
                    </div>

                    {/* Email */}
                    <div className="col-md-4 position-relative">
                        <label className="form-label">{t("Email")}</label>
                        <input
                            type="email"
                            className="form-control"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
                            required
                            autoComplete="off"
                        />
                        {showEmailSuggestions && (
                            <ul className="list-group position-absolute w-100 shadow-sm" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                                {emailSuggestions.map(domain => (
                                    <li
                                        key={domain}
                                        className="list-group-item list-group-item-action cursor-pointer"
                                        onClick={() => handleEmailSuggestionClick(domain)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {formData.email.split('@')[0]}@{domain}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {error === 'EMAIL_EXISTS_UNVERIFIED' && (
                            <div className="text-danger small mt-1">
                                You already have an account which is not active.{' '}
                                <span
                                    className="text-primary text-decoration-underline"
                                    style={{ cursor: 'pointer' }}
                                    onClick={handleResendVerification}
                                >
                                    Click here to verify
                                </span>
                            </div>
                        )}
                        {isCheckingEmail && <div className="text-muted small mt-1">Checking availability...</div>}
                        {!isCheckingEmail && emailCheckStatus && (
                            <div className={`small mt-1 ${emailCheckStatus.status === 'AVAILABLE' ? 'text-success' : 'text-danger'}`}>
                                {emailCheckStatus.status === 'AVAILABLE' ? <i className="bi bi-check-circle me-1"></i> : <i className="bi bi-exclamation-circle me-1"></i>}
                                {emailCheckStatus.message}
                            </div>
                        )}
                    </div>

                    {/* Password */}
                    <div className="col-md-4 position-relative">
                        <label className="form-label">{t("Password")}</label>
                        <div className="input-group">
                            <input
                                type={showPassword ? "text" : "password"}
                                className="form-control"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                onFocus={() => setShowPasswordCriteria(true)}
                                onBlur={() => setShowPasswordCriteria(false)}
                                placeholder="Enter your password"
                                required
                            />
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                            </button>
                        </div>
                        {showPasswordCriteria && !isPasswordValid && (
                            <div className="card position-absolute start-0 w-100 mt-1 shadow-sm" style={{ zIndex: 1000 }}>
                                <div className="card-body p-2 small">
                                    <div className={passwordCriteria.length ? 'text-success' : 'text-danger'}>
                                        <i className={`bi bi-${passwordCriteria.length ? 'check' : 'x'}`}></i> Min 8 chars
                                    </div>
                                    <div className={passwordCriteria.upper ? 'text-success' : 'text-danger'}>
                                        <i className={`bi bi-${passwordCriteria.upper ? 'check' : 'x'}`}></i> Uppercase
                                    </div>
                                    <div className={passwordCriteria.lower ? 'text-success' : 'text-danger'}>
                                        <i className={`bi bi-${passwordCriteria.lower ? 'check' : 'x'}`}></i> Lowercase
                                    </div>
                                    <div className={passwordCriteria.number ? 'text-success' : 'text-danger'}>
                                        <i className={`bi bi-${passwordCriteria.number ? 'check' : 'x'}`}></i> Number
                                    </div>
                                    <div className={passwordCriteria.special ? 'text-success' : 'text-danger'}>
                                        <i className={`bi bi-${passwordCriteria.special ? 'check' : 'x'}`}></i> Special char
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div className="col-md-4">
                        <label className="form-label">{t("Confirm Password")}</label>
                        <div className="input-group">
                            <input
                                type={showPassword ? "text" : "password"}
                                className="form-control"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Enter your password again"
                                required
                            />
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                            </button>
                        </div>
                    </div>

                    <div className="col-12 mt-4">
                        <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
                            {submitting ? t('Registering') : t('Register')}
                        </button>

                        <div className="text-center mt-3">
                            <p>
                                {t("Already have an account")}? <a href="/login">{t("Log In")}</a>
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
