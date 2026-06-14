export const WS_EVENTS = {
  KDS_ORDER_NEW: 'kds:order:new',
  KDS_ITEM_READY: 'kds:item:ready',
  KDS_ORDER_READY: 'kds:order:ready',
  POS_TABLE_UPDATED: 'pos:table:updated',
  POS_ORDER_STATUS: 'pos:order:status',
} as const;

export const ORDER_STATUS = ['draft', 'sent', 'in-progress', 'ready', 'served'] as const;
export const ORDER_ITEM_STATUS = ['pending', 'in-progress', 'ready'] as const;
export const STAFF_ROLES = ['manager', 'waiter', 'kitchen', 'host'] as const;
export const TABLE_STATUS = ['available', 'occupied', 'reserved'] as const;
export const INVENTORY_UNITS = ['kg', 'litre', 'unit'] as const;

export const ROLE_HIERARCHY: Record<string, number> = {
  manager: 4,
  host: 3,
  waiter: 2,
  kitchen: 1,
};
