-- Books, sales, sale items, and staff.
-- Money is integer cents. Condition grades: Fine, Very Good, Good, Fair, Poor.
-- Staff roles: manager, cashier. password_hash stays empty until sign-in.

CREATE TABLE staff (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  username TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (
    length(username) > 0 AND username = trim(username)
  ),
  role TEXT NOT NULL CHECK (role IN ('manager', 'cashier')),
  password_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE books (
  id INTEGER PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (length(sku) > 0 AND sku = trim(sku)),
  title TEXT NOT NULL CHECK (length(title) > 0 AND title = trim(title)),
  author TEXT NOT NULL CHECK (length(author) > 0 AND author = trim(author)),
  edition TEXT NOT NULL CHECK (length(edition) > 0 AND edition = trim(edition)),
  condition_grade TEXT NOT NULL CHECK (
    condition_grade IN ('Fine', 'Very Good', 'Good', 'Fair', 'Poor')
  ),
  condition_notes TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  stock_count INTEGER NOT NULL DEFAULT 0 CHECK (stock_count >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX books_title ON books (title);
CREATE INDEX books_author ON books (author);

CREATE TABLE sales (
  id INTEGER PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff (id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'voided')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'card')),
  subtotal_cents INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  tax_cents INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  tendered_cents INTEGER CHECK (tendered_cents IS NULL OR tendered_cents >= 0),
  change_due_cents INTEGER CHECK (change_due_cents IS NULL OR change_due_cents >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  CHECK (total_cents = subtotal_cents + tax_cents),
  CHECK (
    status != 'completed'
    OR (
      payment_method IS NOT NULL
      AND completed_at IS NOT NULL
    )
  ),
  CHECK (
    payment_method IS NOT 'card'
    OR (tendered_cents IS NULL AND change_due_cents IS NULL)
  ),
  CHECK (
    status != 'completed'
    OR payment_method != 'cash'
    OR (
      tendered_cents IS NOT NULL
      AND change_due_cents IS NOT NULL
      AND tendered_cents >= total_cents
      AND change_due_cents = tendered_cents - total_cents
    )
  )
);

CREATE INDEX sales_staff_id ON sales (staff_id);

CREATE TABLE sale_items (
  id INTEGER PRIMARY KEY,
  sale_id INTEGER NOT NULL REFERENCES sales (id) ON DELETE RESTRICT,
  book_id INTEGER NOT NULL REFERENCES books (id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  line_total_cents INTEGER NOT NULL CHECK (line_total_cents = unit_price_cents * quantity),
  UNIQUE (sale_id, book_id)
);

CREATE INDEX sale_items_sale_id ON sale_items (sale_id);
CREATE INDEX sale_items_book_id ON sale_items (book_id);
