# Runbook: migration 0003 (Phase 1 multi-user isolation) บน production Neon

เอกสารนี้ให้เจ้าของระบบรันด้วยมือ ทีละขั้น กับ production Neon Postgres
ผู้เขียนเอกสารไม่มีสิทธิ์เข้าถึง production และ **ไม่ได้ทดสอบอะไรบน production**

> **สถานะการทดสอบ (พูดตรง ๆ):** SQL ใน 0003 ทดสอบกับ Postgres บนเครื่อง dev เท่านั้น
> (embedded Postgres 18 ใน sandbox + integration tests ของ repo) ส่วน Neon อาจเป็น Postgres คนละเวอร์ชัน
> จึงต้องซ้อมบน Neon branch ก่อนถ้าทำได้ (ขั้นที่ 0.3) และต้องมี snapshot `pre-0003` ก่อนแตะ production เสมอ

## สรุป 8 บรรทัด

1. Migration 0003 เปลี่ยน primary key ของ 5 ตาราง จาก `(id)` เป็น `(owner_id, id)` เพื่อให้สองคนใช้ id เดียวกันได้ และเพิ่ม default category 14 รายการให้ทุก user ที่ยังไม่มี (บัญชี B ขาดอยู่)
2. ก่อนเริ่ม: ให้ทั้งสองคน export ข้อมูล, สร้าง Neon branch/snapshot ชื่อ `pre-0003`, **บัญชี B ห้ามล้างข้อมูลเบราว์เซอร์**
3. ตรวจก่อนรัน: ชื่อ primary key ต้องเป็น `<table>_pkey` ครบ 5 ตาราง และต้องไม่มี `owner_id` เป็น NULL; จดจำนวนแถวทุกตารางไว้เทียบ
4. ถ้าตรวจไม่ผ่านแม้ข้อเดียว **หยุด** แล้วส่งผล query มาขอความช่วยเหลือ (ยังไม่ได้แก้อะไรเลย ปลอดภัย)
5. รัน migration แบบ transaction เดียว (`npm run db:migrate` หรือ `BEGIN; ... COMMIT;`): ถ้า error อะไรก็ตาม จะไม่มีการเปลี่ยนแปลงเลย
6. หลัง migrate แล้ว **code เก่าจะ sync ไม่ได้** (POST `/api/sync` ล้มเหลว) ต้อง deploy code ใหม่ (commit `29a21ce` ขึ้นไป) ทันที ทำตอนทั้งสองคนไม่ได้ใช้งาน
7. ตรวจผล: จำนวนหมวดหมู่ต่อ owner (A = 17, B = 15 ตามข้อมูล 2026-11), PK เป็น `(owner_id, id)`, จำนวนแถวก่อน/หลังเท่ากัน, ล็อกอินทั้งสองบัญชีดูข้อมูลของตัวเอง
8. ถ้าผิดพลาด: restore snapshot `pre-0003` (ข้อมูลที่เขียนหลัง snapshot จะหาย จึงต้องให้ช่วงเวลานี้สั้นและไม่มีคนใช้)

---

## สิ่งที่ปลอดภัยให้ทำซ้ำ / ไม่ปลอดภัย

| ขั้นตอน | ทำซ้ำได้ไหม |
|---|---|
| Query ตรวจ (SELECT) ทุกอัน | ปลอดภัย รันกี่ครั้งก็ได้ |
| รัน 0003 ทั้งไฟล์ใน transaction เดียว แล้ว **error** | ปลอดภัย ไม่มีอะไรเปลี่ยน แก้สาเหตุแล้วรันใหม่ได้ |
| รัน 0003 ซ้ำหลังที่ **สำเร็จไปแล้ว** | **ไม่ปลอดภัย / จะ error** (`finance_*_pkey` ไม่มีแล้ว) ไม่ต้องรันซ้ำ ให้ไปขั้นตรวจผล |
| รันทีละ statement แยกกันโดยไม่มี `BEGIN` | **ห้าม** ถ้าหยุดกลางทางจะเหลือสถานะครึ่ง ๆ กลาง ๆ (ตารางไม่มี PK) |
| Restore snapshot | ย้อนข้อมูลกลับไปจุด snapshot ข้อมูลที่เขียนหลังจากนั้นหาย |

---

## ขั้นที่ 0: เตรียมการ (pre-flight)

### 0.1 สำรองข้อมูล

1. ให้ทั้งสองคน export ข้อมูลจากแอป (Settings, export) เก็บไฟล์ไว้
2. **บัญชี B ห้ามล้างข้อมูลเบราว์เซอร์จนกว่าจะทำเสร็จทั้งหมด** (ข้อมูลในเบราว์เซอร์ของ B อาจเป็นสำเนาครบถ้วนเพียงชุดเดียวของหมวดหมู่)
3. ใน Neon console สร้าง branch/snapshot จากฐานข้อมูล production ตั้งชื่อ `pre-0003` (ดู Neon console: Branches, สร้าง branch จาก production) จดเวลาที่สร้างไว้

**ผลที่คาดหวัง / Expected:** เห็น `pre-0003` ในรายการ branch/snapshot ของ Neon

### 0.2 ตรวจชื่อ primary key (สำคัญมาก)

0003 ใช้ `DROP CONSTRAINT "<table>_pkey"` ถ้าชื่อจริงในฐานข้อมูลต่างไปจากนี้ จะ error

```sql
SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'p'
  AND conrelid::regclass::text IN (
    'finance_budgets', 'finance_categories', 'finance_debts',
    'finance_goals', 'finance_transactions'
  )
ORDER BY 1;
```

**ผลที่คาดหวัง / Expected:** 5 แถว ชื่อ `finance_budgets_pkey`, `finance_categories_pkey`, `finance_debts_pkey`, `finance_goals_pkey`, `finance_transactions_pkey` และ definition เป็น `PRIMARY KEY (id)`

**ถ้าชื่ออื่นหรือจำนวนแถวไม่ใช่ 5: หยุดทันที ห้ามรัน 0003** เพราะบรรทัด `DROP CONSTRAINT` จะ error
ไม่ต้องตกใจ: migration นี้ทำใน transaction เดียว ถ้า fail จะไม่มีอะไรเปลี่ยน แต่ก็ไม่ควรไปต่อ
ให้ copy ผลลัพธ์ของ query นี้ (ทั้งตาราง) ส่งให้ผู้พัฒนา/Claude เพื่อแก้ไฟล์ migration ให้ตรงกับชื่อจริงก่อน

### 0.3 ตรวจ owner_id และจดจำนวนแถว (ก่อน)

```sql
SELECT 'finance_budgets' AS t, count(*) AS rows, count(*) FILTER (WHERE owner_id IS NULL) AS null_owner FROM finance_budgets
UNION ALL SELECT 'finance_categories', count(*), count(*) FILTER (WHERE owner_id IS NULL) FROM finance_categories
UNION ALL SELECT 'finance_debts', count(*), count(*) FILTER (WHERE owner_id IS NULL) FROM finance_debts
UNION ALL SELECT 'finance_goals', count(*), count(*) FILTER (WHERE owner_id IS NULL) FROM finance_goals
UNION ALL SELECT 'finance_transactions', count(*), count(*) FILTER (WHERE owner_id IS NULL) FROM finance_transactions
ORDER BY 1;
```

**ผลที่คาดหวัง / Expected:** คอลัมน์ `null_owner` เป็น **0 ทุกแถว** (ถ้าไม่ใช่ 0 หยุด: PRIMARY KEY ไม่ยอมให้ owner_id เป็น NULL) และ **จดคอลัมน์ `rows` ทั้ง 5 ค่าไว้** (จะเทียบหลัง migrate) สำหรับ `finance_categories` ตามข้อมูลเดือน 2026-11 ควรได้ 18 (A 17 + B 1)

ถ้าอยากซ้อมก่อน: สร้าง Neon branch ใหม่จาก production (แยกจาก `pre-0003`) แล้วทำขั้นที่ 1-2 บน branch นั้นด้วย connection string ของ branch ก่อน แล้วค่อยทำจริง

### 0.4 ตรวจว่าเคยใช้ drizzle migrator บน production ไหม

```sql
SELECT count(*) FROM drizzle.__drizzle_migrations;
```

**ผลที่คาดหวัง / Expected:**
- ได้ตัวเลข (เช่น 3) = ตาราง migrations มีอยู่ ใช้ **ทาง A** (`npm run db:migrate`) ในขั้นที่ 1
- error `relation "drizzle.__drizzle_migrations" does not exist` = ไม่เคยใช้ migrator ใช้ **ทาง B** (Neon SQL editor) ในขั้นที่ 1 และอ่าน "ข้อควรระวังหลังจากนี้" ท้ายเอกสาร

---

## ขั้นที่ 1: รัน migration (atomic)

**ก่อนเริ่มขั้นนี้:** ตกลงเวลากับอีกคนว่าไม่ใช้แอป และเตรียมพร้อม deploy code ใหม่ (ขั้นที่ 2) ให้เสร็จทันที ช่วงที่ตารางเปลี่ยนแล้วแต่ code เก่ายังรันอยู่ คือช่วงอันตราย

### ทาง A: ตาราง migrations มีอยู่ (แนะนำ)

ในโฟลเดอร์โปรเจกต์ ใช้ `DATABASE_URL` ของ production (drizzle-kit อ่านจาก `.env.local` แล้ว `.env` หรือ environment variable; ถ้าไม่มีเลยมันจะ fallback ไปยัง Postgres local พอร์ต 55432 ซึ่ง**ไม่ใช่ production** ต้องตรวจให้แน่ใจว่าชี้ production จริง)

```bash
DATABASE_URL='postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require' npm run db:migrate
```

(แทนค่าด้วย connection string จริงจาก Neon; ใช้ single quote ครอบ)

drizzle จะรัน migration ที่ยังไม่เคยรัน (ที่นี่คือ 0003) ใน transaction เดียว ถ้า fail จะ rollback ทั้งหมด

**ผลที่คาดหวัง / Expected:** จบโดยไม่มี error และไม่มีข้อความ fail; ไปขั้นที่ 2 ทันที ถ้ามี error: ไม่มีอะไรเปลี่ยน อ่านข้อความ error แล้วส่งให้ผู้พัฒนา ห้ามรันซ้ำจนกว่าจะรู้สาเหตุ

### ทาง B: ไม่มีตาราง migrations → Neon SQL editor

วางทั้งก้อนด้านล่างนี้ **ในครั้งเดียว** (สร้างจากไฟล์ `drizzle/0003_multi_user_composite_pk.sql` จริง โดยแทนที่ `--> statement-breakpoint` ด้วยการขึ้นบรรทัดใหม่ และครอบด้วย `BEGIN;` / `COMMIT;`):

```sql
BEGIN;

-- Key the synced finance tables by (owner_id, id) so two owners can hold the same client id.
ALTER TABLE "finance_budgets" DROP CONSTRAINT "finance_budgets_pkey";

ALTER TABLE "finance_categories" DROP CONSTRAINT "finance_categories_pkey";

ALTER TABLE "finance_debts" DROP CONSTRAINT "finance_debts_pkey";

ALTER TABLE "finance_goals" DROP CONSTRAINT "finance_goals_pkey";

ALTER TABLE "finance_transactions" DROP CONSTRAINT "finance_transactions_pkey";

ALTER TABLE "finance_budgets" ADD CONSTRAINT "finance_budgets_owner_id_id_pk" PRIMARY KEY("owner_id","id");

ALTER TABLE "finance_categories" ADD CONSTRAINT "finance_categories_owner_id_id_pk" PRIMARY KEY("owner_id","id");

ALTER TABLE "finance_debts" ADD CONSTRAINT "finance_debts_owner_id_id_pk" PRIMARY KEY("owner_id","id");

ALTER TABLE "finance_goals" ADD CONSTRAINT "finance_goals_owner_id_id_pk" PRIMARY KEY("owner_id","id");

ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_owner_id_id_pk" PRIMARY KEY("owner_id","id");

INSERT INTO "finance_categories" ("id", "owner_id", "name", "type", "icon", "color", "is_default")
SELECT d.id, u.id, d.name, d.type, d.icon, d.color, true
FROM "user" u
CROSS JOIN (VALUES
    ('cat-income-1', 'เงินเดือน', 'INCOME', 'Briefcase', '#22c55e'),
    ('cat-income-2', 'ธุรกิจ', 'INCOME', 'Store', '#16a34a'),
    ('cat-income-3', 'การลงทุน', 'INCOME', 'TrendingUp', '#15803d'),
    ('cat-income-4', 'รายรับอื่นๆ', 'INCOME', 'PlusCircle', '#86efac'),
    ('cat-expense-1', 'อาหาร', 'EXPENSE', 'Utensils', '#ef4444'),
    ('cat-expense-2', 'เดินทาง', 'EXPENSE', 'Car', '#f97316'),
    ('cat-expense-3', 'ที่พัก', 'EXPENSE', 'Home', '#eab308'),
    ('cat-expense-4', 'สุขภาพ', 'EXPENSE', 'HeartPulse', '#ec4899'),
    ('cat-expense-5', 'ช้อปปิ้ง', 'EXPENSE', 'ShoppingBag', '#8b5cf6'),
    ('cat-expense-6', 'บันเทิง', 'EXPENSE', 'Tv', '#06b6d4'),
    ('cat-expense-7', 'การศึกษา', 'EXPENSE', 'BookOpen', '#3b82f6'),
    ('cat-expense-8', 'สาธารณูปโภค', 'EXPENSE', 'Zap', '#f59e0b'),
    ('cat-expense-9', 'รายจ่ายอื่นๆ', 'EXPENSE', 'MoreHorizontal', '#94a3b8'),
    ('cat-transfer-1', 'ย้ายเงินไปลงทุน', 'TRANSFER', 'ArrowLeftRight', '#0ea5e9')
) AS d(id, name, type, icon, color)
ON CONFLICT ("owner_id", "id") DO NOTHING;

COMMIT;
```

ถ้าใช้ `psql` แทน editor ให้ใช้ single transaction: บันทึกก้อน SQL เดิม **โดยไม่ต้องมี BEGIN/COMMIT** ลงไฟล์ แล้วรัน `psql "$DATABASE_URL" -1 -v ON_ERROR_STOP=1 -f 0003.sql`

**ผลที่คาดหวัง / Expected:** statements สำเร็จทั้งหมด (`COMMIT` สุดท้าย) ถ้า error กลางทาง ให้ใส่ `ROLLBACK;` แล้วตรวจว่าสถานะกลับเป็นเดิม (รันขั้น 0.2 อีกครั้งต้องได้ `*_pkey` 5 ตัวเหมือนเดิม) ส่ง error ให้ผู้พัฒนา

> **ถ้าตาราง `drizzle.__drizzle_migrations` มีอยู่ แต่คุณเลือกทาง B:** drizzle จะไม่รู้ว่า 0003 ถูกรันแล้ว และ `npm run db:migrate` ครั้งถัดไปจะพยายามรัน 0003 อีก (แล้ว error) วิธีที่แนะนำคือ **ใช้ทาง A แทน** ถ้าจำเป็นต้องใช้ editor จริง ๆ มี 2 ทางเลือก: (1) ไม่รัน `db:migrate` อีกจนกว่าจะแก้ให้ตรงกัน หรือ (2) บันทึก migration ลงตารางเอง โดยคำนวณ hash ด้วย `sha256sum drizzle/0003_multi_user_composite_pk.sql` แล้วรัน
>
> ```sql
> INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
> VALUES ('<ค่า sha256 จาก sha256sum>', 1793632177056);
> ```
>
> (`1793632177056` คือค่า `when` ของ 0003 ใน `drizzle/meta/_journal.json`) ขั้นนี้ขึ้นกับพฤติกรรมของ drizzle-kit เวอร์ชันที่ใช้ ถ้าไม่แน่ใจ อย่าทำเอง ให้ถามผู้พัฒนา

---

## ขั้นที่ 2: deploy code ใหม่ทันที (ช่วงอันตราย)

หลัง 0003 สำเร็จ code เก่าใช้ `ON CONFLICT (id)` ซึ่งไม่มี unique constraint บน `id` อีกแล้ว ดังนั้น **POST `/api/sync` ของ code เก่าจะ error 500** (อ่านข้อมูลยังได้ แต่บันทึกไม่ได้) ต้อง deploy code ใหม่ (branch `feat/multi-user-isolation`, commit `29a21ce` ขึ้นไป ซึ่งใช้ `ON CONFLICT (owner_id, id)`) ให้เร็วที่สุด

ลำดับ: ทั้งสองคนไม่ใช้งาน, รัน migration (ขั้นที่ 1), deploy code ใหม่, ตรวจ (ขั้นที่ 3) แอปแบบ local-first จะ retry การ sync เองเมื่อ deploy เสร็จ ข้อมูลที่ยังไม่ sync อยู่ในเบราว์เซอร์ ไม่หาย

**รู้ได้อย่างไรว่า code ใหม่ขึ้นแล้ว:** เปิดหน้า deployments ของ host ที่ใช้ deploy (ตามปกติของคุณ) ดูว่า deployment ล่าสุดเป็น commit `29a21ce` หรือใหม่กว่า สถานะ Ready/สำเร็จ แล้วเปิดแอปที่ deployment URL ที่ใช้เป็นประจำ (hard refresh) ล็อกอินและกด sync (หรือเพิ่มรายการทดสอบหนึ่งรายการ) ถ้า sync สำเร็จโดยไม่ error แปลว่า code ใหม่ทำงาน (ซึ่ง code เก่าทำไม่ได้หลัง 0003) ใน Network tab ของเบราว์เซอร์ POST `/api/sync` ต้องตอบ 200

---

## ขั้นที่ 3: ตรวจผล (verification)

### 3.1 จำนวนหมวดหมู่ต่อ owner

```sql
SELECT owner_id, count(*) AS categories,
       count(*) FILTER (WHERE is_default) AS defaults
FROM finance_categories
GROUP BY owner_id
ORDER BY owner_id;
```

**ผลที่คาดหวัง / Expected:** บัญชี A = **17**, บัญชี B = **15** (14 default + 1 custom เดิมของ B) ตัวเลขนี้มาจาก snapshot ของ production เมื่อ 2026-11 ถ้าข้อมูลเปลี่ยนไปแล้ว ตัวเลขอาจต่างได้ **กฎที่ต้องจริงเสมอ:** ทุก owner ต้องมี default id ครบ 14 ตัว ตรวจแบบเข้มด้วย:

```sql
SELECT u.id AS owner_id,
       count(c.id) FILTER (WHERE c.id IN (
         'cat-income-1','cat-income-2','cat-income-3','cat-income-4',
         'cat-expense-1','cat-expense-2','cat-expense-3','cat-expense-4','cat-expense-5',
         'cat-expense-6','cat-expense-7','cat-expense-8','cat-expense-9','cat-transfer-1'
       )) AS default_ids
FROM "user" u
LEFT JOIN finance_categories c ON c.owner_id = u.id
GROUP BY u.id;
```

**ผลที่คาดหวัง / Expected:** `default_ids` = 14 ทุกแถว

### 3.2 primary key เป็น (owner_id, id)

```sql
SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'p'
  AND conrelid::regclass::text IN (
    'finance_budgets', 'finance_categories', 'finance_debts',
    'finance_goals', 'finance_transactions'
  )
ORDER BY 1;
```

**ผลที่คาดหวัง / Expected:** 5 แถว ชื่อ `finance_<table>_owner_id_id_pk` และ definition `PRIMARY KEY (owner_id, id)`

ดูจาก index ได้อีกทาง:

```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'finance\_%\_owner\_id\_id\_pk'
ORDER BY tablename;
```

**ผลที่คาดหวัง / Expected:** 5 แถว, `indexdef` มี `(owner_id, id)`

### 3.3 จำนวนแถวก่อน/หลัง

รัน query ของข้อ 0.3 อีกครั้ง

**ผลที่คาดหวัง / Expected:** `finance_budgets`, `finance_debts`, `finance_goals`, `finance_transactions` มีจำนวนแถว **เท่าเดิมเป๊ะ**; `finance_categories` เพิ่มขึ้นเท่ากับจำนวน default ที่ขาดไป (ตามข้อมูล 2026-11 คือ B ขาด 14 จึงเพิ่ม 14: 18 เป็น 32) และ `null_owner` ยังเป็น 0

### 3.4 ทดสอบใช้งานจริง

1. ล็อกอินบัญชี A (เบราว์เซอร์/โปรไฟล์ของ A): เห็นข้อมูลของตัวเอง ไม่เห็นข้อมูลของ B, กด sync ได้
2. ล็อกอินบัญชี B (**เบราว์เซอร์/โปรไฟล์แยกกัน** ดู launch gate ข้อ i): เห็นข้อมูลของตัวเอง ไม่เห็นของ A, มีหมวดหมู่ default ครบ, รายการเดิมยังผูกกับหมวดหมู่ถูกต้อง, sync ได้

**ผลที่คาดหวัง / Expected:** ทั้งสองบัญชีเห็นเฉพาะข้อมูลของตัวเอง และ sync สำเร็จ

---

## ขั้นที่ 4: Rollback

ถ้าตรวจไม่ผ่านและต้องย้อน:

1. ให้ทั้งสองคนหยุดใช้งาน
2. ใน Neon console เลือก snapshot/branch `pre-0003` แล้วใช้คำสั่ง **Restore / Branch from the snapshot** (ชื่อปุ่มอาจต่างกันตามเวอร์ชัน console) เพื่อนำฐานข้อมูล production กลับไปยังสถานะนั้น แล้วตรวจว่าแอปเชื่อมต่อได้ (ถ้าได้ branch ใหม่ อาจต้องเปลี่ยน `DATABASE_URL` ให้ชี้ไปที่ branch นั้น)
3. Deploy code ของเวอร์ชันก่อนหน้ากลับด้วย (code ใหม่ใช้ `ON CONFLICT (owner_id, id)` จะไม่ทำงานกับ schema เก่า)
4. รัน query ขั้น 0.2 และ 0.3 อีกครั้ง ต้องได้สถานะเดิมก่อนเริ่ม

**ข้อควรรู้:**
- ข้อมูลที่ถูกเขียนระหว่างเวลา snapshot ถึงเวลา rollback **จะหายไป** จึงควรให้ช่วงนี้สั้นและไม่มีคนใช้ (ข้อมูลที่ยังอยู่ในเบราว์เซอร์จะ sync ใหม่ได้)
- Backfill ใน 0003 จะ **สร้าง default category ที่ผู้ใช้เคยลบไปกลับคืนมา** (ถ้าผู้ใช้ลบ default ออกจากบัญชีตัวเอง) ตอนนี้ทั้งสองบัญชีไม่ได้รับผลกระทบ แต่ถ้าในอนาคตต้องรัน logic แบบนี้ซ้ำ ให้รู้ไว้

---

## ข้อควรระวังหลังจากนี้ (หลังทำเสร็จ)

- ถ้าใช้ **ทาง B** และตาราง `drizzle.__drizzle_migrations` **ไม่มีอยู่เลย**: การรัน `npm run db:migrate` ในอนาคตจะพยายามรัน 0000 ถึง 0003 ใหม่ตั้งแต่ต้น แล้ว fail (ตารางมีอยู่แล้ว) ดังนั้น **อย่ารัน `db:migrate` กับ production** จนกว่าโปรเจกต์จะทำ baseline (ให้ drizzle รู้ว่า 0000-0003 ถูกใช้แล้ว) ซึ่งต้องวางแผนแยกต่างหาก ผู้เขียนเอกสารนี้ไม่ได้กำหนดวิธี baseline ไว้ ให้ปรึกษาผู้พัฒนาก่อนมี migration 0004
- ถ้ามีตาราง migrations และใช้ทาง A: ไม่มีอะไรต้องทำเพิ่ม

---

## ก่อนเปิดให้คนอื่นสมัคร (launch gate)

ยังไม่ควรเปิดสมัครสาธารณะจนกว่าข้อเหล่านี้จะเสร็จ:

1. **localStorage แชร์ต่อเบราว์เซอร์ ไม่ใช่ต่อ user** ถ้าสองบัญชีใช้เบราว์เซอร์/โปรไฟล์เดียวกัน ข้อมูล local ของคนแรกอาจถูกอัปโหลดเข้าบัญชีของคนที่สองตอน sync **อย่าให้สองบัญชีใช้เบราว์เซอร์/โปรไฟล์เดียวกัน** จนกว่าจะแก้ (ฝั่ง client ยังไม่ได้แก้ในงานนี้) นอกจากนี้ข้อมูลเก่า `finance-cycle` ยังค้างอยู่ใน localStorage ของเบราว์เซอร์ (ไม่มี UI ลบ) ต้องล้างเองหรือรอ Phase 4
2. **ยังไม่มี email verification และ AI quota/rate limit** (อยู่ใน Phase 3)
3. **Gemini billing และ budget alert** ต้องตั้งค่าก่อน
4. **ซ้อม backup/restore** อย่างน้อยหนึ่งครั้ง (ทำ restore จาก snapshot จริงบน branch ทดสอบ) ก่อนมีผู้ใช้เพิ่ม
