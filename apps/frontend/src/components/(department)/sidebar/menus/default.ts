import { DepartmentSidebarMenuItem } from './types';

export const getDefaultDepartmentMenus = (): DepartmentSidebarMenuItem[] => [
  { name: 'Dashboard', iconKey: 'dashboard', href: '/department/fb-dashboard' },
  { name: 'Incentive Dashboard', iconKey: 'dashboard', href: '/department/incentive' },
  { name: 'Incentive Report', iconKey: 'reports', href: '/department/incentive/report' },
  { name: 'Workflow Inbox', iconKey: 'services', href: '/department/workflow' },
  { name: 'Services', iconKey: 'services', href: '/department/services' },
  { name: 'Inspections', iconKey: 'inspections', href: '/department/inspection' },
  { name: 'Reports', iconKey: 'reports', href: '/department/reports' },
  { name: 'User Management', iconKey: 'users', href: '/department/users' },
];

