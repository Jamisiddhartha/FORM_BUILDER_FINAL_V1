import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MasterDataUploadStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateMasterDataDefinitionDto,
  CreateMasterDataProjectDto,
  CreateMasterDataRecordDto,
  CreateSubDepartmentDto,
  UpdateMasterDataDefinitionDto,
  UpdateMasterDataProjectDto,
  UpdateMasterDataRecordDto,
  UpdateSubDepartmentDto,
} from './dto';

type DefinitionRecordRow = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  parent_id: number | null;
  valid_from: string | null;
  valid_to: string | null;
  department_id: number | null;
  sub_department_id: number | null;
  department_name: string | null;
  sub_department_name: string | null;
  sort_order: number;
  metadata: Record<string, any> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type MasterDefinitionV2Row = {
  id: number;
  tenantId: number;
  projectId: number | null;
  name: string;
  code: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  isSystem: boolean;
  allowImport: boolean;
  displayOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  masterDataCount: number;
};

type MasterColumnDefinitionV2Row = {
  id: number;
  masterId: number;
  columnKey: string;
  columnLabel: string;
  dataType: string;
  isRequired: boolean;
  isUnique: boolean;
  isSearchable: boolean;
  isListable: boolean;
  isFilterable: boolean;
  displayOrder: number;
  options: Record<string, any> | null;
  validation: Record<string, any> | null;
  defaultValue: string | null;
  placeholder: string | null;
  createdAt: string;
  updatedAt: string;
};

type MasterDataEntryV2Row = {
  id: string;
  masterId: number;
  tenantId: number;
  data: Record<string, any>;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type MasterDataReferenceV2Row = {
  id: string;
  fromDataId: string;
  toDataId: string;
  columnKey: string;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class MasterDataManagementService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeMasterDataEnvelope(
    dto: any,
    existingData: Record<string, any> = {},
  ) {
    const nextValidFrom = dto.valid_from;
    const nextValidTo = dto.valid_to;

    if (nextValidFrom && nextValidTo && new Date(nextValidFrom) > new Date(nextValidTo)) {
      throw new BadRequestException('Valid From cannot be later than Valid To');
    }

    const normalizedData = {
      ...existingData,
      ...(dto.data || {}),
    };

    if (dto.valid_from !== undefined) {
      normalizedData.valid_from = dto.valid_from || null;
    }

    if (dto.valid_to !== undefined) {
      normalizedData.valid_to = dto.valid_to || null;
    }

    if (dto.sort_order !== undefined) {
      const parsedSortOrder = Number(dto.sort_order);
      normalizedData.sort_order =
        dto.sort_order === null || dto.sort_order === ''
          ? 0
          : Number.isFinite(parsedSortOrder)
            ? parsedSortOrder
            : 0;
    }

    if (dto.is_active !== undefined) {
      normalizedData.is_active = dto.is_active;
    }

    return {
      data: normalizedData,
      isActive: dto.is_active ?? dto.isActive,
    };
  }

  async getTenants() {
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        t.id,
        t.name,
        t.slug,
        t.domain,
        t.logo_url AS "logoUrl",
        t.primary_color AS "primaryColor",
        t.plan,
        t.settings,
        t.is_active AS "isActive",
        t.created_at AS "createdAt",
        t.updated_at AS "updatedAt",
        COUNT(DISTINCT tp.id)::int AS "projectCount",
        COUNT(DISTINCT md.id)::int AS "masterDefinitionCount"
      FROM public."tenants" t
      LEFT JOIN public."tenant_projects" tp
        ON tp.tenant_id = t.id
      LEFT JOIN mdm_industrial_approvals."mdm_master_definitions_v2" md
        ON md.tenant_id = t.id
      GROUP BY
        t.id,
        t.name,
        t.slug,
        t.domain,
        t.logo_url,
        t.primary_color,
        t.plan,
        t.settings,
        t.is_active,
        t.created_at,
        t.updated_at
      ORDER BY t.is_active DESC, t.name ASC
    `);
  }

  async getTenantProjects(tenantId?: number) {
    const whereClause = tenantId ? `WHERE tp.tenant_id = ${Number(tenantId)}` : '';

    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        tp.id,
        tp.tenant_id AS "tenantId",
        tp.name,
        tp.code,
        tp.description,
        tp.start_date AS "startDate",
        tp.end_date AS "endDate",
        tp.is_active AS "isActive",
        tp.created_at AS "createdAt",
        tp.updated_at AS "updatedAt",
        json_build_object(
          'id', t.id,
          'name', t.name,
          'slug', t.slug
        ) AS tenant,
        COUNT(DISTINCT md.id)::int AS "masterDefinitionCount"
      FROM public."tenant_projects" tp
      INNER JOIN public."tenants" t
        ON t.id = tp.tenant_id
      LEFT JOIN mdm_industrial_approvals."mdm_master_definitions_v2" md
        ON md.project_id = tp.id
      ${whereClause}
      GROUP BY
        tp.id,
        tp.tenant_id,
        tp.name,
        tp.code,
        tp.description,
        tp.start_date,
        tp.end_date,
        tp.is_active,
        tp.created_at,
        tp.updated_at,
        t.id,
        t.name,
        t.slug
      ORDER BY tp.is_active DESC, tp.name ASC
    `);
  }

  async getProjects() {
    const projects = await this.prisma.masterDataProject.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            masterDefinitions: true,
          },
        },
      },
    });

    return projects.map((project) => ({
      ...project,
      definitionCount: project._count.masterDefinitions,
    }));
  }

  async createProject(dto: CreateMasterDataProjectDto, _createdBy: string) {
    const normalizedCode = this.normalizeBusinessCode(dto.code);
    const schemaName = this.buildSchemaName(normalizedCode);

    await this.prisma.$executeRawUnsafe(
      `CREATE SCHEMA IF NOT EXISTS ${this.quoteIdentifier(schemaName)}`,
    );

    return this.prisma.masterDataProject.create({
      data: {
        name: dto.name.trim(),
        code: normalizedCode,
        description: dto.description?.trim() || null,
        schemaName,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async updateProject(id: number, dto: UpdateMasterDataProjectDto) {
    await this.getProjectOrThrow(id);

    return this.prisma.masterDataProject.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description:
          dto.description === undefined ? undefined : dto.description?.trim() || null,
        isActive: dto.isActive,
      },
    });
  }

  async toggleProject(id: number) {
    const project = await this.getProjectOrThrow(id);
    return this.prisma.masterDataProject.update({
      where: { id },
      data: { isActive: !project.isActive },
    });
  }

  async getSubDepartments(departmentId?: number) {
    return this.prisma.subDepartment.findMany({
      where: departmentId ? { departmentId } : undefined,
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ departmentId: 'asc' }, { name: 'asc' }],
    });
  }

  async createSubDepartment(dto: CreateSubDepartmentDto) {
    await this.ensureDepartmentExists(dto.departmentId);

    const code = dto.code?.trim()
      ? this.normalizeBusinessCode(dto.code)
      : this.normalizeBusinessCode(dto.name);

    return this.prisma.subDepartment.create({
      data: {
        departmentId: dto.departmentId,
        name: dto.name.trim(),
        code,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async updateSubDepartment(id: number, dto: UpdateSubDepartmentDto) {
    await this.ensureSubDepartmentExists(id);

    return this.prisma.subDepartment.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        isActive: dto.isActive,
      },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async toggleSubDepartment(id: number) {
    const subDepartment = await this.ensureSubDepartmentExists(id);
    return this.prisma.subDepartment.update({
      where: { id },
      data: { isActive: !subDepartment.isActive },
    });
  }

  async getDefinitions(filters?: { projectId?: number; search?: string }) {
    const where: Record<string, any> = {};

    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { tableName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const definitions = await this.prisma.masterDataDefinition.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: {
        project: true,
        defaultDepartment: {
          select: { id: true, name: true },
        },
        defaultSubDepartment: {
          select: { id: true, name: true, departmentId: true },
        },
        masterTable: {
          select: {
            id: true,
            master_code: true,
            api_endpoint: true,
          },
        },
        uploadBatches: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
    });

    return Promise.all(
      definitions.map(async (definition) => ({
        ...definition,
        recordCount: await this.getRecordCount(definition.schemaName, definition.tableName),
      })),
    );
  }

  async getDefinition(id: number) {
    const definition = await this.getDefinitionOrThrow(id);
    const records = await this.fetchRecords(definition.schemaName, definition.tableName);

    return {
      ...definition,
      recordCount: records.length,
      records,
      tree: this.buildTree(records),
    };
  }

  async createDefinition(dto: CreateMasterDataDefinitionDto, createdBy: string) {
    const project = await this.getProjectOrThrow(dto.projectId);
    this.validateDefinitionDates(dto.validFrom, dto.validTo);
    await this.validateDepartmentMapping(
      dto.mapDepartment ?? false,
      dto.mapSubDepartment ?? false,
      dto.defaultDepartmentId,
      dto.defaultSubDepartmentId,
    );

    const definitionCode = this.normalizeBusinessCode(dto.code);
    const tableName = this.buildTableName(definitionCode);
    const masterCode = this.buildRegistryCode(project.code, definitionCode);

    await this.ensurePhysicalTable(project.schemaName, tableName);

    const created = await this.prisma.$transaction(async (tx) => {
      const masterTable = await tx.master_tables.create({
        data: {
          master_name: dto.name.trim(),
          master_code: masterCode,
          description: dto.description?.trim() || null,
          table_name: tableName,
          schema_name: project.schemaName,
          value_column: 'id',
          label_column: 'name',
          secondary_label: 'code',
          label_template: '{name} ({code})',
          is_active_column: 'is_active',
          is_active_value: 'true',
          default_order_by: '"sort_order" ASC, "name" ASC',
          parent_column: 'parent_id',
          api_endpoint: `/master/master-tables/${masterCode}/options`,
          is_active: dto.isActive !== undefined ? dto.isActive : true,
          created_by: createdBy,
        },
      });

      return tx.masterDataDefinition.create({
        data: {
          projectId: project.id,
          name: dto.name.trim(),
          code: definitionCode,
          description: dto.description?.trim() || null,
          schemaName: project.schemaName,
          tableName,
          supportsHierarchy: dto.supportsHierarchy ?? true,
          hasValidityPeriod: dto.hasValidityPeriod ?? true,
          mapDepartment: dto.mapDepartment ?? false,
          mapSubDepartment: dto.mapSubDepartment ?? false,
          defaultDepartmentId: dto.defaultDepartmentId || null,
          defaultSubDepartmentId: dto.defaultSubDepartmentId || null,
          validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
          validTo: dto.validTo ? new Date(dto.validTo) : null,
          masterTableId: masterTable.id,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
          createdBy,
        },
        include: {
          project: true,
          defaultDepartment: { select: { id: true, name: true } },
          defaultSubDepartment: { select: { id: true, name: true, departmentId: true } },
          masterTable: true,
        },
      });
    });

    return {
      ...created,
      recordCount: 0,
    };
  }

  async updateDefinition(id: number, dto: UpdateMasterDataDefinitionDto) {
    const definition = await this.getDefinitionOrThrow(id);
    this.validateDefinitionDates(dto.validFrom, dto.validTo);
    await this.validateDepartmentMapping(
      dto.mapDepartment ?? definition.mapDepartment,
      dto.mapSubDepartment ?? definition.mapSubDepartment,
      dto.defaultDepartmentId === undefined
        ? definition.defaultDepartmentId || undefined
        : dto.defaultDepartmentId || undefined,
      dto.defaultSubDepartmentId === undefined
        ? definition.defaultSubDepartmentId || undefined
        : dto.defaultSubDepartmentId || undefined,
    );

    return this.prisma.$transaction(async (tx) => {
      if (definition.masterTableId) {
        await tx.master_tables.update({
          where: { id: definition.masterTableId },
          data: {
            master_name: dto.name?.trim() || undefined,
            description:
              dto.description === undefined ? undefined : dto.description?.trim() || null,
            is_active: dto.isActive,
          },
        });
      }

      return tx.masterDataDefinition.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description:
            dto.description === undefined ? undefined : dto.description?.trim() || null,
          supportsHierarchy: dto.supportsHierarchy,
          hasValidityPeriod: dto.hasValidityPeriod,
          mapDepartment: dto.mapDepartment,
          mapSubDepartment: dto.mapSubDepartment,
          defaultDepartmentId:
            dto.defaultDepartmentId === undefined ? undefined : dto.defaultDepartmentId,
          defaultSubDepartmentId:
            dto.defaultSubDepartmentId === undefined
              ? undefined
              : dto.defaultSubDepartmentId,
          validFrom:
            dto.validFrom === undefined
              ? undefined
              : dto.validFrom
                ? new Date(dto.validFrom)
                : null,
          validTo:
            dto.validTo === undefined
              ? undefined
              : dto.validTo
                ? new Date(dto.validTo)
                : null,
          isActive: dto.isActive,
        },
        include: {
          project: true,
          defaultDepartment: { select: { id: true, name: true } },
          defaultSubDepartment: { select: { id: true, name: true, departmentId: true } },
          masterTable: true,
        },
      });
    });
  }

  async toggleDefinition(id: number) {
    const definition = await this.getDefinitionOrThrow(id);
    return this.prisma.$transaction(async (tx) => {
      if (definition.masterTableId) {
        await tx.master_tables.update({
          where: { id: definition.masterTableId },
          data: { is_active: !definition.isActive },
        });
      }

      return tx.masterDataDefinition.update({
        where: { id },
        data: { isActive: !definition.isActive },
      });
    });
  }

  async deleteDefinition(id: number) {
    const definition = await this.getDefinitionOrThrow(id);
    const qualifiedTable = this.qualifiedTable(definition.schemaName, definition.tableName);

    await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${qualifiedTable}`);

    await this.prisma.$transaction(async (tx) => {
      await tx.masterDataUploadBatch.deleteMany({
        where: { masterDefinitionId: id },
      });

      await tx.masterDataDefinition.delete({
        where: { id },
      });

      if (definition.masterTableId) {
        await tx.master_tables.delete({
          where: { id: definition.masterTableId },
        });
      }
    });

    return { success: true };
  }

  async getRecords(definitionId: number) {
    const definition = await this.getDefinitionOrThrow(definitionId);
    const records = await this.fetchRecords(definition.schemaName, definition.tableName);

    return {
      definitionId,
      records,
      tree: this.buildTree(records),
    };
  }

  async createRecord(definitionId: number, dto: CreateMasterDataRecordDto) {
    const definition = await this.getDefinitionOrThrow(definitionId);
    await this.validateRecordPayload(definition, dto);

    const query = `
      INSERT INTO ${this.qualifiedTable(definition.schemaName, definition.tableName)}
      (
        code,
        name,
        description,
        parent_id,
        valid_from,
        valid_to,
        department_id,
        sub_department_id,
        sort_order,
        metadata,
        is_active,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
      RETURNING *;
    `;

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      query,
      this.normalizeBusinessCode(dto.code),
      dto.name.trim(),
      dto.description?.trim() || null,
      definition.supportsHierarchy ? dto.parentId || null : null,
      definition.hasValidityPeriod ? this.toDateOrNull(dto.validFrom) : null,
      definition.hasValidityPeriod ? this.toDateOrNull(dto.validTo) : null,
      definition.mapDepartment ? dto.departmentId || definition.defaultDepartmentId || null : null,
      definition.mapSubDepartment
        ? dto.subDepartmentId || definition.defaultSubDepartmentId || null
        : null,
      dto.sortOrder ?? 0,
      dto.metadata || {},
      dto.isActive !== undefined ? dto.isActive : true,
    );

    return rows[0];
  }

  async updateRecord(
    definitionId: number,
    recordId: number,
    dto: UpdateMasterDataRecordDto,
  ) {
    const definition = await this.getDefinitionOrThrow(definitionId);
    const existing = await this.findRecordById(definition, recordId);
    if (!existing) {
      throw new NotFoundException(`Record ${recordId} not found`);
    }

    const payload: CreateMasterDataRecordDto = {
      code: dto.code ?? existing.code,
      name: dto.name ?? existing.name,
      description: dto.description ?? existing.description ?? undefined,
      parentId: dto.parentId === undefined ? existing.parent_id : dto.parentId,
      validFrom: dto.validFrom === undefined ? existing.valid_from : dto.validFrom,
      validTo: dto.validTo === undefined ? existing.valid_to : dto.validTo,
      departmentId:
        dto.departmentId === undefined ? existing.department_id : dto.departmentId,
      subDepartmentId:
        dto.subDepartmentId === undefined
          ? existing.sub_department_id
          : dto.subDepartmentId,
      sortOrder: dto.sortOrder ?? existing.sort_order,
      metadata: dto.metadata ?? existing.metadata ?? {},
      isActive: dto.isActive ?? existing.is_active,
    };

    await this.validateRecordPayload(definition, payload, recordId);

    const query = `
      UPDATE ${this.qualifiedTable(definition.schemaName, definition.tableName)}
      SET
        code = $1,
        name = $2,
        description = $3,
        parent_id = $4,
        valid_from = $5,
        valid_to = $6,
        department_id = $7,
        sub_department_id = $8,
        sort_order = $9,
        metadata = $10,
        is_active = $11,
        updated_at = NOW()
      WHERE id = $12
      RETURNING *;
    `;

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      query,
      this.normalizeBusinessCode(payload.code),
      payload.name.trim(),
      payload.description?.trim() || null,
      definition.supportsHierarchy ? payload.parentId || null : null,
      definition.hasValidityPeriod ? this.toDateOrNull(payload.validFrom) : null,
      definition.hasValidityPeriod ? this.toDateOrNull(payload.validTo) : null,
      definition.mapDepartment
        ? payload.departmentId || definition.defaultDepartmentId || null
        : null,
      definition.mapSubDepartment
        ? payload.subDepartmentId || definition.defaultSubDepartmentId || null
        : null,
      payload.sortOrder ?? 0,
      payload.metadata || {},
      payload.isActive !== undefined ? payload.isActive : true,
      recordId,
    );

    return rows[0];
  }

  async deleteRecord(definitionId: number, recordId: number) {
    const definition = await this.getDefinitionOrThrow(definitionId);
    await this.findRecordByIdOrThrow(definition, recordId);

    await this.prisma.$executeRawUnsafe(
      `DELETE FROM ${this.qualifiedTable(definition.schemaName, definition.tableName)} WHERE id = $1`,
      recordId,
    );

    return { success: true };
  }

  async uploadCsv(
    definitionId: number,
    file: Express.Multer.File | undefined,
    _uploadedBy: string,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('CSV file is required');
    }

    const definition = await this.getDefinitionOrThrow(definitionId);

    const batch = await this.prisma.masterDataUploadBatch.create({
      data: {
        masterDefinitionId: definition.id,
        fileName: file.originalname,
        status: MasterDataUploadStatus.PENDING,
      },
    });

    const errors: Array<{ row: number; message: string }> = [];
    let successCount = 0;

    try {
      const rows = this.parseCsv(file.buffer.toString('utf-8'));

      const normalizedRows = rows.map((row, index) =>
        this.normalizeCsvRow(row, index + 2),
      );

      for (const normalizedRow of normalizedRows) {
        try {
          const payload = normalizedRow.payload;

          if (payload.metadata?.__parentCode) {
            const parent = await this.findRecordByCode(
              definition,
              String(payload.metadata.__parentCode),
            );
            payload.parentId = parent ? Number(parent.id) : undefined;
            delete payload.metadata.__parentCode;
          }

          const existing = await this.findRecordByCode(definition, payload.code);

          if (existing) {
            await this.updateRecord(definition.id, Number(existing.id), payload);
          } else {
            await this.createRecord(definition.id, payload);
          }

          successCount += 1;
        } catch (error: any) {
          errors.push({
            row: normalizedRow.rowNumber,
            message: error?.message || 'Failed to import row',
          });
        }
      }

      const failedRows = errors.length;
      const status =
        failedRows === 0
          ? MasterDataUploadStatus.COMPLETED
          : successCount > 0
            ? MasterDataUploadStatus.PARTIAL
            : MasterDataUploadStatus.FAILED;

      await this.prisma.masterDataUploadBatch.update({
        where: { id: batch.id },
        data: {
          status,
          totalRows: normalizedRows.length,
          successfulRows: successCount,
          failedRows,
          errorReport: errors,
        },
      });

      return {
        batchId: batch.id,
        status,
        totalRows: normalizedRows.length,
        successfulRows: successCount,
        failedRows,
        errors,
      };
    } catch (error: any) {
      await this.prisma.masterDataUploadBatch.update({
        where: { id: batch.id },
        data: {
          status: MasterDataUploadStatus.FAILED,
          totalRows: 0,
          successfulRows: 0,
          failedRows: 0,
          errorReport: [{ row: 0, message: error?.message || 'Unable to parse CSV' }],
        },
      });

      throw new BadRequestException(error?.message || 'Unable to parse CSV');
    }
  }

  private async getProjectOrThrow(id: number) {
    const project = await this.prisma.masterDataProject.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return project;
  }

  private async getDefinitionOrThrow(id: number) {
    const definition = await this.prisma.masterDataDefinition.findUnique({
      where: { id },
      include: {
        project: true,
        defaultDepartment: {
          select: { id: true, name: true },
        },
        defaultSubDepartment: {
          select: { id: true, name: true, departmentId: true },
        },
        masterTable: true,
        uploadBatches: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!definition) {
      throw new NotFoundException(`Master definition ${id} not found`);
    }

    return definition;
  }

  private async ensureTenantExists(id: number) {
    const rows = await this.prisma.$queryRawUnsafe<Array<{ id: number }>>(
      `SELECT id FROM public."tenants" WHERE id = $1 LIMIT 1`,
      id,
    );

    if (!rows[0]) {
      throw new BadRequestException(`Tenant ${id} not found`);
    }
  }

  private async ensureTenantProjectExists(id: number) {
    const rows = await this.prisma.$queryRawUnsafe<Array<{ id: number; tenantId: number }>>(
      `
        SELECT
          id,
          tenant_id AS "tenantId"
        FROM public."tenant_projects"
        WHERE id = $1
        LIMIT 1
      `,
      id,
    );
    const project = rows[0];

    if (!project) {
      throw new BadRequestException(`Tenant project ${id} not found`);
    }

    return project;
  }

  private async validateTenantProject(tenantId: number, projectId?: number | null) {
    await this.ensureTenantExists(tenantId);

    if (!projectId) {
      return null;
    }

    const project = await this.ensureTenantProjectExists(projectId);

    if (project.tenantId !== tenantId) {
      throw new BadRequestException(
        'Selected tenant project does not belong to the selected tenant',
      );
    }

    return project;
  }

  private async enrichMasterDefinitions<T extends { tenantId: number; projectId?: number | null }>(
    definitions: T[],
  ) {
    if (!definitions.length) {
      return definitions;
    }

    const tenantIds = [...new Set(definitions.map((definition) => definition.tenantId))];
    const projectIds = [
      ...new Set(
        definitions
          .map((definition) => definition.projectId)
          .filter((projectId): projectId is number => Number.isInteger(projectId)),
      ),
    ];

    const tenantMap = new Map<number, { id: number; name: string; slug: string }>();
    const projectMap = new Map<
      number,
      { id: number; tenantId: number; name: string; code: string; isActive: boolean }
    >();

    if (tenantIds.length) {
      const tenantRows = await this.prisma.$queryRawUnsafe<Array<{ id: number; name: string; slug: string }>>(
        `
          SELECT id, name, slug
          FROM public."tenants"
          WHERE id IN (${tenantIds.join(',')})
        `,
      );

      tenantRows.forEach((tenant) => {
        tenantMap.set(tenant.id, tenant);
      });
    }

    if (projectIds.length) {
      const projectRows = await this.prisma.$queryRawUnsafe<
        Array<{ id: number; tenantId: number; name: string; code: string; isActive: boolean }>
      >(
        `
          SELECT
            id,
            tenant_id AS "tenantId",
            name,
            code,
            is_active AS "isActive"
          FROM public."tenant_projects"
          WHERE id IN (${projectIds.join(',')})
        `,
      );

      projectRows.forEach((project) => {
        projectMap.set(project.id, project);
      });
    }

    return definitions.map((definition) => ({
      ...definition,
      tenant: tenantMap.get(definition.tenantId) ?? null,
      project:
        definition.projectId && projectMap.has(definition.projectId)
          ? projectMap.get(definition.projectId) ?? null
          : null,
    }));
  }

  private async ensureDepartmentExists(id: number) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!department) {
      throw new BadRequestException(`Department ${id} not found`);
    }
  }

  private async ensureSubDepartmentExists(id: number) {
    const subDepartment = await this.prisma.subDepartment.findUnique({
      where: { id },
    });

    if (!subDepartment) {
      throw new BadRequestException(`Sub-department ${id} not found`);
    }

    return subDepartment;
  }

  private normalizeBusinessCode(value: string) {
    const normalized = value
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase();

    if (!normalized) {
      throw new BadRequestException('Code must contain at least one alphanumeric character');
    }

    return normalized;
  }

  private toIdentifier(value: string) {
    const identifier = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    if (!identifier || !/^[a-z_][a-z0-9_]*$/.test(identifier)) {
      throw new BadRequestException(`Invalid identifier "${value}"`);
    }

    return identifier;
  }

  private buildSchemaName(projectCode: string) {
    return this.toIdentifier(`mdm_${projectCode}`);
  }

  private buildTableName(definitionCode: string) {
    return this.toIdentifier(`md_${definitionCode}`);
  }

  private buildRegistryCode(projectCode: string, definitionCode: string) {
    return `MDM_${this.normalizeBusinessCode(projectCode)}_${this.normalizeBusinessCode(
      definitionCode,
    )}`;
  }

  private quoteIdentifier(value: string) {
    return `"${this.toIdentifier(value).replace(/"/g, '""')}"`;
  }

  private qualifiedTable(schemaName: string, tableName: string) {
    return `${this.quoteIdentifier(schemaName)}.${this.quoteIdentifier(tableName)}`;
  }

  private async ensurePhysicalTable(schemaName: string, tableName: string) {
    const qualifiedTable = this.qualifiedTable(schemaName, tableName);

    await this.prisma.$executeRawUnsafe(
      `CREATE SCHEMA IF NOT EXISTS ${this.quoteIdentifier(schemaName)}`,
    );

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${qualifiedTable} (
        id BIGSERIAL PRIMARY KEY,
        code VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        parent_id BIGINT NULL,
        valid_from DATE NULL,
        valid_to DATE NULL,
        department_id INT NULL,
        sub_department_id INT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT ${this.toIdentifier(`${tableName}_parent_fk`)} FOREIGN KEY(parent_id)
          REFERENCES ${qualifiedTable}(id) ON DELETE SET NULL,
        CONSTRAINT ${this.toIdentifier(`${tableName}_department_fk`)} FOREIGN KEY(department_id)
          REFERENCES public."m_departments"(id) ON DELETE SET NULL,
        CONSTRAINT ${this.toIdentifier(`${tableName}_sub_department_fk`)} FOREIGN KEY(sub_department_id)
          REFERENCES public."m_sub_departments"(id) ON DELETE SET NULL
      )
    `);

    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS ${this.quoteIdentifier(`${tableName}_parent_idx`)}
      ON ${qualifiedTable} ("parent_id")
    `);

    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS ${this.quoteIdentifier(`${tableName}_department_idx`)}
      ON ${qualifiedTable} ("department_id")
    `);
  }

  private validateDefinitionDates(validFrom?: string | null, validTo?: string | null) {
    if (validFrom && validTo && new Date(validFrom) > new Date(validTo)) {
      throw new BadRequestException('Valid from date cannot be after valid to date');
    }
  }

  private async validateDepartmentMapping(
    mapDepartment: boolean,
    mapSubDepartment: boolean,
    defaultDepartmentId?: number | null,
    defaultSubDepartmentId?: number | null,
  ) {
    if (mapSubDepartment && !mapDepartment) {
      throw new BadRequestException(
        'Sub-department mapping requires department mapping to be enabled',
      );
    }

    if (defaultDepartmentId) {
      await this.ensureDepartmentExists(defaultDepartmentId);
    }

    if (defaultSubDepartmentId) {
      const subDepartment = await this.ensureSubDepartmentExists(defaultSubDepartmentId);
      if (defaultDepartmentId && subDepartment.departmentId !== defaultDepartmentId) {
        throw new BadRequestException(
          'Default sub-department must belong to the selected default department',
        );
      }
    }
  }

  private async validateRecordPayload(
    definition: any,
    dto: CreateMasterDataRecordDto,
    currentRecordId?: number,
  ) {
    this.validateDefinitionDates(dto.validFrom ?? null, dto.validTo ?? null);

    if (definition.supportsHierarchy && dto.parentId) {
      await this.findRecordByIdOrThrow(definition, dto.parentId);
      if (currentRecordId) {
        if (dto.parentId === currentRecordId) {
          throw new BadRequestException('A record cannot be its own parent');
        }

        const isDescendant = await this.isDescendant(
          definition,
          currentRecordId,
          dto.parentId,
        );

        if (isDescendant) {
          throw new BadRequestException(
            'Cannot assign a descendant as the parent of the current record',
          );
        }
      }
    }

    if (definition.mapDepartment) {
      const departmentId = dto.departmentId || definition.defaultDepartmentId;
      if (departmentId) {
        await this.ensureDepartmentExists(Number(departmentId));
      }
    }

    if (definition.mapSubDepartment) {
      const subDepartmentId = dto.subDepartmentId || definition.defaultSubDepartmentId;
      if (subDepartmentId) {
        const subDepartment = await this.ensureSubDepartmentExists(Number(subDepartmentId));
        const departmentId = dto.departmentId || definition.defaultDepartmentId;
        if (departmentId && subDepartment.departmentId !== Number(departmentId)) {
          throw new BadRequestException(
            'Selected sub-department does not belong to the selected department',
          );
        }
      }
    }
  }

  private async isDescendant(definition: any, currentRecordId: number, parentId: number) {
    const qualifiedTable = this.qualifiedTable(definition.schemaName, definition.tableName);
    const query = `
      WITH RECURSIVE descendants AS (
        SELECT id, parent_id
        FROM ${qualifiedTable}
        WHERE id = $1
        UNION ALL
        SELECT child.id, child.parent_id
        FROM ${qualifiedTable} child
        INNER JOIN descendants d ON child.parent_id = d.id
      )
      SELECT id FROM descendants WHERE id = $2 LIMIT 1;
    `;

    const rows = await this.prisma.$queryRawUnsafe<any[]>(query, currentRecordId, parentId);
    return rows.length > 0;
  }

  private async fetchRecords(schemaName: string, tableName: string) {
    const query = `
      SELECT
        r.*,
        d.name AS department_name,
        sd.name AS sub_department_name
      FROM ${this.qualifiedTable(schemaName, tableName)} r
      LEFT JOIN public."m_departments" d ON d.id = r.department_id
      LEFT JOIN public."m_sub_departments" sd ON sd.id = r.sub_department_id
      ORDER BY r.sort_order ASC, r.name ASC;
    `;

    return this.prisma.$queryRawUnsafe<DefinitionRecordRow[]>(query);
  }

  private buildTree(records: DefinitionRecordRow[]) {
    const map = new Map<
      number,
      {
        key: string;
        data: any;
        children: any[];
      }
    >();

    const roots: Array<{ key: string; data: any; children: any[] }> = [];

    for (const record of records) {
      map.set(record.id, {
        key: String(record.id),
        data: {
          ...record,
          validityPeriod:
            record.valid_from || record.valid_to
              ? `${record.valid_from || 'Open'} - ${record.valid_to || 'Open'}`
              : 'Open-ended',
        },
        children: [],
      });
    }

    for (const record of records) {
      const node = map.get(record.id)!;
      if (record.parent_id && map.has(record.parent_id)) {
        map.get(record.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  private async getRecordCount(schemaName: string, tableName: string) {
    const query = `SELECT COUNT(*)::int AS count FROM ${this.qualifiedTable(schemaName, tableName)}`;
    const result = await this.prisma.$queryRawUnsafe<Array<{ count: number }>>(query);
    return result[0]?.count || 0;
  }

  private async findRecordById(definition: any, id: number) {
    const query = `
      SELECT * FROM ${this.qualifiedTable(definition.schemaName, definition.tableName)}
      WHERE id = $1
      LIMIT 1;
    `;

    const rows = await this.prisma.$queryRawUnsafe<any[]>(query, id);
    return rows[0] || null;
  }

  private toSqlNumberList(values: Array<number | string | bigint>) {
    const normalized = values
      .map((value) => String(value).trim())
      .filter((value) => value.length > 0);

    if (!normalized.length) {
      return '';
    }

    for (const value of normalized) {
      if (!/^-?\d+$/.test(value)) {
        throw new BadRequestException(`Invalid numeric identifier "${value}"`);
      }
    }

    return normalized.join(', ');
  }

  private async queryMasterDefinitionV2Rows(filters?: {
    id?: number;
    tenantId?: number;
    projectId?: number;
    isActive?: boolean;
  }) {
    const clauses: string[] = [];
    const params: Array<number | boolean> = [];

    if (filters?.id !== undefined) {
      params.push(filters.id);
      clauses.push(`md.id = $${params.length}`);
    }

    if (filters?.tenantId !== undefined) {
      params.push(filters.tenantId);
      clauses.push(`md.tenant_id = $${params.length}`);
    }

    if (filters?.projectId !== undefined) {
      params.push(filters.projectId);
      clauses.push(`md.project_id = $${params.length}`);
    }

    if (filters?.isActive !== undefined) {
      params.push(filters.isActive);
      clauses.push(`md.is_active = $${params.length}`);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    return this.prisma.$queryRawUnsafe<Array<MasterDefinitionV2Row>>(
      `
        SELECT
          md.id,
          md.tenant_id AS "tenantId",
          md.project_id AS "projectId",
          md.name,
          md.code,
          md.description,
          md.icon,
          md.is_active AS "isActive",
          md.is_system AS "isSystem",
          md.allow_import AS "allowImport",
          md.display_order AS "displayOrder",
          md.created_by AS "createdBy",
          md.created_at AS "createdAt",
          md.updated_at AS "updatedAt",
          COALESCE(data_counts.count, 0)::int AS "masterDataCount"
        FROM mdm_industrial_approvals."mdm_master_definitions_v2" md
        LEFT JOIN (
          SELECT
            master_id,
            COUNT(*)::int AS count
          FROM mdm_industrial_approvals."mdm_master_data"
          GROUP BY master_id
        ) data_counts
          ON data_counts.master_id = md.id
        ${whereClause}
        ORDER BY md.display_order ASC, md.name ASC, md.id ASC
      `,
      ...params,
    );
  }

  private async queryMasterColumnDefinitionsV2ByMasterIds(masterIds: number[]) {
    if (!masterIds.length) {
      return [] as MasterColumnDefinitionV2Row[];
    }

    const idList = this.toSqlNumberList(masterIds);

    return this.prisma.$queryRawUnsafe<Array<MasterColumnDefinitionV2Row>>(
      `
        SELECT
          id,
          master_id AS "masterId",
          column_key AS "columnKey",
          column_label AS "columnLabel",
          data_type::text AS "dataType",
          is_required AS "isRequired",
          is_unique AS "isUnique",
          is_searchable AS "isSearchable",
          is_listable AS "isListable",
          is_filterable AS "isFilterable",
          display_order AS "displayOrder",
          options,
          validation,
          default_value AS "defaultValue",
          placeholder,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM mdm_industrial_approvals."mdm_master_column_definitions"
        WHERE master_id IN (${idList})
        ORDER BY display_order ASC, id ASC
      `,
    );
  }

  private async queryMasterColumnDefinitionV2ById(columnId: number) {
    const rows = await this.prisma.$queryRawUnsafe<Array<MasterColumnDefinitionV2Row>>(
      `
        SELECT
          id,
          master_id AS "masterId",
          column_key AS "columnKey",
          column_label AS "columnLabel",
          data_type::text AS "dataType",
          is_required AS "isRequired",
          is_unique AS "isUnique",
          is_searchable AS "isSearchable",
          is_listable AS "isListable",
          is_filterable AS "isFilterable",
          display_order AS "displayOrder",
          options,
          validation,
          default_value AS "defaultValue",
          placeholder,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM mdm_industrial_approvals."mdm_master_column_definitions"
        WHERE id = $1
        LIMIT 1
      `,
      columnId,
    );

    return rows[0] ?? null;
  }

  private async queryMasterDataEntriesV2(filters: {
    ids?: Array<string | bigint>;
    masterId?: number;
    tenantId?: number;
    isActive?: boolean;
    limit?: number;
  }) {
    const clauses: string[] = [];
    const params: Array<number | boolean> = [];

    if (filters.ids?.length) {
      clauses.push(`md.id IN (${this.toSqlNumberList(filters.ids)})`);
    }

    if (filters.masterId !== undefined) {
      params.push(filters.masterId);
      clauses.push(`md.master_id = $${params.length}`);
    }

    if (filters.tenantId !== undefined) {
      params.push(filters.tenantId);
      clauses.push(`md.tenant_id = $${params.length}`);
    }

    if (filters.isActive !== undefined) {
      params.push(filters.isActive);
      clauses.push(`md.is_active = $${params.length}`);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const limitClause =
      filters.limit !== undefined && Number.isFinite(filters.limit)
        ? `LIMIT ${Math.max(1, Number(filters.limit))}`
        : '';

    return this.prisma.$queryRawUnsafe<Array<MasterDataEntryV2Row>>(
      `
        SELECT
          md.id::text AS id,
          md.master_id AS "masterId",
          md.tenant_id AS "tenantId",
          md.data,
          md.is_active AS "isActive",
          md.created_by AS "createdBy",
          md.updated_by AS "updatedBy",
          md.created_at AS "createdAt",
          md.updated_at AS "updatedAt"
        FROM mdm_industrial_approvals."mdm_master_data" md
        ${whereClause}
        ORDER BY md.created_at DESC, md.id DESC
        ${limitClause}
      `,
      ...params,
    );
  }

  private async queryMasterDataEntryV2ById(id: bigint | string) {
    const rows = await this.queryMasterDataEntriesV2({ ids: [id], limit: 1 });
    return rows[0] ?? null;
  }

  private async queryMasterDataReferencesV2(dataIds: Array<string | bigint>) {
    if (!dataIds.length) {
      return [] as MasterDataReferenceV2Row[];
    }

    const idList = this.toSqlNumberList(dataIds);

    return this.prisma.$queryRawUnsafe<Array<MasterDataReferenceV2Row>>(
      `
        SELECT
          id::text AS id,
          from_data_id::text AS "fromDataId",
          to_data_id::text AS "toDataId",
          column_key AS "columnKey",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM mdm_industrial_approvals."mdm_master_data_references"
        WHERE from_data_id IN (${idList})
           OR to_data_id IN (${idList})
        ORDER BY created_at DESC, id DESC
      `,
    );
  }

  private async enrichMasterDataReferences(references: MasterDataReferenceV2Row[]) {
    if (!references.length) {
      return references;
    }

    const relatedIds = [
      ...new Set(
        references.flatMap((reference) => [reference.fromDataId, reference.toDataId]),
      ),
    ];
    const relatedEntries = await this.queryMasterDataEntriesV2({ ids: relatedIds });
    const relatedEntryMap = new Map(relatedEntries.map((entry) => [entry.id, entry]));

    return references.map((reference) => ({
      ...reference,
      fromData: relatedEntryMap.get(reference.fromDataId) ?? null,
      toData: relatedEntryMap.get(reference.toDataId) ?? null,
    }));
  }

  private async attachReferencesToMasterData<T extends MasterDataEntryV2Row>(entries: T[]) {
    if (!entries.length) {
      return entries;
    }

    const references = await this.enrichMasterDataReferences(
      await this.queryMasterDataReferencesV2(entries.map((entry) => entry.id)),
    );

    const fromMap = new Map<string, any[]>();
    const toMap = new Map<string, any[]>();

    for (const reference of references) {
      fromMap.set(reference.fromDataId, [...(fromMap.get(reference.fromDataId) ?? []), reference]);
      toMap.set(reference.toDataId, [...(toMap.get(reference.toDataId) ?? []), reference]);
    }

    return entries.map((entry) => ({
      ...entry,
      referencesFrom: fromMap.get(entry.id) ?? [],
      referencesTo: toMap.get(entry.id) ?? [],
    }));
  }

  // ========== MASTER DATA MANAGEMENT V2 METHODS ==========

  /**
   * Create a new master definition in the mdm_industrial_approvals schema
   */
  async createMasterDefinitionV2(
    dto: any, // CreateMasterDefinitionV2Dto
    createdBy: string,
  ) {
    await this.validateTenantProject(dto.tenantId, dto.projectId ?? null);

    const rows = await this.prisma.$queryRawUnsafe<Array<{ id: number }>>(
      `
        INSERT INTO mdm_industrial_approvals."mdm_master_definitions_v2" (
          tenant_id,
          project_id,
          name,
          code,
          description,
          icon,
          is_active,
          is_system,
          allow_import,
          display_order,
          created_by,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING id
      `,
      dto.tenantId,
      dto.projectId || null,
      dto.name.trim(),
      this.normalizeBusinessCode(dto.code),
      dto.description?.trim() || null,
      dto.icon?.trim() || null,
      dto.isActive !== undefined ? dto.isActive : true,
      dto.isSystem || false,
      dto.allowImport !== undefined ? dto.allowImport : true,
      dto.displayOrder || 0,
      createdBy,
    );

    return this.getMasterDefinitionV2(rows[0].id);
  }

  /**
   * Get all master definitions with optional filtering
   */
  async getMasterDefinitionsV2(filters?: {
    tenantId?: number;
    projectId?: number;
    isActive?: boolean;
  }) {
    const rows = await this.queryMasterDefinitionV2Rows(filters);
    const columns = await this.queryMasterColumnDefinitionsV2ByMasterIds(rows.map((row) => row.id));
    const columnsByMasterId = new Map<number, MasterColumnDefinitionV2Row[]>();

    for (const column of columns) {
      columnsByMasterId.set(column.masterId, [
        ...(columnsByMasterId.get(column.masterId) ?? []),
        column,
      ]);
    }

    const definitions = rows.map(({ masterDataCount, ...row }) => ({
      ...row,
      columnDefinitions: columnsByMasterId.get(row.id) ?? [],
      _count: {
        masterData: masterDataCount,
      },
    }));

    return this.enrichMasterDefinitions(definitions);
  }

  /**
   * Get a single master definition by ID
   */
  async getMasterDefinitionV2(id: number) {
    const rows = await this.queryMasterDefinitionV2Rows({ id });
    const row = rows[0];

    if (!row) {
      throw new NotFoundException(`Master definition with ID ${id} not found`);
    }

    const [columns, recentMasterData] = await Promise.all([
      this.queryMasterColumnDefinitionsV2ByMasterIds([id]),
      this.attachReferencesToMasterData(
        await this.queryMasterDataEntriesV2({
          masterId: id,
          limit: 10,
        }),
      ),
    ]);

    const definition = {
      ...row,
      columnDefinitions: columns,
      masterData: recentMasterData,
      _count: {
        masterData: row.masterDataCount,
      },
    };

    const [enrichedDefinition] = await this.enrichMasterDefinitions([definition]);
    return enrichedDefinition;
  }

  /**
   * Update a master definition
   */
  async updateMasterDefinitionV2(id: number, dto: any) {
    const existingDefinition = await this.getMasterDefinitionV2(id);

    if (dto.projectId !== undefined) {
      await this.validateTenantProject(existingDefinition.tenantId, dto.projectId);
    }

    await this.prisma.$queryRawUnsafe(
      `
        UPDATE mdm_industrial_approvals."mdm_master_definitions_v2"
        SET
          project_id = $1,
          name = $2,
          description = $3,
          icon = $4,
          is_active = $5,
          is_system = $6,
          allow_import = $7,
          display_order = $8,
          updated_at = NOW()
        WHERE id = $9
      `,
      dto.projectId === undefined ? existingDefinition.projectId ?? null : dto.projectId || null,
      dto.name === undefined ? existingDefinition.name : dto.name.trim(),
      dto.description === undefined
        ? existingDefinition.description ?? null
        : dto.description?.trim() || null,
      dto.icon === undefined ? existingDefinition.icon ?? null : dto.icon?.trim() || null,
      dto.isActive === undefined ? existingDefinition.isActive : dto.isActive,
      dto.isSystem === undefined ? existingDefinition.isSystem : dto.isSystem,
      dto.allowImport === undefined ? existingDefinition.allowImport : dto.allowImport,
      dto.displayOrder === undefined ? existingDefinition.displayOrder : dto.displayOrder,
      id,
    );

    return this.getMasterDefinitionV2(id);
  }

  /**
   * Delete a master definition and all related data
   */
  async deleteMasterDefinitionV2(id: number) {
    await this.getMasterDefinitionV2(id); // Verify exists

    await this.prisma.$queryRawUnsafe(
      `
        DELETE FROM mdm_industrial_approvals."mdm_master_definitions_v2"
        WHERE id = $1
      `,
      id,
    );

    return { success: true };
  }

  /**
   * Create column definitions for a master
   */
  async createMasterColumnDefinitionsV2(
    masterId: number,
    dtos: any[], // CreateMasterColumnDefinitionDto[]
  ) {
    await this.getMasterDefinitionV2(masterId); // Verify master exists

    const created: MasterColumnDefinitionV2Row[] = [];

    for (const dto of dtos) {
      const rows = await this.prisma.$queryRawUnsafe<Array<MasterColumnDefinitionV2Row>>(
        `
          INSERT INTO mdm_industrial_approvals."mdm_master_column_definitions" (
            master_id,
            column_key,
            column_label,
            data_type,
            is_required,
            is_unique,
            is_searchable,
            is_listable,
            is_filterable,
            display_order,
            options,
            validation,
            default_value,
            placeholder,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4::mdm_industrial_approvals."ColumnDataType",
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11::jsonb,
            $12::jsonb,
            $13,
            $14,
            NOW()
          )
          RETURNING
            id,
            master_id AS "masterId",
            column_key AS "columnKey",
            column_label AS "columnLabel",
            data_type::text AS "dataType",
            is_required AS "isRequired",
            is_unique AS "isUnique",
            is_searchable AS "isSearchable",
            is_listable AS "isListable",
            is_filterable AS "isFilterable",
            display_order AS "displayOrder",
            options,
            validation,
            default_value AS "defaultValue",
            placeholder,
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        `,
        masterId,
        this.toIdentifier(dto.columnKey),
        dto.columnLabel,
        dto.dataType,
        dto.isRequired || false,
        dto.isUnique || false,
        dto.isSearchable !== false,
        dto.isListable !== false,
        dto.isFilterable !== false,
        dto.displayOrder || 0,
        dto.options ? JSON.stringify(dto.options) : null,
        dto.validation ? JSON.stringify(dto.validation) : null,
        dto.defaultValue || null,
        dto.placeholder || null,
      );

      created.push(rows[0]);
    }

    return created;
  }

  /**
   * Get column definitions for a master
   */
  async getMasterColumnDefinitionsV2(masterId: number) {
    await this.getMasterDefinitionV2(masterId); // Verify master exists
    return this.queryMasterColumnDefinitionsV2ByMasterIds([masterId]);
  }

  /**
   * Update a column definition
   */
  async updateMasterColumnDefinitionV2(columnId: number, dto: any) {
    const column = await this.queryMasterColumnDefinitionV2ById(columnId);

    if (!column) {
      throw new NotFoundException(`Column definition with ID ${columnId} not found`);
    }

    const rows = await this.prisma.$queryRawUnsafe<Array<MasterColumnDefinitionV2Row>>(
      `
        UPDATE mdm_industrial_approvals."mdm_master_column_definitions"
        SET
          column_label = $1,
          is_required = $2,
          is_unique = $3,
          is_searchable = $4,
          is_listable = $5,
          is_filterable = $6,
          display_order = $7,
          options = $8::jsonb,
          validation = $9::jsonb,
          default_value = $10,
          placeholder = $11,
          updated_at = NOW()
        WHERE id = $12
        RETURNING
          id,
          master_id AS "masterId",
          column_key AS "columnKey",
          column_label AS "columnLabel",
          data_type::text AS "dataType",
          is_required AS "isRequired",
          is_unique AS "isUnique",
          is_searchable AS "isSearchable",
          is_listable AS "isListable",
          is_filterable AS "isFilterable",
          display_order AS "displayOrder",
          options,
          validation,
          default_value AS "defaultValue",
          placeholder,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      dto.columnLabel === undefined ? column.columnLabel : dto.columnLabel,
      dto.isRequired === undefined ? column.isRequired : dto.isRequired,
      dto.isUnique === undefined ? column.isUnique : dto.isUnique,
      dto.isSearchable === undefined ? column.isSearchable : dto.isSearchable,
      dto.isListable === undefined ? column.isListable : dto.isListable,
      dto.isFilterable === undefined ? column.isFilterable : dto.isFilterable,
      dto.displayOrder === undefined ? column.displayOrder : dto.displayOrder,
      dto.options === undefined
        ? column.options
          ? JSON.stringify(column.options)
          : null
        : dto.options
          ? JSON.stringify(dto.options)
          : null,
      dto.validation === undefined
        ? column.validation
          ? JSON.stringify(column.validation)
          : null
        : dto.validation
          ? JSON.stringify(dto.validation)
          : null,
      dto.defaultValue === undefined ? column.defaultValue ?? null : dto.defaultValue || null,
      dto.placeholder === undefined ? column.placeholder ?? null : dto.placeholder || null,
      columnId,
    );

    return rows[0];
  }

  /**
   * Delete a column definition
   */
  async deleteMasterColumnDefinitionV2(columnId: number) {
    const column = await this.queryMasterColumnDefinitionV2ById(columnId);

    if (!column) {
      throw new NotFoundException(`Column definition with ID ${columnId} not found`);
    }

    await this.prisma.$queryRawUnsafe(
      `
        DELETE FROM mdm_industrial_approvals."mdm_master_column_definitions"
        WHERE id = $1
      `,
      columnId,
    );

    return { success: true };
  }

  /**
   * Create master data
   */
  async createMasterDataV2(dto: any) {
    const definition = await this.getMasterDefinitionV2(dto.masterId);
    await this.ensureTenantExists(dto.tenantId);

    if (definition.tenantId !== dto.tenantId) {
      throw new BadRequestException('Selected tenant does not match the master definition tenant');
    }

    const normalized = this.normalizeMasterDataEnvelope(dto);

    const rows = await this.prisma.$queryRawUnsafe<Array<MasterDataEntryV2Row>>(
      `
        INSERT INTO mdm_industrial_approvals."mdm_master_data" (
          master_id,
          tenant_id,
          data,
          is_active,
          created_by,
          updated_at
        )
        VALUES ($1, $2, $3::jsonb, $4, $5, NOW())
        RETURNING
          id::text AS id,
          master_id AS "masterId",
          tenant_id AS "tenantId",
          data,
          is_active AS "isActive",
          created_by AS "createdBy",
          updated_by AS "updatedBy",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      dto.masterId,
      dto.tenantId,
      JSON.stringify(normalized.data),
      normalized.isActive !== undefined ? normalized.isActive : true,
      dto.createdBy || null,
    );

    const [entry] = await this.attachReferencesToMasterData(rows);
    return entry;
  }

  /**
   * Get master data with references
   */
  async getMasterDataV2(masterId: number, filters?: { tenantId?: number; isActive?: boolean }) {
    await this.getMasterDefinitionV2(masterId); // Verify master exists
    return this.attachReferencesToMasterData(
      await this.queryMasterDataEntriesV2({
        masterId,
        tenantId: filters?.tenantId,
        isActive: filters?.isActive,
      }),
    );
  }

  /**
   * Get single master data entry
   */
  async getMasterDataEntryV2(id: bigint) {
    const entry = await this.queryMasterDataEntryV2ById(id);

    if (!entry) {
      throw new NotFoundException(`Master data entry with ID ${id} not found`);
    }

    const [definitionRow] = await this.queryMasterDefinitionV2Rows({ id: entry.masterId });
    const [columns, [entryWithReferences]] = await Promise.all([
      this.queryMasterColumnDefinitionsV2ByMasterIds([entry.masterId]),
      this.attachReferencesToMasterData([entry]),
    ]);

    const definition = {
      ...definitionRow,
      columnDefinitions: columns,
      _count: {
        masterData: definitionRow.masterDataCount,
      },
    };
    const [enrichedDefinition] = await this.enrichMasterDefinitions([definition]);

    return {
      ...entryWithReferences,
      master: enrichedDefinition,
    };
  }

  /**
   * Update master data
   */
  async updateMasterDataV2(id: bigint, dto: any) {
    const existingEntry = await this.queryMasterDataEntryV2ById(id);

    if (!existingEntry) {
      throw new NotFoundException(`Master data entry with ID ${id} not found`);
    }

    const normalized = this.normalizeMasterDataEnvelope(dto, existingEntry.data || {});

    const rows = await this.prisma.$queryRawUnsafe<Array<MasterDataEntryV2Row>>(
      `
        UPDATE mdm_industrial_approvals."mdm_master_data"
        SET
          data = $1::jsonb,
          is_active = $2,
          updated_by = $3,
          updated_at = NOW()
        WHERE id = $4::bigint
        RETURNING
          id::text AS id,
          master_id AS "masterId",
          tenant_id AS "tenantId",
          data,
          is_active AS "isActive",
          created_by AS "createdBy",
          updated_by AS "updatedBy",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      JSON.stringify(normalized.data),
      normalized.isActive === undefined ? existingEntry.isActive : normalized.isActive,
      dto.updatedBy || null,
      String(id),
    );

    const [entry] = await this.attachReferencesToMasterData(rows);
    return entry;
  }

  /**
   * Delete master data
   */
  async deleteMasterDataV2(id: bigint) {
    await this.getMasterDataEntryV2(id); // Verify exists

    await this.prisma.$queryRawUnsafe(
      `
        DELETE FROM mdm_industrial_approvals."mdm_master_data"
        WHERE id = $1::bigint
      `,
      String(id),
    );

    return { success: true };
  }

  /**
   * Create a reference between master data entries
   */
  async createMasterDataReferenceV2(dto: any) {
    // Verify both entries exist
    await this.getMasterDataEntryV2(dto.fromDataId);
    await this.getMasterDataEntryV2(dto.toDataId);

    const rows = await this.prisma.$queryRawUnsafe<Array<MasterDataReferenceV2Row>>(
      `
        INSERT INTO mdm_industrial_approvals."mdm_master_data_references" (
          from_data_id,
          to_data_id,
          column_key,
          updated_at
        )
        VALUES ($1::bigint, $2::bigint, $3, NOW())
        RETURNING
          id::text AS id,
          from_data_id::text AS "fromDataId",
          to_data_id::text AS "toDataId",
          column_key AS "columnKey",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      String(dto.fromDataId),
      String(dto.toDataId),
      dto.columnKey,
    );

    const [reference] = await this.enrichMasterDataReferences(rows);
    return reference;
  }

  /**
   * Get references for a data entry
   */
  async getMasterDataReferencesV2(dataId: bigint) {
    return this.enrichMasterDataReferences(await this.queryMasterDataReferencesV2([dataId]));
  }

  /**
   * Delete a reference
   */
  async deleteMasterDataReferenceV2(referenceId: bigint) {
    const rows = await this.prisma.$queryRawUnsafe<Array<MasterDataReferenceV2Row>>(
      `
        SELECT
          id::text AS id,
          from_data_id::text AS "fromDataId",
          to_data_id::text AS "toDataId",
          column_key AS "columnKey",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM mdm_industrial_approvals."mdm_master_data_references"
        WHERE id = $1::bigint
        LIMIT 1
      `,
      String(referenceId),
    );
    const reference = rows[0];

    if (!reference) {
      throw new NotFoundException(`Reference with ID ${referenceId} not found`);
    }

    await this.prisma.$queryRawUnsafe(
      `
        DELETE FROM mdm_industrial_approvals."mdm_master_data_references"
        WHERE id = $1::bigint
      `,
      String(referenceId),
    );

    return { success: true };
  }

  /**
   * Bulk insert master data from CSV
   */
  async importMasterDataFromCsvV2(
    masterId: number,
    tenantId: number,
    csvData: Array<Record<string, any>>,
    createdBy: string,
  ) {
    const master = await this.getMasterDefinitionV2(masterId);
    const columns = await this.getMasterColumnDefinitionsV2(masterId);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    // Validate and insert each row
    for (let i = 0; i < csvData.length; i++) {
      try {
        const row = csvData[i];

        // Validate required fields
        for (const column of columns) {
          if (column.isRequired && !row[column.columnKey]) {
            throw new Error(`Required field "${column.columnLabel}" is missing`);
          }
        }

        // Create the data entry
        await this.createMasterDataV2({
          masterId,
          tenantId,
          data: row,
          createdBy,
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          error: error.message,
        });
      }
    }

    return results;
  }

  private async findRecordByIdOrThrow(definition: any, id: number) {
    const record = await this.findRecordById(definition, id);
    if (!record) {
      throw new BadRequestException(`Parent record ${id} not found`);
    }
    return record;
  }

  private async findRecordByCode(definition: any, code: string) {
    const query = `
      SELECT * FROM ${this.qualifiedTable(definition.schemaName, definition.tableName)}
      WHERE code = $1
      LIMIT 1;
    `;

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      query,
      this.normalizeBusinessCode(code),
    );
    return rows[0] || null;
  }

  private toDateOrNull(value?: string | null) {
    if (!value) {
      return null;
    }

    return new Date(value);
  }

  private normalizeCsvRow(row: Record<string, string>, rowNumber: number) {
    const normalized = Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key.trim().toLowerCase(),
        typeof value === 'string' ? value.trim() : value,
      ]),
    );

    let metadata: Record<string, any> = {};
    if (normalized.metadata) {
      try {
        metadata = JSON.parse(normalized.metadata);
      } catch {
        throw new BadRequestException(`Row ${rowNumber}: metadata must be valid JSON`);
      }
    }

    const payload: CreateMasterDataRecordDto = {
      code: normalized.code || normalized.record_code || normalized.name,
      name: normalized.name || normalized.label,
      description: normalized.description || undefined,
      parentId: undefined,
      validFrom: normalized.valid_from || normalized.validfrom || undefined,
      validTo: normalized.valid_to || normalized.validto || undefined,
      departmentId: normalized.department_id ? Number(normalized.department_id) : undefined,
      subDepartmentId: normalized.sub_department_id
        ? Number(normalized.sub_department_id)
        : undefined,
      sortOrder: normalized.sort_order ? Number(normalized.sort_order) : 0,
      metadata,
      isActive:
        normalized.is_active === undefined
          ? true
          : ['true', '1', 'y', 'yes'].includes(String(normalized.is_active).toLowerCase()),
    };

    if (!payload.code || !payload.name) {
      throw new BadRequestException(
        `Row ${rowNumber}: CSV must include code and name columns`,
      );
    }

    const parentCode = normalized.parent_code || normalized.parentcode || '';
    if (parentCode) {
      payload.metadata = {
        ...(payload.metadata || {}),
        __parentCode: parentCode,
      };
    }

    return {
      rowNumber,
      payload,
    };
  }

  private parseCsv(content: string) {
    const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      throw new BadRequestException('CSV must include a header row and at least one data row');
    }

    const headers = this.parseCsvLine(lines[0]);
    return lines.slice(1).map((line) => {
      const values = this.parseCsvLine(line);
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] ?? '';
      });

      return row;
    });
  }

  private parseCsvLine(line: string) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    values.push(current.trim());
    return values;
  }
}
