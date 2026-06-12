import { describe, it, expect } from 'vitest'
import {
  TableSchema,
  TableStatusSchema,
  MenuItemSchema,
  OrderSchema,
  OrderStatusSchema,
  StaffSchema,
  StaffRoleSchema,
  ReservationSchema,
  ShiftSchema,
  InventoryItemSchema,
  BillSchema,
  LoginSchema,
  WS_EVENTS,
  ORDER_STATUS,
  STAFF_ROLES,
} from '../index'

const uuid = () => '123e4567-e89b-12d3-a456-426614174000'
const now = new Date()

describe('TableSchema', () => {
  it('parses a valid table', () => {
    const result = TableSchema.safeParse({
      id: uuid(), number: 1, seats: 4,
      status: 'available', createdAt: now, updatedAt: now,
    })
    expect(result.success).toBe(true)
  })
  it('rejects invalid status', () => {
    expect(TableStatusSchema.safeParse('busy').success).toBe(false)
  })
})

describe('MenuItemSchema', () => {
  it('parses a valid menu item', () => {
    const result = MenuItemSchema.safeParse({
      id: uuid(), categoryId: uuid(),
      name: 'Burger', description: 'Tasty',
      price: 12.99, photoUrl: null, available: true,
      createdAt: now, updatedAt: now,
    })
    expect(result.success).toBe(true)
  })
  it('rejects negative price', () => {
    expect(MenuItemSchema.shape.price.safeParse(-1).success).toBe(false)
  })
})

describe('OrderSchema', () => {
  it('parses a valid order', () => {
    const result = OrderSchema.safeParse({
      id: uuid(), tableId: uuid(), staffId: uuid(),
      status: 'draft',
      items: [{
        id: uuid(), orderId: uuid(), menuItemId: uuid(),
        quantity: 2, modifiers: ['no onions'], status: 'pending', notes: null,
      }],
      createdAt: now, updatedAt: now,
    })
    expect(result.success).toBe(true)
  })
  it('rejects unknown order status', () => {
    expect(OrderStatusSchema.safeParse('cooking').success).toBe(false)
  })
})

describe('StaffSchema', () => {
  it('parses valid staff', () => {
    const result = StaffSchema.safeParse({
      id: uuid(), name: 'Alice', email: 'alice@rest.com',
      role: 'manager', active: true,
      createdAt: now, updatedAt: now,
    })
    expect(result.success).toBe(true)
  })
  it('rejects invalid email', () => {
    expect(StaffSchema.shape.email.safeParse('not-email').success).toBe(false)
  })
  it('rejects unknown role', () => {
    expect(StaffRoleSchema.safeParse('owner').success).toBe(false)
  })
})

describe('ReservationSchema', () => {
  it('parses a valid reservation', () => {
    const result = ReservationSchema.safeParse({
      id: uuid(), tableId: null,
      guestName: 'Bob', guestPhone: '+1234', guestEmail: null,
      partySize: 3, date: '2026-07-01', time: '19:30',
      notes: null, createdAt: now, updatedAt: now,
    })
    expect(result.success).toBe(true)
  })
  it('rejects malformed date', () => {
    expect(ReservationSchema.shape.date.safeParse('July 1').success).toBe(false)
  })
})

describe('LoginSchema', () => {
  it('rejects invalid email', () => {
    expect(LoginSchema.safeParse({ email: 'bad', password: 'pass' }).success).toBe(false)
  })
  it('rejects missing password', () => {
    expect(LoginSchema.safeParse({ email: 'a@b.com' }).success).toBe(false)
  })
})

describe('Constants', () => {
  it('WS_EVENTS are defined', () => {
    expect(WS_EVENTS.KDS_ORDER_NEW).toBe('kds:order:new')
    expect(WS_EVENTS.POS_TABLE_UPDATED).toBe('pos:table:updated')
  })
  it('ORDER_STATUS values are complete', () => {
    expect(ORDER_STATUS).toContain('draft')
    expect(ORDER_STATUS).toContain('served')
  })
  it('STAFF_ROLES are defined', () => {
    expect(STAFF_ROLES).toContain('manager')
    expect(STAFF_ROLES).toContain('kitchen')
  })
})
