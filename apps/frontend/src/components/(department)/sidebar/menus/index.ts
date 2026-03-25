import { getDefaultDepartmentMenus } from './default';
import { getRole7DepartmentMenus } from './role7';
import { getRole33DepartmentMenus } from './role33';
import { DepartmentSidebarMenuItem } from './types';

export const getDepartmentMenuByRole = (roleId?: number): DepartmentSidebarMenuItem[] => {
  if (roleId === 7) return getRole7DepartmentMenus();
  if (roleId === 33) return getRole33DepartmentMenus();
  return getDefaultDepartmentMenus();
};

export type { DepartmentSidebarMenuItem, DepartmentSidebarChildItem, DepartmentSidebarIconKey } from './types';

