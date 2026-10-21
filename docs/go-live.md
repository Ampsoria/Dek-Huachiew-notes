# คู่มือเปิดใช้ Dek Huachiew Notes จริง

คู่มือนี้แยก **เว็บตัวอย่างบน GitHub Pages** ออกจาก **ระบบที่รับสมาชิกและเอกสารจริง** เพื่อให้เปิดดูหน้าตาเว็บได้ก่อน แล้วค่อยต่อบริการทีละส่วน

## 1. เปิดเว็บตัวอย่างบน GitHub Pages

รีโปนี้มี workflow ใน `.github/workflows/pages.yml` อยู่แล้ว หลัง push โค้ดขึ้น GitHub ให้เข้ารีโป `Ampsoria/Dek-Huachiew-notes` → **Settings → Pages → Build and deployment → Source: GitHub Actions** จากนั้นรอ workflow **Deploy to GitHub Pages** ในแท็บ Actions ให้สำเร็จ ถ้าครั้งแรกยังไม่รัน ให้กด **Run workflow** ในหน้า workflow

หน้าเว็บจะอยู่ที่ <https://Ampsoria.github.io/Dek-Huachiew-notes/> และปุ่มใน README จะพามาที่นี่ การ build สำหรับ Pages ตั้ง base path ของ Vite เป็น `/Dek-Huachiew-notes/` และมี `404.html` สำหรับเปิดลิงก์หน้าภายในเว็บโดยตรง

ช่วงนี้ลองสารบัญ GE/คณะ/สาขา ค้นหารหัสวิชา และดู layout บนมือถือ/iPad/คอมได้ ระบบสมาชิกยังไม่ทำงานหากยังไม่ตั้งค่า Supabase

## 2. สร้าง Supabase project และตั้งค่าฐานข้อมูล

1. สร้างโปรเจกต์ใน [Supabase Dashboard](https://supabase.com/dashboard) โดยเริ่มจากแผน Free ได้ จด **Project URL** และ **publishable/anon key** จากหน้า API Keys
2. เปิด **SQL Editor** และรัน migration ในโฟลเดอร์ `supabase/migrations/` ตามลำดับชื่อไฟล์: `202610210001_initial.sql` → `202610210002_policy_acceptance.sql` → `202610210003_dek_huachiew_policy_version.sql` → `202610210004_reviews.sql` → `202610210005_free_upload_limits.sql` → `202610210006_goodnotes_file_limit.sql` อย่าข้ามไฟล์หรือสลับลำดับ
3. ตรวจข้อมูลใน [สารบัญรายวิชา](../hcu-course-catalog.md) กับข้อมูลหลักสูตรที่ถูกต้องก่อนนำเข้า เพราะชุดนี้มาจาก Moodle และยังไม่รับรองอย่างเป็นทางการ จากนั้นรัน `npm run catalog` และ `node scripts/build-seed.mjs` แล้วนำ `supabase/seed.sql` ไปรันใน SQL Editor
4. ตรวจใน Dashboard ว่ามีตาราง คณะ สาขา วิชา โปรไฟล์ เอกสาร รีวิว Fav และ bucket `documents` แล้ว ตรวจ RLS/Storage policies ตาม migration ก่อนเปิดรับผู้ใช้จริง

โค้ดและ migration กำหนดไฟล์ PDF/รูป **ไม่เกิน 50 MB ต่อไฟล์**, **5 ไฟล์ต่อบัญชี**, **50 ไฟล์ทั้งเว็บ** และหยุดรับไฟล์ใหม่เมื่อขนาด Storage ที่นับได้ถึง **750 MB** ให้ตรวจ **Storage → Settings → Global file size limit** ว่าไม่ต่ำกว่า 50 MB เพดานอัปโหลดไม่จำกัดปริมาณการเปิดอ่าน/ดาวน์โหลด จึงต้องดู Egress ในหน้า Usage ด้วย

## 3. เปิด Google login

1. ใน Google Cloud สร้าง/เลือกโปรเจกต์ ตั้งค่า OAuth consent screen และสร้าง **OAuth client แบบ Web application** ตาม [คู่มือ Google login ของ Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google)
2. ในช่อง **Authorized redirect URIs** ของ Google ให้ใช้ callback URL ที่ Supabase แสดงในหน้า **Authentication → Providers → Google** ของโปรเจกต์นั้น อย่าใช้ URL `github.io` เป็น Google callback
3. นำ Google **Client ID** และ **Client Secret** ไปใส่ในหน้า Google provider ของ Supabase แล้วเปิด provider; ห้ามใส่ Client Secret ใน GitHub repository หรือ Vite env
4. ใน Supabase **Authentication → URL Configuration** ตั้ง Site URL เป็น URL เว็บที่ใช้งานจริง และเพิ่ม Redirect URLs สำหรับ `http://localhost:5173/auth/callback` กับ `https://Ampsoria.github.io/Dek-Huachiew-notes/auth/callback` หากใช้ GitHub Pages สำหรับระบบจริง หากย้ายโดเมน ให้เพิ่ม callback ของโดเมนนั้นด้วย

การสมัครใช้บัญชี Google ทุกโดเมนอีเมลได้ ตามนโยบายของโปรเจกต์ ผู้ใช้ต้องยอมรับข้อกำหนดและตั้ง username ก่อนใช้ฟีเจอร์สมาชิก

## 4. เชื่อม frontend กับ Supabase

สำหรับพัฒนาในเครื่อง ให้คัดลอก `.env.example` เป็น `.env.local` แล้วกรอก:

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-or-anon-key>
```

ไฟล์ `.env.local` ถูก ignore โดย Git แล้ว **ห้ามใส่ service role key หรือ Google Client Secret** ลงไฟล์ที่ขึ้นต้น `VITE_` เพราะค่าจะอยู่ใน JavaScript ที่ผู้เยี่ยมชมดาวน์โหลดได้

สำหรับ GitHub Pages ให้ตั้งค่ารีโปที่ **Settings → Secrets and variables → Actions → Variables** ชื่อ `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` จากนั้นรัน workflow ใหม่ ค่าเหล่านี้เป็นคีย์ฝั่ง browser เท่านั้น; การป้องกันข้อมูลจริงอยู่ที่ RLS และ Storage policies ใน Supabase หลังเชื่อมแล้ว Pages จะเป็น frontend ที่ใช้ระบบจริง แทน mockup แบบไม่มี backend

ถ้าจะย้าย frontend ไป Cloudflare Pages ให้เชื่อม GitHub repo, ตั้ง build command เป็น `npm run build`, output directory เป็น `dist`, เพิ่ม environment variables สองตัวข้างต้น และเพิ่ม URL ใหม่ใน Supabase Redirect URLs โค้ดจะใช้ base path `/` สำหรับโฮสต์นี้ ดู [Cloudflare Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/) และเก็บ `public/_redirects` สำหรับ route ภายในแอป

## 5. ตรวจระบบก่อนเปิดให้คนทั่วไปใช้

- รัน `npm run check` และ `npm run build`; ตรวจ workflow Pages สำเร็จและเปิด URL จาก README ได้ทั้งหน้าแรกและลิงก์ตรงไปยังหน้ารายวิชา
- ทดสอบ Google login → ยอมรับข้อกำหนด → ตั้ง username → อัปโหลด PDF/รูปที่สร้างเอง → เปิดอ่าน → Fav → รีวิวด้วยบัญชีอีกบัญชี ตรวจว่าให้ดาวงานตัวเอง/แก้รีวิวคนอื่น/ข้ามขั้นยอมรับผ่าน API ไม่ได้
- ทดสอบไฟล์เล็กและไฟล์ใกล้ 50 MB บนมือถือหรือ iPad ด้วยอินเทอร์เน็ตจริง รวมถึงการอัปโหลดล้มเหลวและลองใหม่; โค้ดอัปโหลดไฟล์ใหญ่ผ่าน TUS แบบแบ่งชิ้น
- ตรวจข้อมูลวิชา คณะ สาขา และ GE ให้ถูกต้องก่อนเปิดใช้จริง; อย่าแสดงชุดข้อมูลที่ยังไม่ตรวจสอบเป็นทะเบียนทางการ
- ใส่ช่องทางติดต่อผู้ดูแลจริง วิธีรายงาน/ลบไฟล์ละเมิด วิธีลบบัญชีหรือข้อมูลส่วนตัว และข้อความนโยบายที่สมบูรณ์ก่อนรับผู้ใช้จริง กำหนดผู้รับผิดชอบการรับเรื่องและทดสอบขั้นตอนนำไฟล์ลง
- ติดตาม Storage และ Egress ใน Supabase Usage อย่างสม่ำเสมอ สำรองข้อมูลก่อนเปลี่ยน schema; ถ้าต้องแก้เงื่อนไขฐานข้อมูล ให้สร้าง migration ใหม่แทนการแก้ไฟล์ที่เคยรันแล้ว

รายละเอียดข้อกำหนด การแสดงโปรไฟล์ และแผนฟีเจอร์ที่ยังไม่สร้างอยู่ใน [project brief](../campus-notes-project-brief.md) ส่วนข้อความนโยบายที่แสดงจริงอยู่ใน [`PolicyContent.tsx`](../src/components/PolicyContent.tsx)

## เครดิตและสิทธิ์

สร้างโดย **Gorrawit Puttabarramee** © 2026 ซอร์สโค้ดและงานต้นฉบับของโปรเจกต์อยู่ภายใต้ [MIT License](../LICENSE) ชื่อ/เครื่องหมายของมหาวิทยาลัย ข้อมูลจากภายนอก และเอกสารของผู้ใช้อยู่ภายใต้สิทธิ์ของเจ้าของแต่ละราย เว็บนี้ไม่ใช่บริการทางการของมหาวิทยาลัย
