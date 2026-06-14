import { z } from 'zod';

export const MenuCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().nonnegative().default(0),
});
export type MenuCategory = z.infer<typeof MenuCategorySchema>;

export const MenuItemSchema = z.object({
  id: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().default(null),
  price: z.number().positive(),
  available: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type MenuItem = z.infer<typeof MenuItemSchema>;

export const CreateMenuCategorySchema = MenuCategorySchema.omit({ id: true });
export type CreateMenuCategoryDto = z.infer<typeof CreateMenuCategorySchema>;

export const UpdateMenuCategorySchema = CreateMenuCategorySchema.partial();
export type UpdateMenuCategoryDto = z.infer<typeof UpdateMenuCategorySchema>;

export const CreateMenuItemSchema = MenuItemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateMenuItemDto = z.infer<typeof CreateMenuItemSchema>;

export const UpdateMenuItemSchema = CreateMenuItemSchema.partial();
export type UpdateMenuItemDto = z.infer<typeof UpdateMenuItemSchema>;
