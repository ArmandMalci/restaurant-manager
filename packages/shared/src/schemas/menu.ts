import { z } from 'zod';

export const KitchenStationSchema = z.enum(['grill', 'cold', 'bar', 'pass']);
export type KitchenStation = z.infer<typeof KitchenStationSchema>;

export const ModifierSelectionTypeSchema = z.enum(['single', 'multi']);
export type ModifierSelectionType = z.infer<typeof ModifierSelectionTypeSchema>;

export const ModifierOptionSchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  groupId: z.string().uuid(),
  name: z.string().min(1).max(100),
  priceDelta: z.number().default(0),
  sortOrder: z.number().int().nonnegative().default(0),
});
export type ModifierOption = z.infer<typeof ModifierOptionSchema>;

export const CreateModifierOptionSchema = ModifierOptionSchema.omit({
  id: true,
  restaurantId: true,
  groupId: true,
});

export const ModifierGroupSchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  name: z.string().min(1).max(100),
  selectionType: ModifierSelectionTypeSchema,
  required: z.boolean().default(false),
  options: z.array(ModifierOptionSchema).default([]),
});
export type ModifierGroup = z.infer<typeof ModifierGroupSchema>;

export const CreateModifierGroupSchema = z.object({
  name: z.string().min(1).max(100),
  selectionType: ModifierSelectionTypeSchema.default('single'),
  required: z.boolean().default(false),
  options: z.array(CreateModifierOptionSchema).default([]),
});
export type CreateModifierGroupDto = z.infer<typeof CreateModifierGroupSchema>;

export const UpdateModifierGroupSchema = CreateModifierGroupSchema.partial();
export type UpdateModifierGroupDto = z.infer<typeof UpdateModifierGroupSchema>;

export const MenuCategorySchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().nonnegative().default(0),
});
export type MenuCategory = z.infer<typeof MenuCategorySchema>;

export const MenuItemSchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().default(null),
  price: z.number().positive(),
  available: z.boolean().default(true),
  station: KitchenStationSchema.nullable().default(null),
  modifierGroupIds: z.array(z.string().uuid()).default([]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type MenuItem = z.infer<typeof MenuItemSchema>;

export const CreateMenuCategorySchema = MenuCategorySchema.omit({ id: true, restaurantId: true });
export type CreateMenuCategoryDto = z.infer<typeof CreateMenuCategorySchema>;

export const UpdateMenuCategorySchema = CreateMenuCategorySchema.partial();
export type UpdateMenuCategoryDto = z.infer<typeof UpdateMenuCategorySchema>;

export const CreateMenuItemSchema = MenuItemSchema.omit({
  id: true,
  restaurantId: true,
  createdAt: true,
  updatedAt: true,
  modifierGroupIds: true,
});
export type CreateMenuItemDto = z.infer<typeof CreateMenuItemSchema>;

export const UpdateMenuItemSchema = CreateMenuItemSchema.partial().extend({
  modifierGroupIds: z.array(z.string().uuid()).optional(),
});
export type UpdateMenuItemDto = z.infer<typeof UpdateMenuItemSchema>;
