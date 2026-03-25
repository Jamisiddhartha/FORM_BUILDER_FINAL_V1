'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Skeleton } from 'primereact/skeleton';
import { Toast } from 'primereact/toast';
import { FormRenderer } from '@/components/investor/FormRenderer';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api-client';

type InitialFormData = {
    fields: Record<string, any>;
    addMore: Record<number, any[]>;
};

export default function ApplicationFormPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const toast = useRef<Toast>(null);
    useAuth();

    const serviceId = params?.serviceId as string;
    const formTypeId = params?.formTypeId as string;
    const locale = String(params?.locale || 'en');
    const cafId = searchParams?.get('cafId');
    const requestedPageId = Number(searchParams?.get('pageId') || 0) || null;
    const requestedSubmissionId = Number(searchParams?.get('submissionId') || 0) || null;

    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionId, setSubmissionId] = useState<number | null>(null);
    const [initialData, setInitialData] = useState<InitialFormData>({ fields: {}, addMore: {} });
    const [initialPageIndex, setInitialPageIndex] = useState(0);
    const [draftLoaded, setDraftLoaded] = useState(false);

    const pageTitle =
        config?.serviceName ||
        config?.service_name ||
        config?.service?.serviceName ||
        config?.service?.service_name ||
        config?.service?.name ||
        config?.service_title ||
        config?.formName ||
        'Application Form';

    useEffect(() => {
        if (!serviceId || !formTypeId) return;

        apiClient
            .get(`/investor/services/${serviceId}/form/${formTypeId}`, {
                params: { locale },
            })
            .then((res) => setConfig(res.data))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [serviceId, formTypeId, locale]);

    useEffect(() => {
        setSubmissionId(requestedSubmissionId);
    }, [requestedSubmissionId]);

    useEffect(() => {
        if (!submissionId) {
            setInitialData({ fields: {}, addMore: {} });
            const pages = Array.isArray(config?.pages) ? config.pages : [];
            const pageIndexFromQuery =
                requestedPageId && pages.length
                    ? Math.max(0, pages.findIndex((page: any) => Number(page?.id) === requestedPageId))
                    : 0;
            setInitialPageIndex(pageIndexFromQuery >= 0 ? pageIndexFromQuery : 0);
            setDraftLoaded(true);
            return;
        }

        setDraftLoaded(false);
        apiClient
            .get(`/investor/services/draft/${submissionId}`)
            .then((res) => {
                const draft = res?.data || {};
                const formData = draft?.formData || {};
                setInitialData({
                    fields: formData?.fields || {},
                    addMore: formData?.addMore || {},
                });
                const savedStep = Number(formData?.__currentStep || 0);
                const pages = Array.isArray(config?.pages) ? config.pages : [];
                const pageIndexFromQuery =
                    requestedPageId && pages.length
                        ? pages.findIndex((page: any) => Number(page?.id) === requestedPageId)
                        : -1;
                if (pageIndexFromQuery >= 0) {
                    setInitialPageIndex(pageIndexFromQuery);
                } else {
                    setInitialPageIndex(Number.isFinite(savedStep) && savedStep >= 0 ? savedStep : 0);
                }
            })
            .catch(() => {
                setInitialData({ fields: {}, addMore: {} });
                setInitialPageIndex(0);
            })
            .finally(() => setDraftLoaded(true));
    }, [submissionId, requestedPageId, config]);

    const loadingDraft = useMemo(() => !draftLoaded, [draftLoaded]);

    const saveProgress = async (values: any, addMoreValues: any, currentStep: number) => {
        const formData = { fields: values, addMore: addMoreValues };
        const res = await apiClient.post('/investor/services/save-progress', {
            serviceId,
            formTypeId: Number(formTypeId),
            formData,
            cafId: cafId || undefined,
            submissionId: submissionId || undefined,
            currentStep,
        });
        const nextSubmissionId = Number(res?.data?.submissionId || 0) || null;
        if (nextSubmissionId) {
            setSubmissionId(nextSubmissionId);
        }
        return res?.data;
    };

    const handleSaveNext = async ({ values, addMoreValues, nextPageIndex }: any) => {
        setIsSubmitting(true);
        try {
            await saveProgress(values, addMoreValues, nextPageIndex);
            return true;
        } catch (e: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Save Failed',
                detail: e?.response?.data?.message || e?.message || 'Unable to save draft.',
            });
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (values: any, addMoreValues: any) => {
        setIsSubmitting(true);
        try {
            const finalStepIndex = Array.isArray(config?.pages) && config.pages.length > 0 ? config.pages.length - 1 : 0;
            const saveResult = await saveProgress(values, addMoreValues, finalStepIndex);
            const nextSubmissionId = Number(saveResult?.submissionId || submissionId || 0);
            if (!nextSubmissionId) {
                throw new Error('Unable to resolve submission id.');
            }
            router.push(`/${locale}/investor/services/${serviceId}/apply/${formTypeId}/documents?submissionId=${nextSubmissionId}`);
        } catch (e: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Save Failed',
                detail: e?.response?.data?.message || e?.message || 'Something went wrong',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading || loadingDraft) {
        return (
            <div className="max-w mx-auto">
                <Skeleton height="400px" />
            </div>
        );
    }

    if (error) {
        return <div className="max-w mx-auto text-center text-red-500">Failed to load form configuration.</div>;
    }

    return (
        <div className="max-w mx-auto">
            <Toast ref={toast} />
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
                <p className="text-gray-500 mt-1">
                    Fill out the form below to submit your application. Fields marked with <span style={{ color: '#dc2626' }}>*</span> are mandatory.
                </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <FormRenderer
                    config={config}
                    serviceId={serviceId}
                    submissionId={submissionId || undefined}
                    initialData={initialData}
                    initialPageIndex={initialPageIndex}
                    onSaveNext={handleSaveNext}
                    onSubmit={handleSubmit}
                    onCancel={() => router.back()}
                    isSubmitting={isSubmitting}
                    finalActionLabel="Save & Continue to Documents"
                />
            </div>
        </div>
    );
}
