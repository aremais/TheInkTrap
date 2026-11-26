# Book Store Management schema

Prices and totals are integer cents. A book priced at $12.50 is stored as `1250`.

```mermaid
erDiagram
  staff ||--o{ sales : records
  sales ||--o{ sale_items : contains
  books ||--o{ sale_items : "is sold on"

  staff {
    int id PK
    text name
    text username UK
    text role
    text password_hash
    text created_at
  }

  books {
    int id PK
    text sku UK
    text title
    text author
    text edition
    text condition_grade
    text condition_notes
    int price_cents
    int stock_count
  }

  sales {
    int id PK
    int staff_id FK
    text status
    text payment_method
    int subtotal_cents
    int tax_cents
    int total_cents
    int tendered_cents
    int change_due_cents
    text completed_at
  }

  sale_items {
    int id PK
    int sale_id FK
    int book_id FK
    int quantity
    int unit_price_cents
    int line_total_cents
  }
```

A staff member is a `manager` or a `cashier`. `password_hash` stays empty until sign-in.

A book’s condition grade is `Fine`, `Very Good`, `Good`, `Fair`, or `Poor`. SKU is unique regardless of letter case. Price and stock cannot be negative.

A sale belongs to one staff member. Its total is the subtotal plus tax. A completed sale names `cash` or `card`. A completed cash sale stores the amount tendered and the change due, and the tendered amount covers the total. A card sale does not store a cash tender or change. Staff usernames are unique regardless of letter case.

A sale item belongs to one sale and one book. The same book appears once on a sale. The line total is the unit price times the quantity. A book or a staff member with a sale on record cannot be deleted, and a sale that still has items cannot be deleted.
