import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server-auth";
import { getDatabase } from "@/db/client";
import {
  financeTransactions,
  financeCategories,
  financeBudgets,
  financeGoals,
  financeDebts,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/sync
 * Pulls all user financial entities from Neon PostgreSQL.
 */
export async function GET() {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDatabase();

    const [transactions, categories, budgets, goals, debts] = await Promise.all([
      db
        .select()
        .from(financeTransactions)
        .where(eq(financeTransactions.ownerId, user.id))
        .orderBy(desc(financeTransactions.occurredAt)),
      db
        .select()
        .from(financeCategories)
        .where(eq(financeCategories.ownerId, user.id)),
      db
        .select()
        .from(financeBudgets)
        .where(eq(financeBudgets.ownerId, user.id)),
      db
        .select()
        .from(financeGoals)
        .where(eq(financeGoals.ownerId, user.id)),
      db
        .select()
        .from(financeDebts)
        .where(eq(financeDebts.ownerId, user.id)),
    ]);

    // Format transactions to match client store format if needed
    const formattedTransactions = transactions.map((tx) => ({
      id: tx.id,
      type: tx.transactionType,
      amount: Number(tx.amount),
      description: tx.description,
      date: tx.date || (tx.occurredAt ? tx.occurredAt.toISOString().split("T")[0] : ""),
      categoryId: tx.categoryId || "uncategorized",
      note: tx.note || undefined,
      tags: tx.tags as string[] | undefined,
      transferKind: tx.transferKind as any,
      linkedInvestmentOrderId: tx.linkedInvestmentOrderId || undefined,
    }));

    const formattedCategories = categories.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      icon: c.icon,
      color: c.color,
      isDefault: c.isDefault,
    }));

    const formattedBudgets = budgets.map((b) => ({
      id: b.id,
      categoryId: b.categoryId,
      amount: Number(b.amount),
      month: b.month,
      year: b.year,
      allowRollover: b.allowRollover,
    }));

    const formattedGoals = goals.map((g) => ({
      id: g.id,
      name: g.name,
      targetAmount: Number(g.targetAmount),
      savedAmount: Number(g.savedAmount),
      targetDate: g.targetDate,
      description: g.description || undefined,
      icon: g.icon,
      color: g.color,
    }));

    const formattedDebts = debts.map((d) => ({
      id: d.id,
      person: d.person,
      type: d.type,
      originalAmount: Number(d.originalAmount),
      remainingAmount: Number(d.remainingAmount),
      dueDate: d.dueDate || undefined,
      note: d.note || undefined,
      status: d.status,
      payments: (d.payments as any[]) || [],
    }));

    return NextResponse.json({
      transactions: formattedTransactions,
      categories: formattedCategories,
      budgets: formattedBudgets,
      goals: formattedGoals,
      debts: formattedDebts,
      syncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch data" }, { status: 500 });
  }
}

/**
 * POST /api/sync
 * Two-way sync: receives latest client items and upserts them into Neon PostgreSQL.
 */
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { transactions, categories, budgets, goals, debts } = body;
    const db = getDatabase();

    const isValidUUID = (id: any) =>
      typeof id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // 1. Categories
    if (Array.isArray(categories)) {
      for (const cat of categories) {
        if (!cat.name) continue;
        const catId = cat.id || crypto.randomUUID();
        const catType = (cat.type || "EXPENSE").toUpperCase();
        await db
          .insert(financeCategories)
          .values({
            id: catId,
            ownerId: user.id,
            name: cat.name,
            type: catType,
            icon: cat.icon || "Folder",
            color: cat.color || "#7c3aed",
            isDefault: !!cat.isDefault,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: financeCategories.id,
            set: {
              name: cat.name,
              type: catType,
              icon: cat.icon || "Folder",
              color: cat.color || "#7c3aed",
              isDefault: !!cat.isDefault,
              updatedAt: new Date(),
            },
          });
      }
    }

    // 2. Transactions
    if (Array.isArray(transactions)) {
      for (const tx of transactions) {
        const amountNum = Math.abs(Number(tx.amount));
        if (!amountNum || isNaN(amountNum) || amountNum <= 0) continue;
        const txType = (tx.type || tx.transactionType || "EXPENSE").toUpperCase();
        const occurredAt = new Date(
          tx.date && String(tx.date).length <= 10 ? `${tx.date}T12:00:00Z` : tx.date || new Date()
        );
        const txId = isValidUUID(tx.id) ? tx.id : crypto.randomUUID();

        await db
          .insert(financeTransactions)
          .values({
            id: txId,
            ownerId: user.id,
            transactionType: txType,
            amount: String(amountNum),
            currency: "THB",
            description: tx.description || "รายการ",
            occurredAt,
            categoryId: tx.categoryId || "uncategorized",
            note: tx.note || null,
            tags: tx.tags || null,
            transferKind: tx.transferKind || null,
            linkedInvestmentOrderId: tx.linkedInvestmentOrderId || null,
            date: tx.date || new Date().toISOString().split("T")[0],
            source: "neon-sync",
            sourceMessageId: "sync",
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: financeTransactions.id,
            set: {
              transactionType: txType,
              amount: String(amountNum),
              description: tx.description || "รายการ",
              occurredAt,
              categoryId: tx.categoryId || "uncategorized",
              note: tx.note || null,
              tags: tx.tags || null,
              transferKind: tx.transferKind || null,
              linkedInvestmentOrderId: tx.linkedInvestmentOrderId || null,
              date: tx.date || new Date().toISOString().split("T")[0],
              updatedAt: new Date(),
            },
          });
      }
    }

    // 3. Budgets
    if (Array.isArray(budgets)) {
      for (const b of budgets) {
        if (!b.categoryId || !b.amount || !b.month || !b.year) continue;
        const bId = b.id || crypto.randomUUID();
        await db
          .insert(financeBudgets)
          .values({
            id: bId,
            ownerId: user.id,
            categoryId: b.categoryId,
            amount: String(b.amount),
            month: b.month,
            year: b.year,
            allowRollover: !!b.allowRollover,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: financeBudgets.id,
            set: {
              amount: String(b.amount),
              allowRollover: !!b.allowRollover,
              updatedAt: new Date(),
            },
          });
      }
    }

    // 4. Goals
    if (Array.isArray(goals)) {
      for (const g of goals) {
        if (!g.name || !g.targetAmount) continue;
        const gId = g.id || crypto.randomUUID();
        await db
          .insert(financeGoals)
          .values({
            id: gId,
            ownerId: user.id,
            name: g.name,
            targetAmount: String(g.targetAmount),
            savedAmount: String(g.savedAmount || 0),
            targetDate: g.targetDate || new Date().toISOString().split("T")[0],
            description: g.description || null,
            icon: g.icon || "Target",
            color: g.color || "#10b981",
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: financeGoals.id,
            set: {
              name: g.name,
              targetAmount: String(g.targetAmount),
              savedAmount: String(g.savedAmount || 0),
              targetDate: g.targetDate || new Date().toISOString().split("T")[0],
              description: g.description || null,
              icon: g.icon || "Target",
              color: g.color || "#10b981",
              updatedAt: new Date(),
            },
          });
      }
    }

    // 5. Debts
    if (Array.isArray(debts)) {
      for (const d of debts) {
        if (!d.person || !d.originalAmount) continue;
        const dId = d.id || crypto.randomUUID();
        await db
          .insert(financeDebts)
          .values({
            id: dId,
            ownerId: user.id,
            person: d.person,
            type: d.type || "I_OWE",
            originalAmount: String(d.originalAmount),
            remainingAmount: String(d.remainingAmount || d.originalAmount),
            dueDate: d.dueDate || null,
            note: d.note || null,
            status: d.status || "ACTIVE",
            payments: d.payments || [],
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: financeDebts.id,
            set: {
              person: d.person,
              type: d.type || "I_OWE",
              originalAmount: String(d.originalAmount),
              remainingAmount: String(d.remainingAmount || d.originalAmount),
              dueDate: d.dueDate || null,
              note: d.note || null,
              status: d.status || "ACTIVE",
              payments: d.payments || [],
              updatedAt: new Date(),
            },
          });
      }
    }

    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Sync failed" }, { status: 500 });
  }
}
