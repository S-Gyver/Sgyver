-- ==============================================================================
-- 🚀 Sgyver & Gyver Quiz / Gyver Forms - Supabase Database Setup Script
-- ==============================================================================
-- คำแนะนำ:
-- 1. เข้าสู่ระบบ Supabase Dashboard (https://supabase.com/dashboard)
-- 2. เลือกโปรเจกต์ของคุณ -> ไปที่เมนู "SQL Editor" ด้านซ้าย
-- 3. คลิก "New query" วางโค้ดทั้งหมดนี้ลงไป แล้วกดปุ่ม "Run" ด้านล่างขวา
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ตาราง lobbies (สำหรับห้องสอบสด Gyver Quiz Live Lobby & Gyver Code Race)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lobbies (
    room_code TEXT PRIMARY KEY,
    game_mode TEXT DEFAULT 'quiz',
    match_type TEXT DEFAULT 'solo',
    status TEXT DEFAULT 'WAITING',
    players JSONB DEFAULT '[]'::jsonb,
    quiz_id TEXT,
    quiz_title TEXT,
    quiz_variants JSONB DEFAULT '[]'::jsonb,
    quiz_settings JSONB DEFAULT '{}'::jsonb,
    target_code TEXT,
    timer_enabled BOOLEAN DEFAULT false,
    timer_duration INT DEFAULT 300,
    quiz_enabled BOOLEAN DEFAULT false,
    quiz_stock_id TEXT,
    gold_enabled BOOLEAN DEFAULT false,
    gold_milestone INT DEFAULT 20,
    gold_amount INT DEFAULT 50,
    shop_enabled BOOLEAN DEFAULT false,
    item_shield BOOLEAN DEFAULT true,
    item_blind BOOLEAN DEFAULT true,
    item_freeze BOOLEAN DEFAULT true,
    item_boost BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- เปิด RLS และอนุญาตให้ทุกคนเข้าถึงได้ (Anon / Authenticated)
ALTER TABLE public.lobbies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to lobbies" ON public.lobbies;
CREATE POLICY "Allow all access to lobbies" ON public.lobbies
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 2. ตาราง gyver_quizzes (คลังชุดแบบทดสอบ Gyver Quiz)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gyver_quizzes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.gyver_quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to gyver_quizzes" ON public.gyver_quizzes;
CREATE POLICY "Allow all access to gyver_quizzes" ON public.gyver_quizzes
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3. ตาราง gyver_quiz_responses (บันทึกผลการทำข้อสอบรายบุคคล)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gyver_quiz_responses (
    id BIGSERIAL PRIMARY KEY,
    quiz_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_room TEXT,
    score NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    percentage NUMERIC DEFAULT 0,
    is_passed BOOLEAN DEFAULT false,
    answers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.gyver_quiz_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to gyver_quiz_responses" ON public.gyver_quiz_responses;
CREATE POLICY "Allow all access to gyver_quiz_responses" ON public.gyver_quiz_responses
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. ตาราง gyver_forms (คลังแบบฟอร์ม Gyver Forms)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gyver_forms (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.gyver_forms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to gyver_forms" ON public.gyver_forms;
CREATE POLICY "Allow all access to gyver_forms" ON public.gyver_forms
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. ตาราง gyver_form_responses (บันทึกการตอบกลับแบบฟอร์ม)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gyver_form_responses (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL,
    responder_name TEXT,
    answers JSONB DEFAULT '{}'::jsonb,
    quiz_score NUMERIC,
    total_points NUMERIC,
    is_passed BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.gyver_form_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to gyver_form_responses" ON public.gyver_form_responses;
CREATE POLICY "Allow all access to gyver_form_responses" ON public.gyver_form_responses
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. เปิดใช้งาน Supabase Realtime เพื่อให้ระบบซิงก์นักเรียนและเริ่มสอบแบบสดได้ทันที
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- เพิ่มตาราง lobbies เข้า Realtime publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'lobbies'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.lobbies;
    END IF;

    -- เพิ่มตาราง gyver_quiz_responses เข้า Realtime publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'gyver_quiz_responses'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.gyver_quiz_responses;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 7. ตาราง live_studio_rooms (ห้องเรียนสด Gyver Live Studio)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_studio_rooms (
    pin TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    host_name TEXT NOT NULL,
    host_secret TEXT,
    status TEXT DEFAULT 'LIVE',  -- 'LIVE' | 'ENDED'
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.live_studio_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to live_studio_rooms" ON public.live_studio_rooms;
CREATE POLICY "Allow all access to live_studio_rooms" ON public.live_studio_rooms
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 8. ตาราง live_studio_messages (บันทึกข้อความแชทถาวรในห้องเรียน)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_studio_messages (
    id BIGSERIAL PRIMARY KEY,
    room_pin TEXT NOT NULL REFERENCES public.live_studio_rooms(pin) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    sender_role TEXT DEFAULT 'student',
    sender_avatar TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_studio_messages_pin ON public.live_studio_messages(room_pin, created_at);

ALTER TABLE public.live_studio_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to live_studio_messages" ON public.live_studio_messages;
CREATE POLICY "Allow all access to live_studio_messages" ON public.live_studio_messages
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 9. ตาราง live_studio_files (บันทึกไฟล์แนบในห้องเรียนที่เก็บไว้บน Cloudinary)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_studio_files (
    id BIGSERIAL PRIMARY KEY,
    room_pin TEXT NOT NULL REFERENCES public.live_studio_rooms(pin) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_studio_files_pin ON public.live_studio_files(room_pin, created_at);

ALTER TABLE public.live_studio_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to live_studio_files" ON public.live_studio_files;
CREATE POLICY "Allow all access to live_studio_files" ON public.live_studio_files
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 10. เปิด Realtime สำหรับ Live Studio (Rooms, Messages, Files)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'live_studio_rooms'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.live_studio_rooms;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'live_studio_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.live_studio_messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'live_studio_files'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.live_studio_files;
    END IF;

    -- เพิ่มตาราง classrooms เข้า Realtime publication เพื่อให้อัปเดตนักเรียนที่สแกนเข้าห้องสดทันที
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'classrooms'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.classrooms;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 11. ฟิลด์เพิ่มเติมสำหรับระบบ "ห้องเรียนของฉัน (My Classroom)"
-- ------------------------------------------------------------------------------
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS attendance_logs JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS materials JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS assignments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS gradebook JSONB DEFAULT '{}'::jsonb;

-- ------------------------------------------------------------------------------
-- 12. ตาราง quotations (ระบบใบเสนอราคา S-Gyver Quotation Studio)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quotations (
    doc_no TEXT PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    status TEXT DEFAULT 'DRAFT', -- DRAFT, SENT, APPROVED, REJECTED
    project_title TEXT,
    client_name TEXT,
    client_data JSONB DEFAULT '{}'::jsonb,
    seller_data JSONB DEFAULT '{}'::jsonb,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12, 2) DEFAULT 0,
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    vat_amount NUMERIC(12, 2) DEFAULT 0,
    wht_amount NUMERIC(12, 2) DEFAULT 0,
    grand_total NUMERIC(12, 2) DEFAULT 0,
    baht_text TEXT,
    payment_terms TEXT,
    bank_account TEXT,
    notes TEXT,
    seller_sign_name TEXT,
    client_sign_name TEXT,
    client_sign_date DATE,
    client_signature_img TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to quotations" ON public.quotations;
CREATE POLICY "Allow all access to quotations" ON public.quotations
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 13. ตาราง product_labels (ระบบจัดการและพิมพ์ฉลากสินค้าเสื้อผ้า - VIP Lv.4)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_labels (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    variant TEXT,
    price NUMERIC(10, 2),
    stock_quantity INT DEFAULT 0,
    min_stock_alert INT DEFAULT 5,
    warehouse_location TEXT DEFAULT 'A-1',
    distributor TEXT,
    care_instructions TEXT,
    barcode_type TEXT DEFAULT 'CODE128',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ปรับปรุงคอลัมน์สต็อกอัตโนมัติหากมีตารางเดิมอยู่แล้ว
ALTER TABLE public.product_labels ADD COLUMN IF NOT EXISTS stock_quantity INT DEFAULT 0;
ALTER TABLE public.product_labels ADD COLUMN IF NOT EXISTS min_stock_alert INT DEFAULT 5;
ALTER TABLE public.product_labels ADD COLUMN IF NOT EXISTS warehouse_location TEXT DEFAULT 'A-1';

-- เพิ่มฟิลด์ฉลากเสื้อผ้ามาตรฐาน สคบ. (แบรนด์, ประเภทสินค้า, วิธีใช้, ผู้ผลิต, ที่อยู่ผู้จัดจำหน่าย, ข้อความราคา)
ALTER TABLE public.product_labels ADD COLUMN IF NOT EXISTS brand TEXT DEFAULT 'Paperstudio (เปเปอร์สตูดิโอ)';
ALTER TABLE public.product_labels ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'เสื้อผ้าแฟชั่น';
ALTER TABLE public.product_labels ADD COLUMN IF NOT EXISTS usage_info TEXT DEFAULT 'สำหรับสวมใส่';
ALTER TABLE public.product_labels ADD COLUMN IF NOT EXISTS manufacturer TEXT DEFAULT 'ประเทศจีน';
ALTER TABLE public.product_labels ADD COLUMN IF NOT EXISTS distributor_address TEXT;
ALTER TABLE public.product_labels ADD COLUMN IF NOT EXISTS price_text TEXT DEFAULT 'ระบุ ณ จุดขาย';
ALTER TABLE public.product_labels ADD COLUMN IF NOT EXISTS image_url TEXT;

-- สร้าง Unique Index บนคอลัมน์ sku เพื่อให้ทำ Upsert ได้รวดเร็วและไม่ซ้ำซ้อน
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_labels_sku ON public.product_labels (sku);

-- เปิด Row Level Security (RLS) และอนุญาตให้เข้าถึงได้ทั้ง anon และ authenticated
ALTER TABLE public.product_labels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to product_labels" ON public.product_labels;
CREATE POLICY "Allow all access to product_labels" ON public.product_labels
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ตารางประวัติการเคลื่อนไหวสต็อก (Stock Transactions Log: รับเข้า / เบิกออก / ปรับยอด)
CREATE TABLE IF NOT EXISTS public.stock_transactions (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    product_id BIGINT REFERENCES public.product_labels(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    type TEXT NOT NULL, -- 'IN' (รับเข้า), 'OUT' (ตัดจ่าย/ขาย), 'ADJUST' (ปรับยอด)
    quantity INT NOT NULL,
    balance_after INT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to stock_transactions" ON public.stock_transactions;
CREATE POLICY "Allow all access to stock_transactions" ON public.stock_transactions
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- เพิ่ม product_labels และ stock_transactions เข้าสู่ Realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'product_labels'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.product_labels;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'stock_transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_transactions;
    END IF;
END $$;

-- ข้อมูลตัวอย่างสำหรับทดสอบระบบพิมพ์ฉลากและสต็อกเสื้อผ้า
INSERT INTO public.product_labels (sku, name, variant, price, stock_quantity, min_stock_alert, warehouse_location, distributor, care_instructions)
VALUES
    ('TSH-WHT-M', 'เสื้อยืดคอกลม Premium Cotton 100%', 'สีขาว / Size M', 290.00, 48, 10, 'A-01', 'บริษัท ซิกเนเจอร์ แอพพาเรล จำกัด', 'ซักเครื่องด้วยน้ำเย็น ห้ามใช้น้ำยาฟอกขาว รีดด้วยไฟปานกลาง'),
    ('TSH-BLK-L', 'เสื้อยืดคอกลม Premium Cotton 100%', 'สีดำ / Size L', 290.00, 3, 5, 'A-02', 'บริษัท ซิกเนเจอร์ แอพพาเรล จำกัด', 'ซักเครื่องด้วยน้ำเย็น ห้ามใช้น้ำยาฟอกขาว รีดด้วยไฟปานกลาง'),
    ('POLO-NVY-XL', 'เสื้อโปโล Classic Dry-Tech', 'สีกรมท่า / Size XL', 450.00, 25, 8, 'B-04', 'บริษัท สยามการ์เม้นท์ เทรดดิ้ง จำกัด', 'แยกซักผ้าสีเข้ม ปั่นแห้งรอบต่ำ ห้ามซักแห้ง'),
    ('HD-GRY-F', 'เสื้อฮู้ดดี้ Oversized Fleece', 'สีเทาท็อปดราย / Free Size', 790.00, 14, 5, 'C-02', 'สตูดิโอ แฟชั่น ซัพพลาย', 'ซักมือหรือใส่ถุงซัก ตากในที่ร่ม ห้ามรีดทับลายพิมพ์')
ON CONFLICT (sku) DO UPDATE SET
    stock_quantity = EXCLUDED.stock_quantity,
    min_stock_alert = EXCLUDED.min_stock_alert,
    warehouse_location = EXCLUDED.warehouse_location;






