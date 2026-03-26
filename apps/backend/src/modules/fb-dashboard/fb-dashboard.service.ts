import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

// Tab → { approvStatus, actionStatuses[] }
// approvStatus: 'P' = pending action, 'V' = action taken
const TAB_FORWARD_FILTER: Record<string, { approvStatus: string; actionStatuses?: string[] }> = {
  pending:   { approvStatus: 'P' },
  forwarded: { approvStatus: 'V', actionStatuses: ['F'] },
  approved:  { approvStatus: 'V', actionStatuses: ['A'] },
  rejected:  { approvStatus: 'V', actionStatuses: ['R'] },
  reverted:  { approvStatus: 'V', actionStatuses: ['RBI'] },
  history:   { approvStatus: '' }, // all
};

@Injectable()
export class FbDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Inbox ────────────────────────────────────────────────────────────────────
  async getInbox(options: {
    userId: bigint;
    userRoleId: number;
    tab?: string;
    serviceId?: string;
    page?: number;
    limit?: number;
  }) {
    const page  = (options.page  ?? 0) > 0 ? (options.page  as number) : 1;
    const limit = Math.min((options.limit ?? 0) > 0 ? (options.limit as number) : 20, 100);
    const skip  = (page - 1) * limit;
    const tab   = String(options.tab || '').trim().toLowerCase();

    // ── 1. Officer's dept + district from department_users ────────────────────
    const deptUser = await this.prisma.department_users.findFirst({
      where: { user_id: options.userId },
      select: { dept_id: true, district_id: true },
    });
    const actorDeptId     = Number(deptUser?.dept_id    || 0) || null;
    const actorDistrictId = Number(deptUser?.district_id || 0) || null;
    const actorUserId     = Number(options.userId);
    // ── 2. Determine forward-table filter based on tab ────────────────────────
    const tabFilter = TAB_FORWARD_FILTER[tab] ?? TAB_FORWARD_FILTER['pending'];

    const forwardWhere: any = {
      nextRoleId: options.userRoleId,
      appSubId:   { not: null },
    };
    if (tabFilter.approvStatus)  forwardWhere.approvStatus  = tabFilter.approvStatus;
    if (tabFilter.actionStatuses) forwardWhere.actionStatus = { in: tabFilter.actionStatuses };

    const forwardRows = await this.prisma.forwardApplication.findMany({
      where:   forwardWhere,
      select: {
        appSubId:        true,
        nextUserId:      true,
        forwardedDeptId: true,
        forwardedDistId: true,
        createdOn:       true,
        actionStatus:    true,
      },
      distinct: ['appSubId'],
      orderBy:  [{ createdOn: 'desc' }, { apprLvlId: 'desc' }],
    });

    // ── 3. Match rows to this officer (by userId OR dept+district) ────────────
    const matched = forwardRows.filter((row) =>
      this.matchAssignment(row, { actorUserId, actorDeptId, actorDistrictId, actorRoleId: options.userRoleId }),
    );
    const submissionIds = [
      ...new Set(
        matched
          .map((r) => Number(r.appSubId))
          .filter((n) => Number.isFinite(n) && n > 0),
      ),
    ];

    if (!submissionIds.length) {
      return { items: [], total: 0, page, limit, counts: { pending: 0, total: 0 } };
    }

    // ── 5. Load submissions (submissionId already proves assignment via forwardApplication) ──
    const submissions = await this.prisma.applicationSubmission.findMany({
      where: {
        submissionId: { in: submissionIds },
        ...(options.serviceId ? { serviceId: String(options.serviceId) } : {}),
      },
      select: {
        submissionId:               true,
        serviceId:                  true,
        unitName:                   true,
        fieldValue:                 true,
        applicationStatus:          true,
        deptId:                     true,
        applicationUpdatedDateTime: true,
      },
    });

    const subMap = new Map(submissions.map((s) => [Number(s.submissionId), s]));

    // ── 6. Load service + department names ────────────────────────────────────
    const serviceIds  = [...new Set(submissions.map((s) => s.serviceId))];
    const deptIds     = [...new Set(submissions.map((s) => Number(s.deptId || 0)).filter(Boolean))];

    const [services, departments] = await Promise.all([
      serviceIds.length
        ? this.prisma.service.findMany({ where: { service_id: { in: serviceIds } }, select: { service_id: true, service_name: true } })
        : [] as { service_id: string; service_name: string | null }[],
      deptIds.length
        ? this.prisma.department.findMany({ where: { id: { in: deptIds } }, select: { id: true, name: true } })
        : [] as { id: number; name: string | null }[],
    ]);

    const serviceMap = new Map<string, string>(services.map((s) => [s.service_id, s.service_name || s.service_id] as [string, string]));
    const deptMap    = new Map<number, string>(departments.map((d) => [d.id, d.name || `Dept ${d.id}`] as [number, string]));

    // ── 7. Build result rows ──────────────────────────────────────────────────
    let rows = matched
      .map((fwd) => {
        const sub = subMap.get(Number(fwd.appSubId));
        if (!sub) return null;
        return {
          id:           Number(sub.submissionId),
          submissionId: Number(sub.submissionId),
          serviceId:    sub.serviceId,
          serviceName:  serviceMap.get(sub.serviceId) || sub.serviceId,
          unitName:     sub.unitName || `Application #${sub.submissionId}`,
          investorName: this.extractApplicantName(sub.fieldValue),
          department:   deptMap.get(Number(sub.deptId || 0)) || 'N/A',
          receivedDate: fwd.createdOn || sub.applicationUpdatedDateTime,
          status:       String(sub.applicationStatus || 'P').trim().toUpperCase(),
          statusLabel:  this.friendlyStatus(sub.applicationStatus),
          actionUrl:    `/department/workflow/${sub.submissionId}`,
          dueAt:        null as Date | null,
          slaBreached:  false,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const total = rows.length;
    const items = rows.slice(skip, skip + limit);

    return { items, total, page, limit, counts: { pending: total, total } };
  }

  // ── Application View (with field schema) ─────────────────────────────────
  async getApplicationView(submissionId: number) {
    const submission = await this.prisma.applicationSubmission.findUnique({
      where: { submissionId },
      select: {
        submissionId:               true,
        serviceId:                  true,
        formId:                     true,
        unitName:                   true,
        fieldValue:                 true,
        applicationStatus:          true,
        deptId:                     true,
        applicationUpdatedDateTime: true,
        applicationCreatedDate:     true,
      },
    });
    if (!submission) throw new Error('Submission not found');

    // Fetch form builder fields with labels + categories
    const builderFields = await this.prisma.formBuilderField.findMany({
      where: {
        service_id: submission.serviceId,
        ...(submission.formId ? { form_id: submission.formId } : {}),
        is_active: 'Y',
      },
      include: {
        formField: { include: { category: true } },
      },
      orderBy: [{ category_id: 'asc' }, { preference: 'asc' }],
    });

    // Build field schema: fieldCode → label + category
    const fieldSchema = builderFields
      .filter((f) => f.formField?.formCheckId)
      .map((f) => ({
        fieldCode:    f.formField!.formCheckId,
        label:        f.custom_label || f.formField!.name || f.formField!.formCheckId,
        categoryCode: f.formField?.category?.categoryCode ?? null,
        categoryName: f.formField?.category?.categoryName ?? 'General',
        inputType:    f.input_type,
      }));

    // Load service name
    const service = await this.prisma.service.findUnique({
      where: { service_id: submission.serviceId },
      select: { service_name: true },
    });

    return {
      submissionId:  Number(submission.submissionId),
      status:        String(submission.applicationStatus || 'P').toUpperCase(),
      statusLabel:   this.friendlyStatus(submission.applicationStatus),
      serviceId:     submission.serviceId,
      serviceName:   service?.service_name || submission.serviceId,
      unitName:      submission.unitName || '',
      formData:      (submission.fieldValue || {}) as Record<string, unknown>,
      fieldSchema,
      createdDate:   submission.applicationCreatedDate,
      updatedDate:   submission.applicationUpdatedDateTime,
    };
  }

  // ── Print Data (application view + photo) ────────────────────────────────
  async getPrintData(submissionId: number) {
    const base = await this.getApplicationView(submissionId);

    // Fetch photo: check submission.image first, else look in InvestorDocument
    const submission = await this.prisma.applicationSubmission.findUnique({
      where: { submissionId },
      select: { image: true, userId: true },
    });

    let photoUrl: string | null = null;

    // 1. submission.image may hold base64 or relative path
    if (submission?.image) {
      const img = String(submission.image).trim();
      photoUrl = img.startsWith('data:') || img.startsWith('http') ? img : `/${img.replace(/^\//, '')}`;
    }

    // 2. Fallback: find "photo" document from InvestorDocument via userId → investor_profile
    if (!photoUrl && submission?.userId) {
      const profile = await this.prisma.investor_profiles.findFirst({
        where: { user_id: submission.userId },
        select: { uid: true },
      });
      if (profile?.uid) {
        const photoDoc = await this.prisma.investorDocument.findFirst({
          where: {
            investorProfileUid: profile.uid,
            isDocumentActive:   'Y',
            documentMaster: {
              checklistDocumentName: { contains: 'photo', mode: 'insensitive' },
            },
          },
          select: { documentPath: true, documentName: true },
          orderBy: { createdAt: 'desc' },
        });
        if (photoDoc?.documentPath) {
          photoUrl = `/${photoDoc.documentPath.replace(/^\//, '')}`;
        }
      }
    }

    return { ...base, photoUrl };
  }

  // ── Timeline ─────────────────────────────────────────────────────────────
  async getFbTimeline(submissionId: number) {
    const spApp = await this.prisma.spApplication.findFirst({
      where: { appId: BigInt(submissionId) },
      select: { sno: true },
    });

    // Fetch history ascending for time calculation, then reverse for display
    const history = await this.prisma.applicationHistory.findMany({
      where: spApp?.sno
        ? { sno: spApp.sno }
        : { appId: String(submissionId) },
      orderBy: { historyId: 'asc' },
    });

    if (!history.length) return [];

    // Collect roleIds from actor + nextRoleId
    const roleIds = new Set<number>();
    history.forEach((item) => {
      const rid = Number(item.roleId || 0);
      const nrid = Number(item.nextRoleId || 0);
      if (rid  > 0) roleIds.add(rid);
      if (nrid > 0) roleIds.add(nrid);
    });

    // Fetch action master codes → full names
    const [roleRows, actionRows] = await Promise.all([
      roleIds.size
        ? this.prisma.roles.findMany({
            where: { id: { in: Array.from(roleIds) } },
            select: { id: true, name: true },
          })
        : Promise.resolve([] as { id: number; name: string | null }[]),
      this.prisma.workflowActionMaster.findMany({
        select: { code: true, name: true },
      }),
    ]);

    const roleMap = new Map<number, string>(
      roleRows.map((r) => [Number(r.id), String(r.name || '')] as const),
    );
    const actionMap = new Map<string, string>(
      actionRows.map((a) => [String(a.code).toUpperCase(), a.name] as const),
    );

    // Time tracking helpers
    const applicantTransitions = new Set(['I|DP','DP|PD','PD|I','I|P','RBI|I']);
    const deptTransitions       = new Set(['P|F','F|FA','F|A','F|R','F|RBI','P|RBI']);
    const getStatus = (item: (typeof history)[number]) =>
      String(item.applicationStatus || '').toUpperCase();

    let totalApplicant = 0, totalDept = 0, totalLine = 0;

    // Build rows in ascending order (for time calc), latest will be shown first on frontend
    const rows = history.map((item, idx) => {
      const next = history[idx + 1] ?? null;
      const seconds = next
        ? Math.abs(item.addedDateTime.getTime() - next.addedDateTime.getTime()) / 1000
        : 0;

      const roleId   = Number(item.roleId || 0);
      const roleName = roleMap.get(roleId) || String(item.roleName || '').trim() || '—';
      const key      = `${getStatus(item)}|${next ? getStatus(next) : ''}`;

      // Classify time
      let applicantSec = 0, deptSec = 0, lineSec = 0;
      if (roleId === 3)                        lineSec      = seconds;
      else if (roleId === 7 || roleId === 33)  deptSec      = seconds;
      else if (roleName.toLowerCase().includes('investor') || roleId === -1)
                                               applicantSec = seconds;
      else {
        applicantSec = applicantTransitions.has(key) ? seconds : 0;
        deptSec      = deptTransitions.has(key)      ? seconds : 0;
      }

      totalApplicant += applicantSec;
      totalDept      += deptSec;
      totalLine      += lineSec;

      // Action type: look up full name from action master using applicationStatus code
      const statusCode   = String(item.applicationStatus || '').toUpperCase();
      const actionType   = actionMap.get(statusCode) || this.friendlyStatus(item.applicationStatus);

      // Forwarded To: resolve nextRoleId to role name
      const nextRoleId   = Number(item.nextRoleId || 0);
      const forwardedTo  = nextRoleId > 0
        ? (roleMap.get(nextRoleId) || `Role ${nextRoleId}`)
        : '';

      return {
        sequence:                         idx + 1,
        actionTakenBy:                    roleName,
        actionTakenOn:                    item.addedDateTime,
        actionType,
        comments:                         item.comments || '',
        forwardedTo,
        timeTakenByApplicantSeconds:      applicantSec,
        timeTakenByDepartmentSeconds:     deptSec,
        timeTakenByLineDepartmentSeconds: lineSec,
      };
    });

    // Reverse so latest is first, re-number sequence
    rows.reverse();
    rows.forEach((r, i) => { r.sequence = i + 1; });

    // Totals row at bottom
    rows.push({
      sequence:                         rows.length + 1,
      actionTakenBy:                    '',
      actionTakenOn:                    new Date(0),
      actionType:                       'TOTAL',
      comments:                         'Total',
      forwardedTo:                      '',
      timeTakenByApplicantSeconds:      totalApplicant,
      timeTakenByDepartmentSeconds:     totalDept,
      timeTakenByLineDepartmentSeconds: totalLine,
    });

    return rows;
  }

  // ── Officer Form (role-specific form from form builder) ─────────────────
  async getOfficerForm(submissionId: number, roleId: number) {
    // 1. Get submission to find serviceId + deptId
    const submission = await this.prisma.applicationSubmission.findUnique({
      where: { submissionId },
      select: { serviceId: true, deptId: true },
    });
    if (!submission) throw new Error('Submission not found');

    // 2. Find workflow config for this role + service
    //    Try roleId first, fallback to currentRoleId (schema has both columns)
    let wfConfig = await this.prisma.applicationWorkflowConfiguration.findFirst({
      where: { serviceId: submission.serviceId, roleId },
      select: { formTypeId: true, step: true },
      orderBy: { step: 'asc' },
    });

    if (!wfConfig) {
      wfConfig = await this.prisma.applicationWorkflowConfiguration.findFirst({
        where: { serviceId: submission.serviceId, currentRoleId: roleId },
        select: { formTypeId: true, step: true },
        orderBy: { step: 'asc' },
      });
    }

    if (!wfConfig?.formTypeId) {
      return { formName: null, formTypeId: null, categories: [] };
    }

    // 3. Try FormMapping lookup; if not found use formTypeId directly as form_id
    const formMapping = await this.prisma.formMapping.findFirst({
      where: {
        service_id:   submission.serviceId,
        form_type_id: wfConfig.formTypeId,
      },
      select: { form_name: true, id: true },
    });

    // form_id in m_fb_form_builder_fields == formTypeId directly (FormMapping.id is its own PK, not the form_id)
    const resolvedFormId   = wfConfig.formTypeId;
    const resolvedFormName = formMapping?.form_name ?? null;

    // 4. Fetch all builder fields for service + resolved form_id
    const builderFields = await this.prisma.formBuilderField.findMany({
      where: {
        service_id: submission.serviceId,
        form_id:    resolvedFormId,
      },
      include: {
        formField: true,   // label fallback only — no nested category
      },
      orderBy: [{ category_id: 'asc' }, { preference: 'asc' }],
    });

    // 5. Fetch categories directly by category_id on the builder field
    const catIds = [...new Set(builderFields.map((f) => f.category_id).filter(Boolean))];
    const formCategories = catIds.length
      ? await this.prisma.formCategory.findMany({
          where: { id: { in: catIds } },
          select: { id: true, categoryCode: true, categoryName: true },
        })
      : [];
    const catById = new Map(formCategories.map((c) => [c.id, c]));

    // 6. Group by category
    const categoryMap = new Map<string, {
      categoryCode: string;
      categoryName: string;
      fields: Array<{
        fieldCode:   string;
        label:       string;
        inputType:   string;
        isRequired:  boolean;
        isReadonly:  boolean;
        placeholder: string | null;
        helpText:    string | null;
        gridSpan:    number;
      }>;
    }>();

    for (const f of builderFields) {
      const cat     = catById.get(f.category_id);
      const catCode = cat?.categoryCode ?? String(f.category_id ?? 'general');
      const catName = cat?.categoryName ?? 'General';

      if (!categoryMap.has(catCode)) {
        categoryMap.set(catCode, { categoryCode: catCode, categoryName: catName, fields: [] });
      }
      categoryMap.get(catCode)!.fields.push({
        fieldCode:   f.formField?.formCheckId ?? String(f.id),
        label:       f.custom_label || f.formField?.name || f.formField?.formCheckId || String(f.id),
        inputType:   f.input_type,
        isRequired:  f.is_required === 'Y',
        isReadonly:  f.is_readonly === 'Y',
        placeholder: f.placeholder ?? null,
        helpText:    f.help_text ?? null,
        gridSpan:    f.gridSpan ?? 12,
      });
    }

    return {
      formName:   resolvedFormName,
      formTypeId: wfConfig.formTypeId,
      step:       wfConfig.step,
      categories: Array.from(categoryMap.values()),
    };
  }

  // ── Document Verification ─────────────────────────────────────────────────
  async getDocumentVerification(submissionId: number, roleId: number) {
    // 1. Get serviceId for this submission
    const submission = await this.prisma.applicationSubmission.findUnique({
      where: { submissionId },
      select: { serviceId: true },
    });
    if (!submission) throw new Error('Submission not found');

    // 2. Check if this role has DOCUMENT_VERIFICATION subform action
    const wfConfig = await this.prisma.applicationWorkflowConfiguration.findFirst({
      where: {
        serviceId: submission.serviceId,
        OR: [{ roleId }, { currentRoleId: roleId }],
        subformActionName: 'DOCUMENT_VERIFICATION',
      },
      select: { subformActionName: true },
    });

    const enabled = !!wfConfig;

    // 3. Get sno from t_sp_applications via app_id
    const spApp = await this.prisma.spApplication.findFirst({
      where: { appId: BigInt(submissionId) },
      select: { sno: true },
    });

    if (!spApp?.sno) return { enabled, documents: [] };

    // 4. Get uploaded documents from t_application_dms_documents_mapping
    const docs = await this.prisma.applicationDmsDocumentsMapping.findMany({
      where: { sno: BigInt(spApp.sno) },
      orderBy: { createdOn: 'asc' },
    });

    if (!docs.length) return { enabled, documents: [] };

    // 5. Fetch document master names
    const docIds = [...new Set(docs.map((d) => d.documentsId))];
    const masters = await this.prisma.documentMaster.findMany({
      where: { id: { in: docIds } },
      select: { id: true, checklistDocumentName: true },
    });
    const masterMap = new Map(masters.map((m) => [m.id, m.checklistDocumentName]));

    return {
      enabled,
      documents: docs.map((d) => ({
        mappingId:    d.mappingId,
        documentName: masterMap.get(d.documentsId) || `Document #${d.documentsId}`,
        fileName:     d.documentFileName,
        status:       d.status || 'U',
        statusLabel:  d.status === 'V' ? 'Verified' : d.status === 'M' ? 'Mismatch' : 'Un-Verified',
        comments:     d.comments || '',
        fileUrl:      d.documentFileName ? `/uploads/investorDocuments/${d.iuid}/${d.documentFileName}` : null,
      })),
    };
  }

  async verifyDocument(options: {
    mappingId:  number;
    status:     string;
    comments:   string;
    deptUserId: number;
  }) {
    const { mappingId, status, comments, deptUserId } = options;

    await this.prisma.applicationDmsDocumentsMapping.update({
      where:  { mappingId },
      data:   { status, comments, lastUpdated: new Date() },
    });

    await this.prisma.applicationDmsDocumentsMappingLog.create({
      data: {
        mappingId:   BigInt(mappingId),
        documentsId: BigInt(0),
        status,
        deptUserId,
        verifierComments: comments,
        createdTime: new Date(),
      },
    });

    return { success: true };
  }

  // ── Officer Action (Revert / Forward / Approve / Reject) ──────────────────
  async submitOfficerAction(options: {
    submissionId:      number;
    roleId:            number;
    userId:            number;
    action:            string;   // RBI | F | A | R
    comment:           string;
    supportiveDocument?: string;
    userAgent?:        string;
  }) {
    const { submissionId, roleId, userId, action, comment, supportiveDocument, userAgent } = options;
    const now = new Date();

    // Map action → applicationSubmission status
    const SUB_STATUS: Record<string, string> = { RBI: 'H', F: 'F', A: 'A', R: 'R' };
    const submissionStatus = SUB_STATUS[action];
    if (!submissionStatus) throw new Error(`Invalid action: ${action}`);

    // 1. Load submission + spApplication together
    const [submission, spApp] = await Promise.all([
      this.prisma.applicationSubmission.findUnique({
        where:  { submissionId },
        select: { serviceId: true },
      }),
      this.prisma.spApplication.findFirst({
        where:  { appId: BigInt(submissionId) },
        select: { sno: true, spTag: true },
      }),
    ]);
    if (!submission) throw new Error('Submission not found');

    // 2. Officer's dept + district + role name (parallel)
    const [deptUser, roleRow] = await Promise.all([
      this.prisma.department_users.findFirst({
        where:  { user_id: BigInt(userId) },
        select: { dept_id: true, district_id: true },
      }),
      this.prisma.roles.findUnique({
        where:  { id: roleId },
        select: { name: true },
      }),
    ]);
    const deptId     = Number(deptUser?.dept_id     || 0) || null;
    const districtId = Number(deptUser?.district_id || 0) || null;
    const roleName   = roleRow?.name || '';

    // 3. Update t_application_submission
    await this.prisma.applicationSubmission.update({
      where: { submissionId },
      data:  { applicationStatus: submissionStatus, applicationUpdatedDateTime: now },
    });

    // 4. Update t_sp_applications
    await this.prisma.spApplication.updateMany({
      where: { appId: BigInt(submissionId) },
      data:  { appStatus: action, updatedOn: now, lastUpdatedDateTime: now, appComments: comment },
    });

    // 5. Mark current officer's pending forward row as Verified
    await this.prisma.forwardApplication.updateMany({
      where: { appSubId: submissionId, nextRoleId: roleId, approvStatus: 'P' },
      data:  {
        verifierUserId:      userId,
        actionStatus:        action,
        verifierUserComment: comment,
        supportiveDocument:  supportiveDocument || null,
        updatedDateTime:     now,
        commentDate:         now,
        approvStatus:        'V',
      },
    });

    // 6. For Forward: create new pending row for next role via transitionMapJson
    let forwardNextRoleId: number | null = null;
    if (action === 'F') {
      const wfConfig = await this.prisma.applicationWorkflowConfiguration.findFirst({
        where: {
          serviceId: submission.serviceId,
          OR: [{ roleId }, { currentRoleId: roleId }],
        },
        select: { transitionMapJson: true },
      });

      const transMap = (wfConfig?.transitionMapJson ?? {}) as Record<string, { next_role_id?: number }>;
      forwardNextRoleId = transMap['F']?.next_role_id ?? null;

      if (forwardNextRoleId) {
        await this.prisma.forwardApplication.create({
          data: {
            appSubId:        submissionId,
            nextRoleId:      forwardNextRoleId,
            forwardedDeptId: deptId,
            forwardedDistId: districtId,
            actionStatus:    'F',
            approvStatus:    'P',
            createdOn:       now,
            userAgent:       userAgent || '',
          },
        });
      }
    }

    // 7. Insert history entry for timeline
    await this.prisma.applicationHistory.create({
      data: {
        sno:               spApp?.sno      ?? null,
        serviceId:         submission.serviceId,
        spTag:             spApp?.spTag    ?? '',
        appId:             String(submissionId),
        applicationStatus: action,
        comments:          comment || null,
        approverId:        String(userId),
        approverDetails:   roleName,
        nextApprover:      forwardNextRoleId ? String(forwardNextRoleId) : null,
        addedDateTime:     now,
        roleId:            String(roleId),
        roleName,
        nextRoleId:        forwardNextRoleId ? String(forwardNextRoleId) : null,
        userAgent:         (userAgent || '').slice(0, 255),
      },
    });

    return { success: true, action, submissionId };
  }

  // ── Counts per status (for left panel stat cards) ─────────────────────────
  async getCounts(options: { userId: bigint; userRoleId: number }) {
    const tabs = ['pending', 'forwarded', 'approved', 'rejected', 'reverted'] as const;
    const counts = await Promise.all(
      tabs.map(async (tab) => {
        const res = await this.getInbox({ ...options, tab, page: 1, limit: 9999 });
        return [tab, res.total] as const;
      }),
    );
    const byTab: Record<string, number> = Object.fromEntries(counts);
    const total = byTab['pending'] ?? 0;
    return { byTab, total };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private matchAssignment(
    row: { nextUserId: number | null; forwardedDeptId: number | null; forwardedDistId: number | null },
    actor: { actorUserId: number; actorRoleId: number; actorDeptId: number | null; actorDistrictId: number | null },
  ) {
    const nextUserId = Number(row.nextUserId || 0) || null;
    if (nextUserId) {
      // Match by exact userId OR by roleId (some records store roleId in nextUserId)
      if (nextUserId === actor.actorUserId || nextUserId === actor.actorRoleId) return true;
      // nextUserId set but doesn't match — fall through to dept check
    }

    const rowDept = Number(row.forwardedDeptId || 0) || null;
    // No dept on record = role-level assignment, visible to any officer of this role
    if (!rowDept) return true;
    // Record has dept but officer has no dept mapping = show it (can't narrow further)
    if (!actor.actorDeptId) return true;
    // Dept must match
    if (rowDept !== actor.actorDeptId) return false;
    // Optional district filter
    const rowDist = Number(row.forwardedDistId || 0) || null;
    if (rowDist && actor.actorDistrictId && rowDist !== actor.actorDistrictId) return false;
    return true;
  }

  private friendlyStatus(status?: string | null) {
    const code = String(status || '').toUpperCase();
    if (['P', 'PENDING'].includes(code))   return 'Pending';
    if (['F', 'FORWARDED'].includes(code)) return 'Forwarded';
    if (['FA'].includes(code))             return 'Forwarded to Approver';
    if (['A', 'APPROVED'].includes(code))  return 'Approved';
    if (['R', 'REJECTED', 'REJECT'].includes(code)) return 'Rejected';
    if (['RBI', 'REVERTED'].includes(code)) return 'Reverted';
    if (['H', 'REVERTED'].includes(code)) return 'Reverted';
    return code || 'Unknown';
  }

  private extractApplicantName(fieldValue: unknown): string {
    const src = (fieldValue || {}) as Record<string, any>;
    const applicant = src.applicant || {};
    return (
      applicant.firstName && applicant.lastName
        ? `${applicant.firstName} ${applicant.lastName}`.trim()
        : applicant.name || src.applicant_name || src.companyName || 'N/A'
    );
  }
}
