const SUPABASE_URL = 'https://igiihteeeprpcxxlldkd.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnaWlodGVlZXBycGN4eGxsZGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5ODkwNzksImV4cCI6MjEwMDU2NTA3OX0.fr8_ZAYKQ3D-JgEtAWGJnNvKjoUmYxs1T7tjzzsEltw';       

// ประกาศเป็นตัวแปร window เพื่อให้ทุกไฟล์ดึงไปใช้ได้ทันที
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);