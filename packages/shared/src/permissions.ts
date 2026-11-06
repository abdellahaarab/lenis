export const roles = ['owner', 'manager', 'sales', 'editor', 'viewer'] as const;
export type Role = (typeof roles)[number];
export const permissions = [
  'staff.manage', 'settings.manage', 'danger.manage', 'catalog.edit', 'catalog.publish',
  'prices.edit', 'crm.read', 'crm.edit', 'customers.erase', 'subscribers.read',
  'subscribers.export', 'analytics.read', 'analytics.limited', 'audit.read',
  'inventory.manage', 'orders.manage', 'customers.manage', 'contest.manage',
] as const;
export type Permission = (typeof permissions)[number];
export const permissionTable: Record<Role, readonly Permission[]> = {
  owner: permissions,
  manager: permissions.filter(p => p !== 'staff.manage' && p !== 'danger.manage'),
  sales: ['prices.edit', 'orders.manage', 'crm.read', 'crm.edit', 'subscribers.read', 'analytics.limited', 'contest.manage'],
  editor: ['catalog.edit', 'catalog.publish'],
  viewer: ['crm.read', 'analytics.read'],
};
export function can(role: Role, permission: Permission): boolean {
  return permissionTable[role].includes(permission);
}
