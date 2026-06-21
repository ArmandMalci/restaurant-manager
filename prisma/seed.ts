import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcrypt";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear in FK-safe order
  await prisma.bill.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.inventoryUsage.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.table.deleteMany();
  await prisma.staff.deleteMany();
  console.log("✓ Cleared existing data");

  // ── Staff ────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("admin123", 12);

  const [admin, waiter1, waiter2, kitchen1, host1] = await Promise.all([
    prisma.staff.create({
      data: { name: "Admin Manager", email: "admin@restaurant.local", passwordHash, role: "manager", active: true },
    }),
    prisma.staff.create({
      data: { name: "Sophie Turner", email: "sophie@restaurant.local", passwordHash, role: "waiter", active: true },
    }),
    prisma.staff.create({
      data: { name: "Marco Rossi", email: "marco@restaurant.local", passwordHash, role: "waiter", active: true },
    }),
    prisma.staff.create({
      data: { name: "Chen Wei", email: "chen@restaurant.local", passwordHash, role: "kitchen", active: true },
    }),
    prisma.staff.create({
      data: { name: "Amara Diallo", email: "amara@restaurant.local", passwordHash, role: "host", active: true },
    }),
  ]);
  console.log("✓ Staff (5)");

  // ── Restaurant settings ──────────────────────────────────────────────────
  await prisma.restaurantSettings.upsert({
    where: { id: "default" },
    create: {
      name: "La Bella Tavola",
      description: "Modern Italian cuisine with a cozy atmosphere",
      phone: "+1 (555) 234-5678",
      email: "hello@labellatavolà.com",
      address: "42 Vine Street, Downtown",
      openingHours: "Mon–Fri 11:00–23:00, Sat–Sun 10:00–23:30",
    },
    update: {},
  });
  console.log("✓ Restaurant settings");

  // ── Tables ───────────────────────────────────────────────────────────────
  const tables = await Promise.all(
    [
      { number: 1, seats: 2, status: "available" as const },
      { number: 2, seats: 2, status: "available" as const },
      { number: 3, seats: 4, status: "occupied" as const },
      { number: 4, seats: 4, status: "reserved" as const },
      { number: 5, seats: 4, status: "available" as const },
      { number: 6, seats: 6, status: "occupied" as const },
      { number: 7, seats: 6, status: "available" as const },
      { number: 8, seats: 8, status: "available" as const },
      { number: 9, seats: 2, status: "available" as const },
      { number: 10, seats: 10, status: "reserved" as const },
    ].map((t) => prisma.table.create({ data: t }))
  );
  console.log("✓ Tables (10)");

  // ── Menu ─────────────────────────────────────────────────────────────────
  const [starters, pasta, mains, desserts, drinks] = await Promise.all([
    prisma.menuCategory.create({ data: { name: "Starters", sortOrder: 1 } }),
    prisma.menuCategory.create({ data: { name: "Pasta & Risotto", sortOrder: 2 } }),
    prisma.menuCategory.create({ data: { name: "Main Courses", sortOrder: 3 } }),
    prisma.menuCategory.create({ data: { name: "Desserts", sortOrder: 4 } }),
    prisma.menuCategory.create({ data: { name: "Drinks", sortOrder: 5 } }),
  ]);

  const menuItems = await Promise.all([
    // Starters
    prisma.menuItem.create({ data: { name: "Bruschetta al Pomodoro", description: "Toasted bread, tomatoes, garlic, basil", price: 9.5, categoryId: starters.id } }),
    prisma.menuItem.create({ data: { name: "Burrata & Prosciutto", description: "Creamy burrata, cured ham, rocket, olive oil", price: 14, categoryId: starters.id } }),
    prisma.menuItem.create({ data: { name: "Calamari Fritti", description: "Crispy fried squid, lemon aioli", price: 12, categoryId: starters.id } }),
    prisma.menuItem.create({ data: { name: "Zuppa del Giorno", description: "Chef's soup of the day", price: 8, categoryId: starters.id } }),
    // Pasta & Risotto
    prisma.menuItem.create({ data: { name: "Spaghetti Carbonara", description: "Egg, guanciale, Pecorino Romano, black pepper", price: 18, categoryId: pasta.id } }),
    prisma.menuItem.create({ data: { name: "Tagliatelle al Ragù", description: "Hand-rolled pasta, slow-cooked beef ragu", price: 19, categoryId: pasta.id } }),
    prisma.menuItem.create({ data: { name: "Penne all'Arrabbiata", description: "Spicy tomato sauce, garlic, chilli", price: 15, categoryId: pasta.id } }),
    prisma.menuItem.create({ data: { name: "Risotto ai Funghi", description: "Wild mushrooms, Parmigiano, truffle oil", price: 22, categoryId: pasta.id } }),
    // Mains
    prisma.menuItem.create({ data: { name: "Branzino al Forno", description: "Oven-roasted sea bass, capers, cherry tomatoes", price: 28, categoryId: mains.id } }),
    prisma.menuItem.create({ data: { name: "Pollo alla Milanese", description: "Breaded chicken breast, arugula salad, lemon", price: 24, categoryId: mains.id } }),
    prisma.menuItem.create({ data: { name: "Tagliata di Manzo", description: "Sliced ribeye, rocket, Parmigiano shavings", price: 34, categoryId: mains.id } }),
    prisma.menuItem.create({ data: { name: "Melanzane alla Parmigiana", description: "Layered aubergine, tomato, mozzarella (v)", price: 18, categoryId: mains.id } }),
    // Desserts
    prisma.menuItem.create({ data: { name: "Tiramisù", description: "Classic espresso-soaked ladyfingers, mascarpone", price: 9, categoryId: desserts.id } }),
    prisma.menuItem.create({ data: { name: "Panna Cotta", description: "Vanilla cream, seasonal berry coulis", price: 8, categoryId: desserts.id } }),
    prisma.menuItem.create({ data: { name: "Affogato al Caffè", description: "Vanilla gelato, double espresso shot", price: 7, categoryId: desserts.id } }),
    // Drinks
    prisma.menuItem.create({ data: { name: "Sparkling Water 750ml", description: "", price: 4, categoryId: drinks.id } }),
    prisma.menuItem.create({ data: { name: "House Red Wine (glass)", description: "Chianti Classico", price: 9, categoryId: drinks.id } }),
    prisma.menuItem.create({ data: { name: "House White Wine (glass)", description: "Pinot Grigio", price: 9, categoryId: drinks.id } }),
    prisma.menuItem.create({ data: { name: "Espresso", description: "", price: 3, categoryId: drinks.id } }),
    prisma.menuItem.create({ data: { name: "San Pellegrino Limonata", description: "330ml can", price: 4, categoryId: drinks.id } }),
  ]);
  const [bruschetta, burrata, carbonara, tagliatelle, risotto, branzino, pollo, tagliata, tiramisu, pannaCotta, redWine, water, espresso] =
    [menuItems[0], menuItems[1], menuItems[4], menuItems[5], menuItems[7], menuItems[8], menuItems[9], menuItems[10], menuItems[12], menuItems[13], menuItems[16], menuItems[15], menuItems[18]];
  console.log("✓ Menu (5 categories, 20 items)");

  // ── Inventory ────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.inventoryItem.create({ data: { name: "00 Flour", unit: "kg", quantity: 25, minStock: 5 } }),
    prisma.inventoryItem.create({ data: { name: "Eggs", unit: "unit", quantity: 120, minStock: 24 } }),
    prisma.inventoryItem.create({ data: { name: "Guanciale", unit: "kg", quantity: 4.5, minStock: 1 } }),
    prisma.inventoryItem.create({ data: { name: "Pecorino Romano", unit: "kg", quantity: 3, minStock: 0.5 } }),
    prisma.inventoryItem.create({ data: { name: "Beef (ribeye)", unit: "kg", quantity: 8, minStock: 2 } }),
    prisma.inventoryItem.create({ data: { name: "Sea Bass (whole)", unit: "kg", quantity: 6, minStock: 2 } }),
    prisma.inventoryItem.create({ data: { name: "Mascarpone", unit: "kg", quantity: 5, minStock: 1 } }),
    prisma.inventoryItem.create({ data: { name: "San Marzano Tomatoes (tin)", unit: "unit", quantity: 48, minStock: 12 } }),
    prisma.inventoryItem.create({ data: { name: "Parmigiano Reggiano", unit: "kg", quantity: 4, minStock: 1 } }),
    prisma.inventoryItem.create({ data: { name: "Truffle Oil", unit: "litre", quantity: 0.8, minStock: 0.2 } }),
  ]);
  console.log("✓ Inventory (10 items)");

  // ── Reservations ─────────────────────────────────────────────────────────
  const today = new Date();
  const d = (offsetDays: number, hours: number, minutes = 0) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offsetDays);
    dt.setHours(hours, minutes, 0, 0);
    return dt;
  };

  await Promise.all([
    prisma.reservation.create({ data: { tableId: tables[3].id, guestName: "Julia & Marc Fontaine", guestEmail: "julia.fontaine@email.com", guestPhone: "+33 6 12 34 56 78", partySize: 4, date: d(0, 19, 30), notes: "Anniversary dinner — please arrange flowers" } }),
    prisma.reservation.create({ data: { tableId: tables[9].id, guestName: "Becker Corporate Lunch", guestEmail: "events@beckergroup.com", partySize: 8, date: d(0, 12, 30), notes: "Business lunch, separate bills" } }),
    prisma.reservation.create({ data: { tableId: tables[0].id, guestName: "Naomi Sato", guestPhone: "+81 90 1234 5678", partySize: 2, date: d(1, 20, 0) } }),
    prisma.reservation.create({ data: { tableId: tables[4].id, guestName: "The Okafor Family", guestEmail: "okafor@home.net", partySize: 4, date: d(1, 18, 0), notes: "One child — high chair needed" } }),
    prisma.reservation.create({ data: { tableId: tables[6].id, guestName: "Lena & Friends (6)", guestEmail: "lena.m@outlook.com", partySize: 6, date: d(2, 20, 30) } }),
    prisma.reservation.create({ data: { tableId: tables[1].id, guestName: "David Chen", partySize: 2, date: d(3, 19, 0) } }),
  ]);
  console.log("✓ Reservations (6)");

  // ── Orders (with items, some with bills) ────────────────────────────────
  // Table 3 (occupied) — order in_progress
  const order1 = await prisma.order.create({
    data: {
      tableId: tables[2].id,
      staffId: waiter1.id,
      status: "in_progress",
      items: {
        create: [
          { menuItemId: bruschetta.id, quantity: 2, status: "ready" },
          { menuItemId: carbonara.id, quantity: 1, status: "in_progress" },
          { menuItemId: tagliatelle.id, quantity: 1, status: "in_progress" },
          { menuItemId: redWine.id, quantity: 2, status: "ready" },
          { menuItemId: water.id, quantity: 1, status: "ready" },
        ],
      },
    },
  });

  // Table 6 (occupied) — order sent to kitchen
  const order2 = await prisma.order.create({
    data: {
      tableId: tables[5].id,
      staffId: waiter2.id,
      status: "sent",
      items: {
        create: [
          { menuItemId: burrata.id, quantity: 1, status: "in_progress" },
          { menuItemId: branzino.id, quantity: 2, status: "pending" },
          { menuItemId: risotto.id, quantity: 1, status: "pending" },
          { menuItemId: redWine.id, quantity: 3, status: "ready" },
        ],
      },
    },
  });

  // Table 8 — already served, bill paid
  const order3 = await prisma.order.create({
    data: {
      tableId: tables[7].id,
      staffId: waiter1.id,
      status: "served",
      items: {
        create: [
          { menuItemId: carbonara.id, quantity: 2, status: "ready" },
          { menuItemId: pollo.id, quantity: 1, status: "ready" },
          { menuItemId: tiramisu.id, quantity: 2, status: "ready" },
          { menuItemId: espresso.id, quantity: 2, status: "ready" },
        ],
      },
    },
  });
  // subtotal: 18*2 + 24 + 9*2 + 3*2 = 36 + 24 + 18 + 6 = 84
  await prisma.bill.create({
    data: {
      orderId: order3.id,
      subtotal: 84,
      discountPct: 0,
      tax: 8.4,
      total: 92.4,
      paid: true,
      paidAt: new Date(),
    },
  });

  // Draft order — Table 9
  await prisma.order.create({
    data: {
      tableId: tables[8].id,
      staffId: waiter2.id,
      status: "draft",
      items: {
        create: [
          { menuItemId: tagliata.id, quantity: 1, status: "pending" },
          { menuItemId: redWine.id, quantity: 1, status: "pending" },
        ],
      },
    },
  });

  console.log("✓ Orders (4) with items and 1 paid bill");

  // ── Shifts ───────────────────────────────────────────────────────────────
  const shiftStart = (offsetDays: number, hours: number) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offsetDays);
    dt.setHours(hours, 0, 0, 0);
    return dt;
  };

  await Promise.all([
    // Today's shifts
    prisma.shift.create({ data: { staffId: waiter1.id, startTime: shiftStart(0, 11), endTime: shiftStart(0, 19) } }),
    prisma.shift.create({ data: { staffId: waiter2.id, startTime: shiftStart(0, 15), endTime: shiftStart(0, 23) } }),
    prisma.shift.create({ data: { staffId: kitchen1.id, startTime: shiftStart(0, 10), endTime: shiftStart(0, 22) } }),
    prisma.shift.create({ data: { staffId: host1.id, startTime: shiftStart(0, 16), endTime: shiftStart(0, 23) } }),
    // Tomorrow
    prisma.shift.create({ data: { staffId: waiter1.id, startTime: shiftStart(1, 15), endTime: shiftStart(1, 23) } }),
    prisma.shift.create({ data: { staffId: waiter2.id, startTime: shiftStart(1, 11), endTime: shiftStart(1, 19) } }),
    prisma.shift.create({ data: { staffId: kitchen1.id, startTime: shiftStart(1, 10), endTime: shiftStart(1, 22) } }),
  ]);
  console.log("✓ Shifts (7)");

  console.log("\nSeed complete. Login: admin@restaurant.local / admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
