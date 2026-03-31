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

@Injectable()
export class MasterDataManagementService {
  constructor(private readonly prisma: PrismaService) {}

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
        isActive: dto.isActive ?? true,
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
        isActive: dto.isActive ?? true,
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
          is_active: dto.isActive ?? true,
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
          isActive: dto.isActive ?? true,
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
      dto.isActive ?? true,
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
      payload.isActive ?? true,
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
