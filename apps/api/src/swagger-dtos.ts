/**
 * Swagger response DTO classes for all entity GET responses.
 *
 * These use plain @ApiProperty decorators instead of createZodDto() to avoid
 * the nestjs-zod v5 + Zod v4 OpenAPI 3.1 syntax incompatibility (nullable via
 * anyOf, exclusiveMinimum as number) that Orval rejects when validating the
 * generated spec against OpenAPI 3.0.
 *
 * These classes are used ONLY for @ApiResponse() decorators — they are never
 * used at runtime for validation.
 */

import { ApiProperty } from '@nestjs/swagger';

// ── Menu ──────────────────────────────────────────────────────────────────────

export class MenuCategoryDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public name!: string;
  @ApiProperty() public sortOrder!: number;
}

export class MenuItemDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public categoryId!: string;
  @ApiProperty() public name!: string;
  @ApiProperty({ type: String, nullable: true, required: false }) public description!:
    | string
    | null;
  @ApiProperty() public price!: number;
  @ApiProperty() public available!: boolean;
  @ApiProperty() public createdAt!: string;
  @ApiProperty() public updatedAt!: string;
}

// ── Tables ────────────────────────────────────────────────────────────────────

export class TableDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public number!: number;
  @ApiProperty() public seats!: number;
  @ApiProperty() public status!: string;
  @ApiProperty() public createdAt!: string;
  @ApiProperty() public updatedAt!: string;
}

// ── Orders ────────────────────────────────────────────────────────────────────

export class OrderItemDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public orderId!: string;
  @ApiProperty() public menuItemId!: string;
  @ApiProperty() public quantity!: number;
  @ApiProperty() public status!: string;
  @ApiProperty({ type: String, nullable: true, required: false }) public notes!: string | null;
}

export class OrderDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public tableId!: string;
  @ApiProperty() public staffId!: string;
  @ApiProperty() public status!: string;
  @ApiProperty({ type: String, nullable: true, required: false }) public notes!: string | null;
  @ApiProperty({ type: [OrderItemDto] }) public items!: OrderItemDto[];
  @ApiProperty() public createdAt!: string;
  @ApiProperty() public updatedAt!: string;
}

// ── Staff ─────────────────────────────────────────────────────────────────────

export class StaffDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public name!: string;
  @ApiProperty() public email!: string;
  @ApiProperty() public role!: string;
  @ApiProperty() public active!: boolean;
  @ApiProperty() public createdAt!: string;
  @ApiProperty() public updatedAt!: string;
}

// ── Shifts ────────────────────────────────────────────────────────────────────

export class ShiftDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public staffId!: string;
  @ApiProperty() public startTime!: string;
  @ApiProperty({ type: String, nullable: true, required: false }) public endTime!: string | null;
  @ApiProperty() public createdAt!: string;
}

// ── Reservations ──────────────────────────────────────────────────────────────

export class ReservationDto {
  @ApiProperty() public id!: string;
  @ApiProperty({ type: String, nullable: true, required: false }) public tableId!: string | null;
  @ApiProperty() public guestName!: string;
  @ApiProperty({ type: String, nullable: true, required: false }) public guestPhone!: string | null;
  @ApiProperty({ type: String, nullable: true, required: false }) public guestEmail!: string | null;
  @ApiProperty() public partySize!: number;
  @ApiProperty() public date!: string;
  @ApiProperty({ type: String, nullable: true, required: false }) public notes!: string | null;
  @ApiProperty() public createdAt!: string;
  @ApiProperty() public updatedAt!: string;
}

// ── Billing ───────────────────────────────────────────────────────────────────

export class BillDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public orderId!: string;
  @ApiProperty() public subtotal!: number;
  @ApiProperty() public discountPct!: number;
  @ApiProperty() public tax!: number;
  @ApiProperty() public total!: number;
  @ApiProperty() public paid!: boolean;
  @ApiProperty({ type: String, nullable: true, required: false }) public paidAt!: string | null;
  @ApiProperty() public createdAt!: string;
  @ApiProperty() public updatedAt!: string;
}

// ── Inventory ─────────────────────────────────────────────────────────────────

// InventoryService returns { ...item, lowStock: boolean } — includes computed field
export class InventoryItemWithStatusDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public name!: string;
  @ApiProperty() public unit!: string;
  @ApiProperty() public quantity!: number;
  @ApiProperty() public minStock!: number;
  @ApiProperty() public createdAt!: string;
  @ApiProperty() public updatedAt!: string;
  @ApiProperty() public lowStock!: boolean;
}

// ── Settings ──────────────────────────────────────────────────────────────────

export class RestaurantSettingsDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public name!: string;
  @ApiProperty({ type: String, nullable: true, required: false }) public description!:
    | string
    | null;
  @ApiProperty({ type: String, nullable: true, required: false }) public phone!: string | null;
  @ApiProperty({ type: String, nullable: true, required: false }) public email!: string | null;
  @ApiProperty({ type: String, nullable: true, required: false }) public address!: string | null;
  @ApiProperty({ type: String, nullable: true, required: false }) public openingHours!:
    | string
    | null;
  @ApiProperty() public updatedAt!: string;
}

// ── Reports ───────────────────────────────────────────────────────────────────

export class TopItemDto {
  @ApiProperty() public menuItemId!: string;
  @ApiProperty() public name!: string;
  @ApiProperty() public totalQuantity!: number;
}

export class ReportSummaryDto {
  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  public ordersByStatus!: Record<string, number>;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  public tablesByStatus!: Record<string, number>;

  @ApiProperty() public reservationsToday!: number;

  @ApiProperty({ type: [TopItemDto] }) public topItems!: TopItemDto[];
}
