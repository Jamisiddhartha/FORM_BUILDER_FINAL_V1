
import { Injectable } from '@nestjs/common';
import { sha256Hex } from './utils/hash.util';
import { PrismaService } from '../database/prisma.service';
import { toPublicUrl } from './utils/doc-url.util';
import { makeKey, ensureOnce, releaseKey } from './utils/idempotency.util';

type DeptEnvelope = {
  statusCode: number;
  message: string;
  endpoint?: string;
  uid?: string;
  redirectUrl?: string;
};

async function postJson<T = any>(
  url: string,
  body: Record<string, any>,
  timeoutMs = 10_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const urlToCall = url;

  console.log('=========================');
  console.log('POST JSON', urlToCall);
  console.log('Body:', JSON.stringify(body));
  console.log('=========================');

  try {
    const res = await fetch(urlToCall, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      redirect: 'follow',
    });

    const contentType = res.headers.get('content-type') || '';
    console.log('Response Status:', res.status);
    console.log('Response Content-Type:', contentType);
    console.log('Response URL:', res.url);

    const text = await res.text();

    // Detect non-JSON (HTML or angle-bracketed payloads)
    const looksHtml = contentType.includes('text/html') || text.trim().startsWith('<'); // ← fixed
    if (looksHtml) {
      return {
        statusCode: 502,
        message:
          'Department endpoint returned HTML instead of JSON. Check service/baseUrl or API availability.',
        debugSnippet: text.slice(0, 200),
      } as T;
    }

    try {
      return text ? (JSON.parse(text) as T) : ({} as T);
    } catch (parseErr: any) {
      return {
        statusCode: 500,
        message:
          (parseErr?.message ?? 'Invalid JSON response') +
          ' (Ensure department API returns JSON)',
      } as T;
    }
  } catch (err: any) {
    return { statusCode: 500, message: err.message || 'Request failed' } as T;
  } finally {
    clearTimeout(timer);
  }
}

@Injectable()
export class SsoService {
  constructor(private prisma: PrismaService) {}

  // 1) Initiate: handshake + registration + logs
  async initiateSso(dto: any, req: any) {
    console.log('Initiating SSO with DTO:', dto);
    const { dept_tag, service_id, caf_id, app_id, uid } = dto;

    const idemKey = makeKey(uid, dept_tag, service_id, caf_id, app_id);
    if (!ensureOnce(idemKey)) {
      return {
        statusCode: 429,
        message: 'Duplicate request detected. Please wait a moment and try again.',
      };
    }
    console.log('Idempotency key acquired:', idemKey);

    try {
      // Resolve service + department
      const service = await this.prisma.service.findFirst({
        where: { service_id },
        include: { department: true },
      });

      if (!service?.department) {
        return { statusCode: 404, message: 'Department not found for service' };
      }

      // Prefer Department.baseUrl, fallback to service.service_url
      const baseUrl = service.department.baseUrl || service.service_url;
      if (!baseUrl) {
        return { statusCode: 404, message: 'No base URL configured for department/service' };
      }

      const secret = service.department.secretKey;
      const secretHash = sha256Hex(secret);
      console.log('Resolved base URL:', baseUrl);
      console.log('Computed secret hash.', secretHash);

      // Log handshake request (uid + hashed secret only)
      await this.logAccess({
        sp_tag: dept_tag,
        request_method: 'POST',
        request_uri: baseUrl,
        request_time: Date.now(),
        post_info: JSON.stringify({ uid, secret_key: secretHash }),
        user_agent: (req.headers['user-agent'] || '') as string,
        remote_ip: req.ip,
      });

      // Call handshake
      let handshakeResp: DeptEnvelope;
      try {
        handshakeResp = await postJson<DeptEnvelope>(baseUrl, {
          uid,
          secret_key: secretHash,
        });
      } catch (e: any) {
        handshakeResp = { statusCode: 500, message: e?.message || 'Handshake failed' };
      }

      // Log handshake response
      await this.logAccess({
        sp_tag: dept_tag,
        request_method: 'POST',
        request_uri: 'HANDSHAKE_RESPONSE',
        request_time: Date.now(),
        post_info: '{}',
        user_agent: (req.headers['user-agent'] || '') as string,
        remote_ip: req.ip,
        response_return: JSON.stringify(handshakeResp),
      });

      if (handshakeResp?.statusCode !== 200 || !handshakeResp?.endpoint) {
        return {
          statusCode: handshakeResp?.statusCode || 500,
          message: handshakeResp?.message || 'Handshake error',
        };
      }

      // Build registration payload
      const payload = await this.buildRegistrationPayload({
        uid,
        caf_id,
        app_id,
        service_id,
        dept_id: service.department.id,
        proposal_type: 'New',
      });

      // Registration: use returned endpoint
      const submitUrl = handshakeResp.endpoint || `${baseUrl}/sso/submit`;

      await this.logAccess({
        sp_tag: dept_tag,
        request_method: 'POST',
        request_uri: submitUrl,
        request_time: Date.now(),
        post_info: JSON.stringify(payload),
        user_agent: (req.headers['user-agent'] || '') as string,
        remote_ip: req.ip,
      });

      let regResp: DeptEnvelope;
      try {
        regResp = await postJson<DeptEnvelope>(submitUrl, payload);
      } catch (e: any) {
        regResp = { statusCode: 500, message: e?.message || 'Registration failed' };
      }

      // Log registration response
      await this.logAccess({
        sp_tag: dept_tag,
        request_method: 'POST',
        request_uri: 'REGISTRATION_RESPONSE',
        request_time: Date.now(),
        post_info: '{}',
        user_agent: (req.headers['user-agent'] || '') as string,
        remote_ip: req.ip,
        response_return: JSON.stringify(regResp),
      });

      return regResp;
    } finally {
      releaseKey(idemKey);
    }
  }

  // 2) Pull status (on-demand)
  async pullStatus(dto: any, req: any) {
    const { dept_tag, app_id, service_id, in_principle_id } = dto;

    const service = await this.prisma.service.findFirst({
      where: { service_id },
      include: { department: true },
    });
    if (!service?.department) {
      return { statusCode: 404, message: 'Service not found' };
    }

    const url = `${service.department.baseUrl || service.service_url}/status/pull`;
    const body = {
      dept_id: service.department.id,
      app_id,
      service_id,
      in_principle_id,
    };

    await this.logAccess({
      sp_tag: dept_tag,
      request_method: 'POST',
      request_uri: url,
      request_time: Date.now(),
      post_info: JSON.stringify(body),
      user_agent: (req.headers['user-agent'] || '') as string,
      remote_ip: req.ip,
    });

    let resp: any;
    try {
      resp = await postJson<any>(url, body);
    } catch (e: any) {
      resp = { statusCode: 500, message: e?.message || 'Pull status failed' };
    }

    await this.logAccess({
      sp_tag: dept_tag,
      request_method: 'POST',
      request_uri: 'PULL_STATUS_RESPONSE',
      request_time: Date.now(),
      post_info: '{}',
      user_agent: (req.headers['user-agent'] || '') as string,
      remote_ip: req.ip,
      response_return: JSON.stringify(resp),
    });

    return resp;
  }

  // 3) Update status (outbound)
  async updateStatus(dto: any, req: any) {
    const { dept_tag, payload } = dto;
    const { service_id } = payload || {};

    const service = await this.prisma.service.findFirst({
      where: { service_id },
      include: { department: true },
    });
    if (!service?.department) {
      return { statusCode: 404, message: 'Service not found' };
    }

    const url = `${service.department.baseUrl || service.service_url}/status/update`;

    await this.logAccess({
      sp_tag: dept_tag,
      request_method: 'POST',
      request_uri: url,
      request_time: Date.now(),
      post_info: JSON.stringify(payload),
      user_agent: (req.headers['user-agent'] || '') as string,
      remote_ip: req.ip,
    });

    let resp: any;
    try {
      resp = await postJson<any>(url, payload);
    } catch (e: any) {
      resp = { statusCode: 500, message: e?.message || 'Update status failed' };
    }

    await this.logAccess({
      sp_tag: dept_tag,
      request_method: 'POST',
      request_uri: 'UPDATE_STATUS_RESPONSE',
      request_time: Date.now(),
      post_info: '{}',
      user_agent: (req.headers['user-agent'] || '') as string,
      remote_ip: req.ip,
      response_return: JSON.stringify(resp),
    });

    return resp;
  }

  // 4) Webhook handler (inbound from department)
  async handleWebhookUpdateStatus(dto: any, sharedToken: string | undefined, req: any) {
    const configuredToken = process.env.WEBHOOK_SHARED_TOKEN;

    if (configuredToken && sharedToken !== configuredToken) {
      return { statusCode: 401, message: 'Unauthorized: invalid shared token' };
    }

    const { dept_tag, payload } = dto;

    await this.logAccess({
      sp_tag: dept_tag,
      request_method: 'POST',
      request_uri: '/dept/webhook/update-status',
      request_time: Date.now(),
      post_info: JSON.stringify(payload),
      user_agent: (req.headers['user-agent'] || '') as string,
      remote_ip: req.ip,
    });

    const resp = { statusCode: 200, message: 'Webhook received' };

    await this.logAccess({
      sp_tag: dept_tag,
      request_method: 'POST',
      request_uri: 'INBOUND_UPDATE_STATUS_RESPONSE',
      request_time: Date.now(),
      post_info: '{}',
      user_agent: (req.headers['user-agent'] || '') as string,
      remote_ip: req.ip,
      response_return: JSON.stringify(resp),
    });

    return resp;
  }

  // Build registration payload
  private async buildRegistrationPayload({
    uid,
    caf_id,
    app_id,
    service_id,
    dept_id,
    proposal_type,
  }: {
    uid: string;
    caf_id: string;
    app_id: string;
    service_id: string;
    dept_id: number;
    proposal_type: string;
  }) {
    const user = await this.prisma.users
      .findFirst({
        where: {
          investor_profile: {
            is: { uid },
          },
        },
        include: { investor_profile: true },
      })
      .catch(async () => {
        const profile = await this.prisma.investor_profiles.findUnique({ where: { uid } });
        return profile
          ? await this.prisma.users.findUnique({
              where: { id: profile.user_id },
              include: { investor_profile: true },
            })
          : null;
      });

    const full_name = [user?.investor_profile?.first_name, user?.investor_profile?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();
    const email = user?.email || user?.investor_profile?.cons_email || '';
    const mobile = String(user?.investor_profile?.mobile_number || '');
    const pan = user?.investor_profile?.pan_card || '';

    const docs = await this.prisma.investorDocument.findMany({
      where: { investorProfileUid: uid, isDocumentActive: 'Y' },
      include: { documentMaster: true },
    });

    const documents: Record<string, string> = {};
    for (const d of docs) {
      const key = d.documentMaster?.checklistId;
      const url = toPublicUrl(d.documentPath);
      if (key) documents[key] = url;
    }

    return {
      user: { full_name, email, mobile, pan },
      caf: {
        caf_id,
        proposal_type,
        service_id,
        dept_id,
        app_id,
        in_principle_id: uid,
      },
      documents,
    };
  }

  // Logging helper
  private async logAccess(entry: {
    sp_tag?: string;
    request_method: 'GET' | 'POST';
    request_uri: string;
    request_time: number;
    post_info: string;
    user_agent?: string;
    remote_ip?: string;
    response_return?: string;
  }) {
    try {
      await this.prisma.boApiAccessLog.create({ data: entry });
    } catch (e) {
      // swallow logging errors to avoid breaking flow
    }
  }
}
