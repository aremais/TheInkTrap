import assert from "node:assert/strict";
import test from "node:test";
import { migrate, openDatabase } from "../src/db.js";

function database() {
  const db = openDatabase(":memory:");
  migrate(db);
  return db;
}

function constraint(run) {
  assert.throws(run, (error) => /constraint/i.test(error.message));
}

function addStaff(db, role = "cashier", username = "cashier") {
  const result = db
    .prepare("INSERT INTO staff (name, username, role) VALUES (?, ?, ?)")
    .run(role === "manager" ? "Shop Manager" : "Front Counter", username, role);
  return Number(result.lastInsertRowid);
}

function addSale(db, staffId, fields = {}) {
  const result = db
    .prepare(
      `INSERT INTO sales (
        staff_id, status, payment_method, subtotal_cents, tax_cents, total_cents,
        tendered_cents, change_due_cents, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      staffId,
      fields.status ?? "open",
      fields.payment_method ?? null,
      fields.subtotal_cents ?? 0,
      fields.tax_cents ?? 0,
      fields.total_cents ?? 0,
      fields.tendered_cents ?? null,
      fields.change_due_cents ?? null,
      fields.completed_at ?? null,
    );
  return Number(result.lastInsertRowid);
}

test("sample catalog has 50 titles and unique SKUs", () => {
  const db = database();
  try {
    const count = db.prepare("SELECT COUNT(*) AS n FROM books").get();
    const distinct = db.prepare("SELECT COUNT(DISTINCT sku) AS n FROM books").get();
    const outOfStock = db.prepare("SELECT COUNT(*) AS n FROM books WHERE stock_count = 0").get();
    assert.equal(count.n, 50);
    assert.equal(distinct.n, 50);
    assert.equal(outOfStock.n, 3);
    const sample = db.prepare("SELECT title, price_cents FROM books WHERE sku = 'IT-1001'").get();
    assert.equal(sample.title, "Pride and Prejudice");
    assert.equal(sample.price_cents, 1250);
  } finally {
    db.close();
  }
});

test("staff role is manager or cashier", () => {
  const db = database();
  try {
    const managerId = addStaff(db, "manager", "manager");
    const cashierId = addStaff(db, "cashier", "cashier");
    const roles = db
      .prepare("SELECT role FROM staff WHERE id IN (?, ?) ORDER BY role")
      .all(managerId, cashierId);
    assert.deepEqual(
      roles.map((row) => row.role),
      ["cashier", "manager"],
    );
    constraint(() => addStaff(db, "owner", "owner"));
    constraint(() => addStaff(db, "cashier", "CASHIER"));
  } finally {
    db.close();
  }
});

test("books reject a duplicate SKU, a blank title, a bad grade, and a negative price or stock", () => {
  const db = database();
  try {
    const insert = db.prepare(
      `INSERT INTO books (
        sku, title, author, edition, condition_grade, price_cents, stock_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    constraint(() => insert.run("IT-1001", "Another copy", "Jane Austen", "Reprint", "Good", 500, 1));
    constraint(() => insert.run("it-1001", "Another copy", "Jane Austen", "Reprint", "Good", 500, 1));
    constraint(() => insert.run(" IT-2000", "A New Title", "Jane Austen", "Reprint", "Good", 500, 1));
    constraint(() => insert.run("IT-2001", "   ", "Jane Austen", "Reprint", "Good", 500, 1));
    constraint(() => insert.run("IT-2002", "A New Title", "Jane Austen", "Reprint", "Mint", 500, 1));
    constraint(() => insert.run("IT-2003", "A New Title", "Jane Austen", "Reprint", "Good", -1, 1));
    constraint(() => insert.run("IT-2004", "A New Title", "Jane Austen", "Reprint", "Good", 500, -1));
    insert.run("IT-2005", "A New Title", "Jane Austen", "Reprint", "Good", 0, 0);
  } finally {
    db.close();
  }
});

test("a sale item must belong to a real sale and book, and the line total must match", () => {
  const db = database();
  try {
    const staffId = addStaff(db);
    const saleId = addSale(db, staffId);
    const book = db.prepare("SELECT id FROM books WHERE sku = 'IT-1009'").get();
    const insert = db.prepare(
      `INSERT INTO sale_items (sale_id, book_id, quantity, unit_price_cents, line_total_cents)
       VALUES (?, ?, ?, ?, ?)`,
    );

    insert.run(saleId, book.id, 2, 1000, 2000);
    constraint(() => insert.run(saleId, book.id, 1, 1000, 1000));
    constraint(() => insert.run(9999, book.id, 1, 1000, 1000));
    constraint(() => insert.run(saleId, 9999, 1, 1000, 1000));
    const zeroQty = db.prepare("SELECT id FROM books WHERE sku = 'IT-1024'").get();
    constraint(() => insert.run(saleId, zeroQty.id, 0, 550, 0));

    const other = db.prepare("SELECT id FROM books WHERE sku = 'IT-1044'").get();
    constraint(() => insert.run(saleId, other.id, 2, 650, 1301));
  } finally {
    db.close();
  }
});

test("completed sales keep the payment math, and referenced rows cannot be deleted", () => {
  const db = database();
  try {
    const staffId = addStaff(db);
    const book = db.prepare("SELECT id FROM books WHERE sku = 'IT-1044'").get();

    constraint(() =>
      addSale(db, staffId, {
        status: "completed",
        subtotal_cents: 650,
        tax_cents: 50,
        total_cents: 700,
        completed_at: "2026-11-25 12:00:00",
      }),
    );
    constraint(() =>
      addSale(db, staffId, {
        status: "completed",
        payment_method: "cash",
        subtotal_cents: 650,
        tax_cents: 50,
        total_cents: 800,
        tendered_cents: 1000,
        change_due_cents: 200,
        completed_at: "2026-11-25 12:00:00",
      }),
    );
    constraint(() =>
      addSale(db, staffId, {
        status: "completed",
        payment_method: "cash",
        subtotal_cents: 650,
        tax_cents: 50,
        total_cents: 700,
        tendered_cents: 700,
        change_due_cents: 50,
        completed_at: "2026-11-25 12:00:00",
      }),
    );

    constraint(() =>
      addSale(db, staffId, {
        status: "completed",
        payment_method: "card",
        subtotal_cents: 650,
        tax_cents: 0,
        total_cents: 650,
        tendered_cents: 50,
        change_due_cents: 999,
        completed_at: "2026-11-25 12:00:00",
      }),
    );

    const cardSaleId = addSale(db, staffId, {
      status: "completed",
      payment_method: "card",
      subtotal_cents: 650,
      tax_cents: 50,
      total_cents: 700,
      completed_at: "2026-11-25 12:00:00",
    });
    db.prepare(
      `INSERT INTO sale_items (sale_id, book_id, quantity, unit_price_cents, line_total_cents)
       VALUES (?, ?, 1, 650, 650)`,
    ).run(cardSaleId, book.id);

    constraint(() => db.prepare("DELETE FROM books WHERE id = ?").run(book.id));
    constraint(() => db.prepare("DELETE FROM staff WHERE id = ?").run(staffId));
    constraint(() => db.prepare("DELETE FROM sales WHERE id = ?").run(cardSaleId));

    const cashSaleId = addSale(db, staffId, {
      status: "completed",
      payment_method: "cash",
      subtotal_cents: 650,
      tax_cents: 0,
      total_cents: 650,
      tendered_cents: 1000,
      change_due_cents: 350,
      completed_at: "2026-11-25 12:05:00",
    });
    const saved = db.prepare("SELECT change_due_cents FROM sales WHERE id = ?").get(cashSaleId);
    assert.equal(saved.change_due_cents, 350);
  } finally {
    db.close();
  }
});
