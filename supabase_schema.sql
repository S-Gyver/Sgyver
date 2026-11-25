-- ==============================================================================
-- 🚀 S-Gyver All-in-One Personal Workspace - Complete Supabase Database Schema
-- ==============================================================================
-- คำแนะนำการใช้งาน:
-- 1. เข้าสู่ระบบ Supabase Dashboard (https://supabase.com/dashboard)
-- 2. เลือกโปรเจกต์ "My_workspace" -> ไปที่เมนู "SQL Editor" ด้านซ้าย
-- 3. คลิก "New query" แล้ววางโค้ดทั้งหมดในไฟล์นี้ลงไป จากนั้นกดปุ่ม "Run"
-- ==============================================================================

-- ==============================================================================
-- 📦 หมวดที่ 1: ระบบสมาชิก โปรไฟล์ และการซิงก์หน้ากระดานหลัก (Core Auth & Workspace)
-- ==============================================================================

-- 1.1 ตาราง profiles (ข้อมูลผู้ใช้ สิทธิ์การใช้งาน Lv.1-Lv.5 และบทบาท admin/member)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT,
    username TEXT,
    nickname TEXT,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'member',
    level INT DEFAULT 1,
    xp INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to profiles" ON public.profiles;
CREATE POLICY "Allow all access to profiles" ON public.profiles
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Trigger สร้างแถวใน public.profiles อัตโนมัติเมื่อมีการสมัครสมาชิกใหม่ผ่าน Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, nickname, role, level, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'nickname', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        CASE WHEN lower(COALESCE(NEW.raw_user_meta_data->>'username', '')) IN ('admin', 'sd') THEN 'admin' ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'member') END,
        CASE WHEN lower(COALESCE(NEW.raw_user_meta_data->>'username', '')) IN ('admin', 'sd') THEN 5 ELSE COALESCE((NEW.raw_user_meta_data->>'level')::int, 1) END,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://cdn-icons-png.flaticon.com/512/149/149071.png')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 1.2 ตาราง game_state (เก็บสถานะกระดาน Wallpaper, Dock, วงล้อสุ่ม และ Teacher Cloud Drive)
CREATE TABLE IF NOT EXISTS public.game_state (
    id BIGSERIAL PRIMARY KEY,
    key TEXT NOT NULL,
    user_id TEXT NOT NULL,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (key, user_id)
);

ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to game_state" ON public.game_state;
CREATE POLICY "Allow all access to game_state" ON public.game_state
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 1.3 ตาราง activity_logs (ประวัติการเข้าร่วมห้องเรียนและคะแนนกิจกรรม)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT,
    activity_type TEXT,
    description TEXT,
    score_change NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to activity_logs" ON public.activity_logs;
CREATE POLICY "Allow all access to activity_logs" ON public.activity_logs
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- 🎓 หมวดที่ 2: ระบบห้องเรียนและเครื่องมือช่วยสอน (Education & Classroom)
-- ==============================================================================

-- 2.1 ตาราง classrooms (ห้องเรียนของฉัน เช็คชื่อ สื่อการสอน ส่งงาน และสมุดพก ปพ.5)
CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id TEXT,
    class_name TEXT NOT NULL,
    room_code TEXT,
    students JSONB DEFAULT '[]'::jsonb,
    players JSONB DEFAULT '[]'::jsonb,
    attendance_logs JSONB DEFAULT '{}'::jsonb,
    attendance_criteria JSONB DEFAULT '{}'::jsonb,
    materials JSONB DEFAULT '[]'::jsonb,
    assignments JSONB DEFAULT '[]'::jsonb,
    gradebook JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to classrooms" ON public.classrooms;
CREATE POLICY "Allow all access to classrooms" ON public.classrooms
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2.2 ตาราง quiz_subjects (คลังข้อสอบแยกตามรายวิชา สำหรับวงล้อสุ่ม & Gyver AI)
CREATE TABLE IF NOT EXISTS public.quiz_subjects (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    subject_key TEXT NOT NULL,
    questions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (subject_key, user_id)
);

ALTER TABLE public.quiz_subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to quiz_subjects" ON public.quiz_subjects;
CREATE POLICY "Allow all access to quiz_subjects" ON public.quiz_subjects
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2.3 ตาราง game_problems (คลังโจทย์พิมพ์โค้ด Gyver Code Race)
CREATE TABLE IF NOT EXISTS public.game_problems (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    starter_code TEXT NOT NULL,
    game_mode TEXT DEFAULT 'typing',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.game_problems ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to game_problems" ON public.game_problems;
CREATE POLICY "Allow all access to game_problems" ON public.game_problems
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2.4 ตาราง lobbies (ห้องสอบสด Gyver Quiz Live Lobby & Gyver Code Race)
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

ALTER TABLE public.lobbies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to lobbies" ON public.lobbies;
CREATE POLICY "Allow all access to lobbies" ON public.lobbies
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2.5 ตาราง gyver_quizzes (คลังชุดแบบทดสอบ Gyver Quiz)
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
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2.6 ตาราง gyver_quiz_responses (บันทึกผลการทำข้อสอบรายบุคคล)
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
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2.7 ตาราง gyver_forms & gyver_form_responses (ระบบสร้างแบบฟอร์มและประกาศ)
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
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

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
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2.8 ตารางระบบห้องเรียนสด (Gyver Live Studio)
CREATE TABLE IF NOT EXISTS public.live_studio_rooms (
    pin TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    host_name TEXT NOT NULL,
    host_secret TEXT,
    status TEXT DEFAULT 'LIVE',
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.live_studio_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to live_studio_rooms" ON public.live_studio_rooms;
CREATE POLICY "Allow all access to live_studio_rooms" ON public.live_studio_rooms
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

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
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

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
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- 🏢 หมวดที่ 3: ระบบงานธุรกิจ ใบเสนอราคา คลังสินค้า ไม้สั่งซื้อ และ Shopee (Business)
-- ==============================================================================

-- 3.1 ตาราง quotations (ระบบใบเสนอราคา S-Gyver Quotation Studio)
CREATE TABLE IF NOT EXISTS public.quotations (
    doc_no TEXT PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    status TEXT DEFAULT 'DRAFT',
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
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3.2 ตาราง sgyver_materials & sgyver_material_orders (ระบบคำนวณและสั่งซื้อไม้)
CREATE TABLE IF NOT EXISTS public.sgyver_materials (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sgyver_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to sgyver_materials" ON public.sgyver_materials;
CREATE POLICY "Allow all access to sgyver_materials" ON public.sgyver_materials
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.sgyver_material_orders (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    order_number TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_sheets INT DEFAULT 0,
    grand_total NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sgyver_material_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to sgyver_material_orders" ON public.sgyver_material_orders;
CREATE POLICY "Allow all access to sgyver_material_orders" ON public.sgyver_material_orders
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3.3 ตาราง product_labels, product_categories & stock_transactions (คลังสินค้าและพิมพ์ฉลาก)
CREATE TABLE IF NOT EXISTS public.product_labels (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    parent_sku TEXT,
    name TEXT NOT NULL,
    variant TEXT,
    category TEXT,
    price NUMERIC(10, 2) DEFAULT 0,
    stock_quantity INT DEFAULT 0,
    min_stock_alert INT DEFAULT 5,
    warehouse_location TEXT DEFAULT 'A-1',
    distributor TEXT,
    care_instructions TEXT,
    barcode_type TEXT DEFAULT 'CODE128',
    brand TEXT DEFAULT 'Paperstudio (เปเปอร์สตูดิโอ)',
    product_type TEXT DEFAULT 'เสื้อผ้าแฟชั่น',
    usage_info TEXT DEFAULT 'สำหรับสวมใส่',
    manufacturer TEXT DEFAULT 'ประเทศจีน',
    distributor_address TEXT,
    price_text TEXT DEFAULT 'ระบุ ณ จุดขาย',
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_labels_sku ON public.product_labels (sku);
ALTER TABLE public.product_labels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to product_labels" ON public.product_labels;
CREATE POLICY "Allow all access to product_labels" ON public.product_labels
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.product_categories (
    id TEXT PRIMARY KEY,
    tree JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to product_categories" ON public.product_categories;
CREATE POLICY "Allow all access to product_categories" ON public.product_categories
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.stock_transactions (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    product_id BIGINT REFERENCES public.product_labels(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity INT NOT NULL,
    balance_after INT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to stock_transactions" ON public.stock_transactions;
CREATE POLICY "Allow all access to stock_transactions" ON public.stock_transactions
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3.4 ตาราง ecommerce_orders (ระบบจัดการออเดอร์และใบปะหน้า Shopee / BigSeller)
CREATE TABLE IF NOT EXISTS public.ecommerce_orders (
    order_id TEXT PRIMARY KEY,
    platform TEXT DEFAULT 'Shopee',
    shop_name TEXT,
    recipient_name TEXT,
    phone TEXT,
    address TEXT,
    province TEXT,
    district TEXT,
    zipcode TEXT,
    carrier TEXT DEFAULT 'Standard Delivery',
    tracking_number TEXT,
    total_items INT DEFAULT 1,
    total_amount NUMERIC(12, 2) DEFAULT 0,
    payment_method TEXT DEFAULT 'Prepaid',
    image_url TEXT,
    status TEXT DEFAULT 'READY_TO_SHIP',
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ecommerce_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to ecommerce_orders" ON public.ecommerce_orders;
CREATE POLICY "Allow all access to ecommerce_orders" ON public.ecommerce_orders
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- ⚡ หมวดที่ 4: เปิดใช้งาน Supabase Realtime และ Storage Bucket (avatars)
-- ==============================================================================

DO $$
DECLARE
    tbl TEXT;
    realtime_tables TEXT[] := ARRAY[
        'classrooms',
        'lobbies',
        'gyver_quiz_responses',
        'live_studio_rooms',
        'live_studio_messages',
        'live_studio_files',
        'product_labels',
        'stock_transactions',
        'ecommerce_orders',
        'sgyver_materials',
        'sgyver_material_orders'
    ];
BEGIN
    FOREACH tbl IN ARRAY realtime_tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        END IF;
    END LOOP;
END $$;

-- สร้าง Storage Bucket สำหรับเก็บอวตาร (avatars)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access to avatars" ON storage.objects;
CREATE POLICY "Public Access to avatars" ON storage.objects
    FOR ALL TO anon, authenticated
    USING (bucket_id = 'avatars')
    WITH CHECK (bucket_id = 'avatars');
