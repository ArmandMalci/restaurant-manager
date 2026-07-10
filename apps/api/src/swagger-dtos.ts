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

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @ApiProperty({ enum: ['grill', 'cold', 'bar', 'pass'], nullable: true, required: false })
  public station!: string | null;
  @ApiProperty({ type: [String] }) public modifierGroupIds!: string[];
  @ApiProperty() public createdAt!: string;
  @ApiProperty() public updatedAt!: string;
}

export class ModifierOptionDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public groupId!: string;
  @ApiProperty() public name!: string;
  @ApiProperty() public priceDelta!: number;
  @ApiProperty() public sortOrder!: number;
}

export class ModifierGroupDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public name!: string;
  @ApiProperty() public selectionType!: string;
  @ApiProperty() public required!: boolean;
  @ApiProperty({ type: [ModifierOptionDto] }) public options!: ModifierOptionDto[];
}

// ── Tables ────────────────────────────────────────────────────────────────────

export class TableDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public number!: number;
  @ApiProperty() public seats!: number;
  @ApiProperty() public status!: string;
  @ApiProperty({ type: Number, nullable: true }) public posX!: number | null;
  @ApiProperty({ type: Number, nullable: true }) public posY!: number | null;
  @ApiProperty({ enum: ['square', 'round'] }) public shape!: string;
  @ApiProperty() public createdAt!: string;
  @ApiProperty() public updatedAt!: string;
}

// ── Orders ────────────────────────────────────────────────────────────────────

export class OrderItemModifierDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public orderItemId!: string;
  @ApiProperty() public modifierOptionId!: string;
  @ApiProperty() public name!: string;
  @ApiProperty() public priceDelta!: number;
}

export class OrderItemDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public orderId!: string;
  @ApiProperty() public menuItemId!: string;
  @ApiProperty() public quantity!: number;
  @ApiProperty() public unitPrice!: number;
  @ApiProperty() public status!: string;
  @ApiProperty({ type: String, nullable: true, required: false }) public notes!: string | null;
  @ApiProperty({ type: [OrderItemModifierDto] }) public modifiers!: OrderItemModifierDto[];
}

export class OrderDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public tableId!: string;
  @ApiProperty() public staffId!: string;
  @ApiProperty() public status!: string;
  @ApiProperty({ type: String, nullable: true, required: false }) public notes!: string | null;
  @ApiProperty({ type: [OrderItemDto] }) public items!: OrderItemDto[];
  // Present only where the query includes it (currently: GET /orders list) — used to
  // derive settled-ness (bill.paid) so the checkout queue can filter without a status enum.
  @ApiPropertyOptional({ type: () => BillDto, nullable: true })
  public bill?: BillDto | null;
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

export class PaymentDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public billId!: string;
  @ApiProperty() public amount!: number;
  @ApiProperty() public method!: string;
  @ApiProperty() public createdAt!: string;
}

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
  @ApiProperty({ type: [PaymentDto] }) public payments!: PaymentDto[];
  @ApiProperty() public amountPaid!: number;
  @ApiProperty() public remaining!: number;
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

// ── Service ───────────────────────────────────────────────────────────────────

export class ServicePulseKitchenDto {
  @ApiProperty() public ticketCount!: number;
  @ApiProperty({ type: Number, nullable: true }) public oldestMin!: number | null;
}
export class ServicePulseDto {
  @ApiProperty() public coversSeated!: number;
  @ApiProperty() public capacity!: number;
  @ApiProperty() public tablesOccupied!: number;
  @ApiProperty() public tablesTotal!: number;
  @ApiProperty({ type: Number, nullable: true }) public avgTurnMin!: number | null;
  @ApiProperty({ type: ServicePulseKitchenDto }) public kitchen!: ServicePulseKitchenDto;
}
export class ServiceAttentionRefDto {
  @ApiProperty() public kind!: string;
  @ApiProperty() public id!: string;
}
export class ServiceAttentionDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public type!: string;
  @ApiProperty() public tone!: string;
  @ApiProperty() public title!: string;
  @ApiProperty() public subtitle!: string;
  @ApiProperty() public ageMin!: number;
  @ApiProperty({ type: ServiceAttentionRefDto }) public ref!: ServiceAttentionRefDto;
}
export class ServiceFloorTableDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public number!: number;
  @ApiProperty() public status!: string;
  @ApiProperty({ type: Number, nullable: true }) public ageMin!: number | null;
}
export class ServiceSnapshotDto {
  @ApiProperty({ type: ServicePulseDto }) public pulse!: ServicePulseDto;
  @ApiProperty({ type: [ServiceAttentionDto] }) public attention!: ServiceAttentionDto[];
  @ApiProperty({ type: [ServiceFloorTableDto] }) public floor!: ServiceFloorTableDto[];
}

// ── KDS ───────────────────────────────────────────────────────────────────────

export class KdsTicketItemDto {
  @ApiProperty() public id!: string;
  @ApiProperty() public name!: string;
  @ApiProperty() public quantity!: number;
  @ApiProperty({ enum: ['grill', 'cold', 'bar', 'pass'], nullable: true }) public station!:
    | string
    | null;
  @ApiProperty() public status!: string;
  @ApiProperty({ type: [String] }) public modifiers!: string[];
}
export class KdsTicketDto {
  @ApiProperty() public orderId!: string;
  @ApiProperty({ type: Number, nullable: true }) public tableNumber!: number | null;
  @ApiProperty({ type: String, nullable: true }) public firedAt!: string | null;
  @ApiProperty({ type: [KdsTicketItemDto] }) public items!: KdsTicketItemDto[];
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
