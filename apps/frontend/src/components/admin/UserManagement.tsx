
'use client';

import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import { Toolbar } from 'primereact/toolbar';
import { InputText } from 'primereact/inputtext';
import { ReusableDataTable, ReusableDataTableConfig, RowAction } from '@/components/DataTable';
import { useDataTableManager } from '@/hooks/useDataTableManager';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/useUsers';
import { User } from '@/types/user';

/** --------------------------
 * Local form state typing
 * -------------------------- */
type RoleName = 'admin' | 'user' | 'investor';

// Adjust these IDs to match your backend role IDs
const ROLE_ID_MAP: Record<RoleName, number> = {
  admin: 1,
  user: 2,
  investor: 3,
};

// Adjust to whatever your backend expects for userType
const DEFAULT_USER_TYPE: string = 'internal';

type FormData = {
  email: string;
  /** Display name in UI only; not sent unless your DTO has corresponding fields */
  name: string;
  roleName: RoleName;
  isActive: boolean;
  isEmailVerified: boolean; // UI boolean; will be converted to 0/1 for payload
};

export const UserManagement = () => {
  const { data: users = [], isLoading } = useUsers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const toastRef = useRef<Toast | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  // ✅ Keep IDs numeric to match hook typings
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState<FormData>({
    email: '',
    name: '',
    roleName: 'user',
    isActive: true,
    isEmailVerified: false,
  });

  const {
    data: tableData,
    selectedRows,
    handleSelectionChange,
    handleGlobalFilterChange,
    handleFiltersChange,
    clearFilters,
  } = useDataTableManager<User>(users);

  // derive a display name from available fields (fallback to email)
  const getUserName = (user: User) => {
    const anyUser = user as any;
    if (anyUser.name) return anyUser.name;
    if (anyUser.firstName || anyUser.lastName) {
      return `${anyUser.firstName || ''} ${anyUser.lastName || ''}`.trim();
    }
    return user.email;
  };

  const tableConfig: ReusableDataTableConfig<User> = {
    columns: [
      { field: 'id', header: 'ID', width: '5%', filterType: 'none' },
      { field: 'email', header: 'Email', width: '25%', filterType: 'text' },
      {
        field: 'name',
        header: 'Name',
        width: '20%',
        filterType: 'text',
        body: (row) => <span className="font-semibold">{getUserName(row)}</span>,
      },
      {
        field: 'role',
        header: 'Role',
        width: '15%',
        filterType: 'select',
        filterOptions: [
          { label: 'Admin', value: 'admin' },
          { label: 'User', value: 'user' },
          { label: 'Investor', value: 'investor' },
        ],
        body: (row) => {
          const role = (row as any).role;
          const roleName: string | undefined = typeof role === 'object' ? role?.name : role;
          const severity =
            roleName === 'admin' ? 'danger' : roleName === 'investor' ? 'info' : 'success';
          return <Tag value={roleName || 'N/A'} severity={severity as any} />;
        },
      },
      {
        field: 'isActive',
        header: 'Status',
        width: '15%',
        filterType: 'select',
        filterOptions: [
          { label: 'Active', value: true },
          { label: 'Inactive', value: false },
        ],
        body: (row) => (
          <Tag
            value={(row as any).isActive ? 'Active' : 'Inactive'}
            severity={(row as any).isActive ? 'success' : 'danger'}
          />
        ),
      },
      {
        field: 'createdAt',
        header: 'Created Date',
        width: '15%',
        filterType: 'date',
        body: (row) => new Date((row as any).createdAt).toLocaleDateString(),
      },
    ],
    dataKey: 'id',
    rows: 10,
    rowsPerPageOptions: [5, 10, 25, 50],
    globalFilterFields: ['email', 'name', 'role'],
    selectable: true,
    paginator: true,
    stripedRows: true,
    showGridlines: true,
  };

  const rowActions: RowAction<User>[] = [
    {
      icon: 'pi pi-pencil',
      label: 'Edit',
      severity: 'info',
      onClick: (user) => handleEdit(user),
      tooltip: 'Edit user',
    },
    {
      icon: 'pi pi-trash',
      label: 'Delete',
      severity: 'error',
      onClick: (user) => handleDelete(user),
      tooltip: 'Delete user',
    },
  ];

  /** --------------------------
   * Form handlers
   * -------------------------- */
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;

    if (name === 'roleName') {
      const rn = value as RoleName;
      setFormData({ ...formData, roleName: rn });
    } else if (name === 'isActive') {
      setFormData({ ...formData, isActive: checked });
    } else if (name === 'isEmailVerified') {
      setFormData({ ...formData, isEmailVerified: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  /**
   * ✅ Build the payload WITHOUT `name`, since your DTO doesn't include it.
   * You can later map `formData.name` to `firstName`/`lastName` if your User type exposes those.
   */
  const buildPayload = (
    fd: FormData
  ): Omit<User, 'id' | 'createdAt' | 'updatedAt'> => {
    const roleId = ROLE_ID_MAP[fd.roleName];

    return {
      email: fd.email,
      userType: DEFAULT_USER_TYPE,                 // string
      roleId,                                      // number
      roleName: fd.roleName,                       // string union (remove if backend expects only roleId)
      isActive: fd.isActive,                       // boolean
      isEmailVerified: fd.isEmailVerified ? 1 : 0, // number (0/1)
      lastLoginAt: '',                             // omit if server-managed
    } as Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = buildPayload(formData);

      if (editingId !== null) {
        await updateMutation.mutateAsync({
          id: editingId, // number
          data: payload,
        });
        toastRef.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'User updated successfully',
        });
      } else {
        await createMutation.mutateAsync(payload);
        toastRef.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'User created successfully',
        });
      }
      resetForm();
      setShowDialog(false);
    } catch (err: any) {
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: err?.response?.data?.message || 'Error saving user',
      });
    }
  };

  const handleEdit = (user: User) => {
    const role = (user as any).role;
    const roleName: RoleName =
      (typeof role === 'object' ? role?.name : role) || 'user';

    setFormData({
      email: user.email,
      name: getUserName(user), // UI only
      roleName,
      isActive: (user as any).isActive ?? true,
      isEmailVerified:
        !!(user as any).isEmailVerified && (user as any).isEmailVerified !== 0,
    });

    // 🔁 Convert string ID to number safely
    const numericId = Number(user.id);
    if (Number.isNaN(numericId)) {
      toastRef.current?.show({
        severity: 'warn',
        summary: 'Invalid ID',
        detail: 'The selected user has a non-numeric ID.',
      });
      setEditingId(null);
    } else {
      setEditingId(numericId);
    }

    setShowDialog(true);
  };

  const handleDelete = async (user: User) => {
    if (confirm(`Are you sure you want to delete ${getUserName(user)}?`)) {
      try {
        // 🔁 Convert string ID to number for delete
        const numericId = Number(user.id);
        if (Number.isNaN(numericId)) {
          toastRef.current?.show({
            severity: 'warn',
            summary: 'Invalid ID',
            detail: 'Cannot delete: user ID is not numeric.',
          });
          return;
        }

        await deleteMutation.mutateAsync(numericId);
        toastRef.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'User deleted successfully',
        });
      } catch (err: any) {
        toastRef.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Error deleting user',
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      roleName: 'user',
      isActive: true,
      isEmailVerified: false,
    });
    setEditingId(null);
  };

  /** --------------------------
   * Toolbar templates
   * -------------------------- */
  const leftToolbarTemplate = () => (
    <Button
      label="Add User"
      icon="pi pi-plus"
      severity="success"
      onClick={() => {
        resetForm();
        setShowDialog(true);
      }}
    />
  );

  const rightToolbarTemplate = () => (
    <Button
      label="Clear Filters"
      icon="pi pi-filter-slash"
      severity="secondary"
      outlined
      onClick={() => {
        clearFilters();
        handleGlobalFilterChange('');
        handleFiltersChange({});
      }}
    />
  );

  /** --------------------------
   * Render
   * -------------------------- */
  return (
    <div className="p-4">
      <Toast ref={toastRef} />

      <div className="mb-4">
        <h1 className="h2 mb-3">User Management</h1>
        <Toolbar left={leftToolbarTemplate} right={rightToolbarTemplate} className="mb-3" />
      </div>

      <Dialog
        visible={showDialog}
        onHide={() => setShowDialog(false)}
        header={editingId ? 'Edit User' : 'Add New User'}
        modal
        style={{ width: '50vw' }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email *
            </label>
            <InputText
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="user@example.com"
              className="w-100"
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="name" className="form-label">
              Name *
            </label>
            <InputText
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Full Name"
              className="w-100"
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="roleName" className="form-label">
              Role *
            </label>
            <select
              id="roleName"
              name="roleName"
              value={formData.roleName}
              onChange={handleInputChange}
              className="form-select"
              required
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="investor">Investor</option>
            </select>
          </div>

          <div className="mb-3">
            <div className="form-check">
              <input
                id="isActive"
                name="isActive"
                type="checkbox"
                className="form-check-input"
                checked={formData.isActive}
                onChange={handleInputChange}
              />
              <label className="form-check-label" htmlFor="isActive">
                Active
              </label>
            </div>
          </div>

          {/* Optional: Email Verified toggle */}
          <div className="mb-3">
            <div className="form-check">
              <input
                id="isEmailVerified"
                name="isEmailVerified"
                type="checkbox"
                className="form-check-input"
                checked={formData.isEmailVerified}
                onChange={handleInputChange}
              />
              <label className="form-check-label" htmlFor="isEmailVerified">
                Email Verified
              </label>
            </div>
          </div>

          <div className="d-flex gap-2">
            <Button
              label={editingId ? 'Update' : 'Create'}
              icon="pi pi-check"
              type="submit"
              loading={createMutation.isPending || updateMutation.isPending}
            />
            <Button
              label="Cancel"
              icon="pi pi-times"
              severity="secondary"
              onClick={() => setShowDialog(false)}
            />
          </div>
        </form>
      </Dialog>

      <ReusableDataTable<User>
        data={tableData}
        config={tableConfig}
        loading={isLoading}
        selectedRows={selectedRows}
        onSelectionChange={handleSelectionChange}
        onGlobalFilterChange={handleGlobalFilterChange}
        onFiltersChange={handleFiltersChange}
        rowActions={rowActions}
      />
    </div>
  );
};