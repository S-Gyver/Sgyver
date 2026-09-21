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
END $$;

