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

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { transactions, categories, budgets, goals, debts } = body;
  const db = getDatabase();

  let importedTransactions = 0;
  let importedCategories = 0;
  let importedBudgets = 0;
  let importedGoals = 0;
  let importedDebts = 0;

  // 1. Categories
  if (Array.isArray(categories) && categories.length > 0) {
    for (const cat of categories) {
      if (!cat.id || !cat.name || !cat.type) continue;
      await db
        .insert(financeCategories)
        .values({
          id: cat.id,
          ownerId: user.id,
          name: cat.name,
          type: cat.type,
          icon: cat.icon || "Folder",
          color: cat.color || "#7c3aed",
          isDefault: !!cat.isDefault,
        })
        .onConflictDoNothing({ target: [financeCategories.ownerId, financeCategories.id] });
      importedCategories++;
    }
  }

  // 2. Transactions
  if (Array.isArray(transactions) && transactions.length > 0) {
    for (const tx of transactions) {
      if (!tx.amount || !tx.type || !tx.description) continue;
      const occurredAt = new Date(
        tx.date && tx.date.length <= 10 ? `${tx.date}T12:00:00Z` : tx.date || new Date()
      );
      await db
        .insert(financeTransactions)
        .values({
          id: tx.id || crypto.randomUUID(),
          ownerId: user.id,
          transactionType: tx.type,
          amount: String(tx.amount),
          currency: "THB",
          description: tx.description,
          occurredAt,
          categoryId: tx.categoryId || "uncategorized",
          note: tx.note || null,
          tags: tx.tags || null,
          transferKind: tx.transferKind || null,
          linkedInvestmentOrderId: tx.linkedInvestmentOrderId || null,
          date: tx.date || new Date().toISOString().split("T")[0],
          source: "import-local",
          sourceMessageId: "migration",
        })
        .onConflictDoNothing({ target: [financeTransactions.ownerId, financeTransactions.id] });
      importedTransactions++;
    }
  }

  // 3. Budgets
  if (Array.isArray(budgets) && budgets.length > 0) {
    for (const b of budgets) {
      if (!b.categoryId || !b.amount || !b.month || !b.year) continue;
      await db
        .insert(financeBudgets)
        .values({
          id: b.id || crypto.randomUUID(),
          ownerId: user.id,
          categoryId: b.categoryId,
          amount: String(b.amount),
          month: b.month,
          year: b.year,
          allowRollover: !!b.allowRollover,
        })
        .onConflictDoNothing({ target: [financeBudgets.ownerId, financeBudgets.id] });
      importedBudgets++;
    }
  }

  // 4. Goals
  if (Array.isArray(goals) && goals.length > 0) {
    for (const g of goals) {
      if (!g.name || !g.targetAmount) continue;
      await db
        .insert(financeGoals)
        .values({
          id: g.id || crypto.randomUUID(),
          ownerId: user.id,
          name: g.name,
          targetAmount: String(g.targetAmount),
          savedAmount: String(g.savedAmount || 0),
          targetDate: g.targetDate || new Date().toISOString().split("T")[0],
          description: g.description || null,
          icon: g.icon || "Target",
          color: g.color || "#10b981",
        })
        .onConflictDoNothing({ target: [financeGoals.ownerId, financeGoals.id] });
      importedGoals++;
    }
  }

  // 5. Debts
  if (Array.isArray(debts) && debts.length > 0) {
    for (const d of debts) {
      if (!d.person || !d.originalAmount) continue;
      await db
        .insert(financeDebts)
        .values({
          id: d.id || crypto.randomUUID(),
          ownerId: user.id,
          person: d.person,
          type: d.type || "I_OWE",
          originalAmount: String(d.originalAmount),
          remainingAmount: String(d.remainingAmount || d.originalAmount),
          dueDate: d.dueDate || null,
          note: d.note || null,
          status: d.status || "ACTIVE",
          payments: d.payments || [],
        })
        .onConflictDoNothing({ target: [financeDebts.ownerId, financeDebts.id] });
      importedDebts++;
    }
  }

  return NextResponse.json({
    success: true,
    imported: {
      transactions: importedTransactions,
      categories: importedCategories,
      budgets: importedBudgets,
      goals: importedGoals,
      debts: importedDebts,
    },
  });
}
