import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bookmark, BookOpen, Check, ChevronRight, Compass, FileText, Heart, LogIn, Search, ShieldCheck, Sparkles, UploadCloud, UserRound } from 'lucide-react';
import { FacultyIcon, GeneralEducationIcon, ProgramIcon } from './components/StudyIcons';
import { PolicyContent } from './components/PolicyContent';
import { ReviewsSection, ReviewScore, useProfileReviewSummary, useReviewSummaries, type ReviewSummary } from './components/Reviews';
import { branchesInFaculty, coursePath, coursesInFaculty, displayBranch, faculties, geCourses, getCourse, searchCourses, type Course } from './lib/catalog';
import { useAuth } from './lib/auth';
import { isSupabaseConfigured, kindLabels, supabase, type DocumentRecord } from './lib/supabase';
import { POLICY_VERSION, safeNextPath } from './lib/policy';
import { uploadDocumentFile } from './lib/uploadDocument';

const courseUrl = (course: Course) => `/course/${encodeURIComponent(course.code)}`;
const facultyUrl = (faculty: string) => `/faculty/${encodeURIComponent(faculty)}`;
const branchUrl = (faculty: string, branch: string) => `/faculty/${encodeURIComponent(faculty)}/branch/${encodeURIComponent(branch)}`;
const MAX_UPLOAD_FILE_BYTES = 50_000_000;

function Logo() {
  return <Link to="/" className="logo" aria-label="Dek Huachiew Notes หน้าแรก"><img className="logo-image" src={`${import.meta.env.BASE_URL}dek-huachiew-notes-logo.svg`} alt="" width="372" height="72" /></Link>;
}

function Header() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const navClass = ({ isActive }: { isActive: boolean }) => isActive ? 'nav-link active' : 'nav-link';
  const nav = <>
    <NavLink to="/catalog" className={navClass}><Compass size={18} /> <span>สารบัญวิชา</span></NavLink>
    <NavLink to="/search" className={navClass}><Search size={18} /> <span>ค้นหา</span></NavLink>
    <NavLink to="/me/favorites" className={navClass}><Bookmark size={18} /> <span>รายการโปรด</span></NavLink>
  </>;
  return <header className="site-header"><div className="header-inner container">
    <Logo /><nav className="desktop-nav" aria-label="เมนูหลัก">{nav}</nav>
    <div className="header-actions">
      {user ? <button className="avatar-button" onClick={() => navigate(profile ? '/me' : '/onboarding')} aria-label="พื้นที่ของฉัน">{profile?.display_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}</button> : <Link to="/login" className="button button-small button-dark">เข้าสู่ระบบ <ArrowRight size={16} /></Link>}
    </div>
  </div><nav className="mobile-top-nav" aria-label="เมนูหลักบนมือถือ">{nav}{user ? <NavLink to={profile ? '/me' : '/onboarding'} className={navClass}><UserRound size={18} /> <span>พื้นที่ของฉัน</span></NavLink> : <NavLink to="/login" className={navClass}><LogIn size={18} /> <span>เข้าสู่ระบบ</span></NavLink>}</nav></header>;
}

function Footer() {
  return <footer className="site-footer"><div className="container footer-inner"><Logo /><p>พื้นที่แบ่งปันสรุปและสไลด์ที่สร้างเอง · โปรเจกต์อิสระ ไม่ใช่เว็บไซต์ทางการหรือโครงการของมหาวิทยาลัย<br /><Link to="/policy">ข้อกำหนดการใช้งานและข้อมูลส่วนตัว</Link></p><span>Made for better study days ✦</span></div></footer>;
}

function SelfCreatedNotice() {
  return <div className="creator-notice"><ShieldCheck size={23} /><p><strong>แบ่งปันเฉพาะงานที่คุณเขียนหรือทำสไลด์เอง</strong><br />ห้ามอัปโหลดสไลด์อาจารย์ สไลด์มหาวิทยาลัย หรือไฟล์จาก HCU e-learning แม้ได้รับไฟล์มาเพื่อใช้เรียน <Link to="/policy">อ่านกติกาฉบับเต็ม</Link></p></div>;
}

function SearchBox({ large = false, initial = '' }: { large?: boolean; initial?: string }) {
  const [value, setValue] = useState(initial);
  const navigate = useNavigate();
  useEffect(() => setValue(initial), [initial]);
  function submit(event: FormEvent) { event.preventDefault(); if (value.trim()) navigate(`/search?q=${encodeURIComponent(value.trim())}`); }
  return <form className={`search-box ${large ? 'search-box-large' : ''}`} onSubmit={submit} role="search"><Search size={large ? 23 : 19} /><input aria-label="ค้นหารหัสหรือชื่อวิชา" placeholder="ลองค้นหารหัสวิชา เช่น GE1162 หรือชื่อวิชา..." value={value} onChange={(event) => setValue(event.target.value)} /><button type="submit">ค้นหา <ArrowRight size={17} /></button></form>;
}

function CourseCard({ course }: { course: Course }) {
  return <Link to={courseUrl(course)} className="course-card"><div className="course-card-top"><span className={`code-pill ${course.isGE ? 'code-pill-ge' : ''}`}>{course.code}</span><ArrowRight size={19} /></div><h3>{course.title}</h3><p>{coursePath(course)}</p></Link>;
}

function PageHead({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <div className="page-head"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>;
}

function Home() {
  const featured = ['GE1162', 'GE1043', 'GE1053', 'GE2212'].map(getCourse).filter((course): course is Course => Boolean(course));
  return <>
    <section className="hero"><div className="container hero-grid"><div className="hero-content"><span className="hero-badge"><Sparkles size={15} /> พื้นที่แบ่งปันของชาวหัวเฉียว</span><h1>เรียนด้วยกัน<br /><em>เข้าใจได้ไกลกว่า.</em></h1><p>ค้นหารายวิชาของมหาวิทยาลัยหัวเฉียวเฉลิมพระเกียรติ แล้วเจอสรุป สไลด์ และเอกสารที่ช่วยให้ทุกบทเรียนง่ายขึ้นในที่เดียว</p><SearchBox large /><div className="hero-suggest">ลองค้นหา <Link to="/search?q=GE1162">GE1162</Link><Link to="/search?q=NG">NG</Link><Link to="/search?q=ภาษาอังกฤษ">ภาษาอังกฤษ</Link></div></div></div></section>
    <section className="section container"><div className="section-heading"><div><span className="eyebrow">START EXPLORING</span><h2>เริ่มจากวิชาที่ใช่</h2><p>เลือกดูตามหมวด หรือพิมพ์รหัสวิชาเพื่อไปถึงสิ่งที่ต้องการทันที</p></div><Link className="text-link" to="/catalog">ดูสารบัญทั้งหมด <ArrowRight size={18} /></Link></div><div className="entry-grid"><Link to="/catalog/ge" className="entry-card entry-ge"><span className="entry-icon"><GeneralEducationIcon /></span><div><small>หมวดเรียนร่วม</small><h3>วิชา GE</h3><p>{geCourses.length} วิชาในหมวดกลาง</p></div><ArrowRight className="entry-arrow" size={20} /></Link><Link to="/catalog" className="entry-card entry-faculty"><span className="entry-icon"><FacultyIcon /></span><div><small>ค้นตามคณะ</small><h3>คณะและสาขา</h3><p>{faculties.length} คณะ/วิทยาลัย</p></div><ArrowRight className="entry-arrow" size={20} /></Link></div><SelfCreatedNotice /></section>
    <section className="section section-soft"><div className="container"><div className="section-heading"><div><span className="eyebrow">QUICK ACCESS</span><h2>วิชาที่ลองเปิดดูได้</h2><p>เริ่มค้นจากรหัสและชื่อวิชาในสารบัญตั้งต้น</p></div></div><div className="cards-grid">{featured.map((course) => <CourseCard key={course.code} course={course} />)}</div><p className="catalog-note"><ShieldCheck size={17} /> ชื่อวิชาและหมวดมาจาก HCU e-learning เพื่อใช้เป็นข้อมูลตั้งต้น ยังต้องตรวจเทียบหลักสูตรทางการ</p></div></section>
  </>;
}

function Catalog() {
  return <main className="container page"><PageHead eyebrow="COURSE DIRECTORY" title="สารบัญรายวิชา" description="สำรวจจาก GE หรือไล่ตามคณะและสาขา ทุกวิชาเปิดไปหน้ารายวิชาเดียวกัน" /><SearchBox /><div className="catalog-layout"><div className="catalog-intro"><span className="tiny-label">เลือกทางเข้าของคุณ</span><h2>จากหมวดใหญ่<br />ไปถึงวิชาที่เรียน</h2><p>ข้อมูลรายวิชาชุดนี้รวบรวมจากห้องเรียนใน HCU e-learning และยังอยู่ระหว่างตรวจความถูกต้อง</p></div><div className="directory-list"><Link to="/catalog/ge" className="directory-row ge-row"><span className="directory-icon"><GeneralEducationIcon size={28} /></span><span><strong>GE · วิชาศึกษาทั่วไป</strong><small>{geCourses.length} วิชาเรียนร่วม</small></span><ChevronRight size={21} /></Link>{faculties.map((faculty) => { const count = coursesInFaculty(faculty).length; return <Link to={facultyUrl(faculty)} className="directory-row" key={faculty}><span className="directory-icon"><FacultyIcon size={28} /></span><span><strong>{faculty}</strong><small>{count} รายวิชาที่พบ</small></span><ChevronRight size={21} /></Link>; })}</div></div></main>;
}

function GEPage() {
  return <main className="container page"><Breadcrumb items={[['สารบัญรายวิชา', '/catalog']]} current="วิชา GE" /><PageHead eyebrow="GENERAL EDUCATION" title="วิชาศึกษาทั่วไป" description="วิชาเรียนร่วมที่เปิดจากหมวดกลางแห่งเดียว" /><div className="cards-grid">{geCourses.map((course) => <CourseCard key={course.code} course={course} />)}</div></main>;
}

function Breadcrumb({ items, current }: { items: [string, string][]; current: string }) {
  return <nav className="breadcrumb" aria-label="ลำดับหน้า"><Link to="/">หน้าแรก</Link>{items.map(([label, to]) => <span key={to}><ChevronRight size={15} /><Link to={to}>{label}</Link></span>)}<span><ChevronRight size={15} /><b>{current}</b></span></nav>;
}

function FacultyPage() {
  const { faculty = '', branch } = useParams();
  const facultyName = decodeURIComponent(faculty);
  const branchName = branch ? decodeURIComponent(branch) : undefined;
  const [showAll, setShowAll] = useState(false);
  const listed = useMemo(() => coursesInFaculty(facultyName, branchName), [facultyName, branchName]);
  const branches = branchesInFaculty(facultyName);
  if (!faculties.includes(facultyName)) return <NotFound />;
  const displayed = branchName || showAll ? listed : listed.slice(0, 36);
  return <main className="container page"><Breadcrumb items={branchName ? [['สารบัญรายวิชา', '/catalog'], [facultyName, facultyUrl(facultyName)]] : [['สารบัญรายวิชา', '/catalog']]} current={branchName ? displayBranch(branchName) : facultyName} /><PageHead eyebrow={branchName ? 'PROGRAM / CATEGORY' : 'FACULTY'} title={branchName ? displayBranch(branchName) : facultyName} description={branchName ? `${listed.length} รายวิชาที่พบในหมวดนี้` : 'เลือกสาขา/หมวดวิชา หรือดูรายวิชาทั้งหมดที่พบในคณะนี้'} />{!branchName && <div className="branch-grid">{branches.map((name) => <Link className="branch-card" to={branchUrl(facultyName, name)} key={name}><span><ProgramIcon size={24} /></span><strong>{displayBranch(name)}</strong><ChevronRight size={19} /></Link>)}</div>}<div className="section-heading inner-heading"><div><h2>{branchName ? 'รายวิชาในหมวดนี้' : 'รายวิชาทั้งหมด'}</h2><p>รหัสวิชาและชื่อวิชาที่พบใน HCU e-learning</p></div></div><div className="cards-grid">{displayed.map((course) => <CourseCard key={course.code} course={course} />)}</div>{!branchName && listed.length > displayed.length && <button className="button button-outline show-more" onClick={() => setShowAll(true)}>แสดงวิชาทั้งหมด {listed.length} วิชา <ChevronRight size={17} /></button>}</main>;
}

function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q') || '';
  const results = useMemo(() => searchCourses(query, 100), [query]);
  return <main className="container page"><PageHead eyebrow="FIND YOUR COURSE" title="ค้นหารายวิชา" description="ค้นจากรหัสหรือชื่อวิชา โดยรหัสที่ตรงจะแสดงก่อน" /><SearchBox large initial={query} />{query ? <><div className="results-bar"><strong>ผลการค้นหา “{query}”</strong><span>{results.length === 100 ? '100+ รายการ' : `${results.length} รายการ`}</span></div>{results.length ? <div className="cards-grid">{results.map((course) => <CourseCard key={course.code} course={course} />)}</div> : <EmptyState title="ยังไม่พบวิชานี้" detail="ลองตรวจรหัสอีกครั้ง หรือเปิดสารบัญเพื่อไล่ดูตามคณะ" action={<Link className="button button-dark" to="/catalog">เปิดสารบัญ <ArrowRight size={17} /></Link>} />}</> : <div className="search-prompt"><Search size={31} /><h2>เริ่มพิมพ์วิชาที่กำลังเรียน</h2><p>ตัวอย่าง: GE1162, NG, ภาษาอังกฤษ</p></div>}</main>;
}

function EmptyState({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><FileText size={27} /></div><h2>{title}</h2><p>{detail}</p>{action}</div>;
}

function useCourseDocuments(code: string) {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: course } = await supabase!.from('courses').select('id').eq('source_key', `moodle:${code}`).maybeSingle();
      if (!course || cancelled) { setDocs([]); setLoading(false); return; }
      const { data } = await supabase!.from('documents').select('id,course_id,owner_id,title,description,kind,storage_path,file_name,mime_type,status,created_at').eq('course_id', course.id).eq('status', 'published').order('created_at', { ascending: false });
      if (!cancelled) { setDocs((data as DocumentRecord[]) || []); setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [code]);
  return { docs, loading };
}

function DocumentCard({ doc, summary }: { doc: DocumentRecord; summary?: ReviewSummary }) {
  return <Link className="document-card" to={`/document/${doc.id}`}><div className="doc-symbol"><FileText size={25} /></div><div className="doc-main"><span className="doc-kind">{kindLabels[doc.kind]}</span><h3>{doc.title}</h3><p>{doc.description || 'เปิดอ่านเอกสารและดูรายละเอียด'}</p><ReviewScore summary={summary} compact /><small>{new Date(doc.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</small></div><ArrowRight size={19} /></Link>;
}

function CoursePage() {
  const { code = '' } = useParams();
  const course = getCourse(code);
  const { docs, loading } = useCourseDocuments(course?.code || '');
  const reviewSummaries = useReviewSummaries(docs.map((doc) => doc.id));
  const [kind, setKind] = useState('all');
  if (!course) return <NotFound />;
  const first = course.paths[0];
  const crumbs: [string, string][] = course.isGE ? [['สารบัญรายวิชา', '/catalog'], ['วิชา GE', '/catalog/ge']] : [['สารบัญรายวิชา', '/catalog'], ...(first ? [[first.faculty, facultyUrl(first.faculty)] as [string, string], [first.branch, branchUrl(first.faculty, first.branch)] as [string, string]] : [])];
  const visible = kind === 'all' ? docs : docs.filter((doc) => doc.kind === kind);
  return <main className="container page"><Breadcrumb items={crumbs} current={course.code} /><div className="course-banner"><div><span className="course-banner-label">{course.isGE ? 'GENERAL EDUCATION' : 'COURSE SPACE'}</span><span className="course-banner-code">{course.code}</span><h1>{course.title}</h1><p>{coursePath(course)}</p></div><div className="course-banner-art"><BookOpen size={78} strokeWidth={1.4} /></div></div><SelfCreatedNotice /><div className="course-toolbar"><div><span className="eyebrow">STUDY MATERIALS</span><h2>เอกสารรายวิชา</h2><p>สรุปและสไลด์ที่นักศึกษาสร้างเองสำหรับวิชานี้</p></div>{isSupabaseConfigured && <Link to={`/upload?course=${encodeURIComponent(course.code)}`} className="button button-dark"><UploadCloud size={18} /> เพิ่มเอกสาร</Link>}</div><div className="filter-row" role="group" aria-label="กรองประเภทเอกสาร">{[['all', 'ทั้งหมด'], ...Object.entries(kindLabels)].map(([value, label]) => <button key={value} className={kind === value ? 'filter-chip selected' : 'filter-chip'} onClick={() => setKind(value)}>{label}</button>)}</div>{loading ? <div className="loading-line">กำลังโหลดเอกสาร...</div> : visible.length ? <div className="document-list">{visible.map((doc) => <DocumentCard key={doc.id} doc={doc} summary={reviewSummaries[doc.id]} />)}</div> : <EmptyState title={kind === 'all' ? 'ยังไม่มีเอกสารในวิชานี้' : `ยังไม่มี${kindLabels[kind as DocumentRecord['kind']]}`} detail={isSupabaseConfigured ? 'เป็นคนแรกที่แบ่งปันสรุปหรือสไลด์ที่ทำเองให้เพื่อนในวิชานี้ได้เลย' : 'สรุปและสไลด์ที่เพื่อนแบ่งปันจะปรากฏที่นี่'} action={isSupabaseConfigured ? <Link className="button button-dark" to={`/upload?course=${encodeURIComponent(course.code)}`}>เพิ่มเอกสาร <ArrowRight size={17} /></Link> : undefined} />}</main>;
}

function LoginPage() {
  const { user, profile } = useAuth();
  const [error, setError] = useState('');
  const [params] = useSearchParams();
  const next = params.get('next');
  const returnTo = safeNextPath(next);
  if (user) return <Navigate to={profile ? returnTo : `/onboarding?next=${encodeURIComponent(returnTo)}`} replace />;
  async function login() {
    if (!supabase) return;
    const redirectUrl = new URL(`${import.meta.env.BASE_URL}auth/callback`, window.location.origin);
    redirectUrl.searchParams.set('next', returnTo);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl.toString(), scopes: 'openid email profile' } });
    if (error) setError(error.message);
  }
  return <main className="auth-page container"><div className="auth-card"><span className="auth-icon"><BookOpen size={32} /></span><span className="eyebrow">WELCOME TO DEK HUACHIEW NOTES</span><h1>เข้ามาเรียนรู้<br />ไปด้วยกัน</h1><p>ใช้บัญชี Google เพื่อแบ่งปันงานที่ทำเอง บันทึก Fav และสร้างพื้นที่ของตัวเอง</p><button className="button button-dark button-wide" onClick={login} disabled={!isSupabaseConfigured}><LogIn size={20} /> ดำเนินการด้วย Google</button>{!isSupabaseConfigured && <div className="notice">ระบบบัญชียังไม่เปิดใช้งาน</div>}{error && <div className="error-note" role="alert">{error}</div>}<small>ใช้ได้กับบัญชี Google ทุกโดเมนอีเมล หลังเข้าสู่ระบบต้องอ่านและยอมรับ <Link to="/policy">ข้อกำหนดการใช้งาน</Link> ก่อนสร้างโปรไฟล์หรือใช้ฟีเจอร์สมาชิก</small></div></main>;
}

function AuthCallback() {
  const { user, profile, loading } = useAuth();
  const [params] = useSearchParams();
  const next = params.get('next');
  const returnTo = safeNextPath(next);
  if (loading) return <main className="container page"><div className="loading-line">กำลังเข้าสู่ระบบ...</div></main>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={profile ? returnTo : `/onboarding?next=${encodeURIComponent(returnTo)}`} replace />;
}

function usePolicyStatus(userId: string | undefined) {
  const [result, setResult] = useState<{ userId: string | undefined; status: 'loading' | 'accepted' | 'missing' | 'error' }>({ userId: undefined, status: 'loading' });
  useEffect(() => {
    if (!userId || !supabase) return;
    let active = true;
    void supabase.from('policy_acceptances').select('accepted_at').eq('user_id', userId).eq('policy_version', POLICY_VERSION).maybeSingle().then(({ data, error }) => {
      if (active) setResult({ userId, status: error ? 'error' : data ? 'accepted' : 'missing' });
    });
    return () => { active = false; };
  }, [userId]);
  return result.userId === userId ? result.status : 'loading';
}

function PolicyPage() {
  return <main className="container page policy-page"><PageHead eyebrow="COMMUNITY RULES" title="ข้อกำหนดการใช้งาน" description="อ่านกติกาการแบ่งปันและการใช้ข้อมูลก่อนสมัครสมาชิก" /><PolicyContent /></main>;
}

function PolicyAcceptancePage() {
  const { user, loading } = useAuth();
  const status = usePolicyStatus(user?.id);
  const [params] = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  if (loading) return <main className="container page"><div className="loading-line">กำลังตรวจสอบบัญชี...</div></main>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  if (status === 'accepted') return <Navigate to={next} replace />;
  async function accept(event: FormEvent) {
    event.preventDefault();
    if (!checked || !supabase || saving) return;
    setSaving(true); setError('');
    const { error: acceptError } = await supabase.rpc('accept_current_policy');
    if (acceptError) setError(acceptError.message);
    else navigate(next, { replace: true });
    setSaving(false);
  }
  return <main className="container page policy-page"><PageHead eyebrow="BEFORE YOU JOIN" title="อ่านกติกาก่อนเริ่มใช้งาน" description="คุณต้องยอมรับข้อกำหนดฉบับปัจจุบันก่อนสร้างโปรไฟล์ บันทึก Fav หรืออัปโหลดเอกสาร" /><PolicyContent /><form className="policy-accept-card" onSubmit={(event) => void accept(event)}><label className="policy-check"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /><span>ฉันอ่านและยอมรับข้อกำหนดการใช้งาน รวมทั้งรับทราบข้อมูลส่วนตัวที่เว็บใช้ตามข้อความด้านบน</span></label>{error && <p className="error-note" role="alert">{error}</p>}{status === 'error' && <p className="error-note" role="alert">ตรวจสอบสถานะข้อตกลงไม่ได้ กรุณาลองใหม่ภายหลัง</p>}<button className="button button-dark" type="submit" disabled={!checked || saving || status !== 'missing'}>{saving ? 'กำลังบันทึก...' : 'ยอมรับและดำเนินการต่อ'} <ArrowRight size={18} /></button><button className="signout" type="button" onClick={() => void supabase?.auth.signOut()}>ไม่ยอมรับ · ออกจากระบบ</button></form></main>;
}

function RequireUser({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const policyStatus = usePolicyStatus(user?.id);
  const location = useLocation();
  if (loading) return <main className="container page"><div className="loading-line">กำลังโหลดข้อมูลบัญชี...</div></main>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (policyStatus === 'loading') return <main className="container page"><div className="loading-line">กำลังตรวจสอบข้อตกลง...</div></main>;
  if (policyStatus === 'error') return <main className="container page"><EmptyState title="ตรวจสอบข้อตกลงไม่ได้" detail="กรุณาลองโหลดหน้าอีกครั้ง หากยังไม่สำเร็จให้ตรวจการตั้งค่าฐานข้อมูล" /></main>;
  if (policyStatus === 'missing') return <Navigate to={`/policy/accept?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (!profile && location.pathname !== '/onboarding') return <Navigate to={`/onboarding?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}

function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState(user?.user_metadata?.full_name || '');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  if (profile) return <Navigate to={safeNextPath(next)} replace />;
  async function submit(event: FormEvent) {
    event.preventDefault();
    const handle = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(handle)) { setError('username ต้องมี 3–20 ตัว ใช้ a-z, 0-9 หรือ _'); return; }
    if (!name.trim() || name.trim().length > 50) { setError('ชื่อที่แสดงต้องมี 1–50 ตัวอักษร'); return; }
    if (!supabase || !user) return;
    setSaving(true); setError('');
    const { error } = await supabase.from('profiles').insert({ id: user.id, username: handle, display_name: name.trim(), bio: bio.trim(), avatar_url: user.user_metadata?.avatar_url || null });
    if (error) setError(error.code === '23505' ? 'username นี้มีคนใช้แล้ว ลองชื่ออื่น' : error.message);
    else { await refreshProfile(); navigate(safeNextPath(next), { replace: true }); }
    setSaving(false);
  }
  return <main className="container form-page"><div className="form-intro"><span className="eyebrow">ONE LAST STEP</span><h1>สร้างโปรไฟล์<br />ในแบบของคุณ</h1><p>เลือกชื่อที่เพื่อนจะเห็นเมื่อคุณแบ่งปันสรุปและสไลด์</p></div><form className="form-card" onSubmit={submit}><label>username <span>*</span><div className="input-prefix"><span>@</span><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="your_name" maxLength={20} required /></div><small>ใช้ a-z, 0-9 และ _ รวม 3–20 ตัว แก้ภายหลังไม่ได้ในเวอร์ชันแรก</small></label><label>ชื่อที่แสดง <span>*</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={50} required /></label><label>คำแนะนำตัว <small>(ไม่บังคับ)</small><textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={300} rows={3} placeholder="เล่าเรื่องการเรียนของคุณสักนิด" /></label>{error && <p className="error-note" role="alert">{error}</p>}<button className="button button-dark button-wide" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'เริ่มใช้งาน'} <ArrowRight size={18} /></button></form></main>;
}

function MyPage() {
  const { user, profile } = useAuth();
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const reviewSummaries = useReviewSummaries(docs.map((doc) => doc.id));
  const profileReviewSummary = useProfileReviewSummary(user?.id);
  useEffect(() => { if (supabase && user) void supabase.from('documents').select('id,course_id,owner_id,title,description,kind,storage_path,file_name,mime_type,status,created_at').eq('owner_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setDocs((data as DocumentRecord[]) || [])); }, [user]);
  return <main className="container page"><div className="profile-hero"><div className="profile-avatar">{profile?.display_name.charAt(0) || 'U'}</div><div><span className="eyebrow">MY SPACE</span><h1>{profile?.display_name}</h1><p>@{profile?.username}</p>{profile?.bio && <p className="profile-bio">{profile.bio}</p>}<div className="profile-review-score"><span>คะแนนจากรีวิวเอกสาร</span><ReviewScore summary={profileReviewSummary} /></div></div><div className="profile-actions"><Link to={`/u/${profile?.username}`} className="button button-outline">โปรไฟล์สาธารณะ</Link><Link to="/settings/profile" className="button button-outline">แก้ไขโปรไฟล์ <ArrowRight size={17} /></Link></div></div><div className="dashboard-grid"><Link to="/me/favorites" className="dashboard-card"><span className="dashboard-icon"><Heart size={25} /></span><h3>รายการโปรด</h3><p>กลับมาอ่านสิ่งที่บันทึกไว้</p><ArrowRight size={19} /></Link><Link to="/upload" className="dashboard-card"><span className="dashboard-icon"><UploadCloud size={25} /></span><h3>แบ่งปันเอกสาร</h3><p>เพิ่มสรุปหรือสไลด์ของคุณ</p><ArrowRight size={19} /></Link></div><div className="section-heading inner-heading"><div><h2>เอกสารของฉัน</h2><p>เอกสารที่คุณแบ่งปันและฉบับร่าง</p></div></div>{docs.length ? <div className="document-list">{docs.map((doc) => <DocumentCard key={doc.id} doc={doc} summary={reviewSummaries[doc.id]} />)}</div> : <EmptyState title="ยังไม่มีเอกสารของคุณ" detail="เริ่มแบ่งปันสรุปหรือสไลด์ที่เป็นประโยชน์กับเพื่อน ๆ" action={<Link className="button button-dark" to="/upload">เพิ่มเอกสาร <ArrowRight size={17} /></Link>} />}<button className="signout" onClick={() => void supabase?.auth.signOut()}>ออกจากระบบ</button></main>;
}

function PublicProfile() {
  const { username = '' } = useParams();
  const { profile: ownProfile } = useAuth();
  const [profile, setProfile] = useState<{ id: string; username: string; display_name: string; bio: string } | null>(null);
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const reviewSummaries = useReviewSummaries(docs.map((doc) => doc.id));
  const profileReviewSummary = useProfileReviewSummary(profile?.id);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    const client = supabase;
    void (async () => {
      const { data } = await client.from('profiles').select('id,username,display_name,bio').eq('username', username.toLowerCase()).maybeSingle();
      setProfile(data);
      if (data) {
        const { data: documents } = await client.from('documents').select('id,course_id,owner_id,title,description,kind,storage_path,file_name,mime_type,status,created_at').eq('owner_id', data.id).eq('status', 'published').order('created_at', { ascending: false });
        setDocs((documents as DocumentRecord[]) || []);
      }
      setLoading(false);
    })();
  }, [username]);
  if (loading) return <main className="container page"><div className="loading-line">กำลังโหลดโปรไฟล์...</div></main>;
  if (!profile) return <NotFound />;
  return <main className="container page"><div className="profile-hero"><div className="profile-avatar">{profile.display_name.charAt(0)}</div><div><span className="eyebrow">COMMUNITY PROFILE</span><h1>{profile.display_name}</h1><p>@{profile.username}</p>{profile.bio && <p className="profile-bio">{profile.bio}</p>}<div className="profile-review-score"><span>คะแนนจากรีวิวเอกสาร</span><ReviewScore summary={profileReviewSummary} /></div></div>{ownProfile?.id === profile.id && <Link to="/settings/profile" className="button button-outline">แก้ไขโปรไฟล์ <ArrowRight size={17} /></Link>}</div><div className="section-heading inner-heading"><div><h2>เอกสารที่แบ่งปัน</h2><p>{docs.length} รายการที่เผยแพร่</p></div></div>{docs.length ? <div className="document-list">{docs.map((doc) => <DocumentCard key={doc.id} doc={doc} summary={reviewSummaries[doc.id]} />)}</div> : <EmptyState title="ยังไม่มีเอกสารสาธารณะ" detail="เอกสารที่เผยแพร่จะปรากฏที่นี่" />}</main>;
}

function FavoritesPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const reviewSummaries = useReviewSummaries(docs.map((doc) => doc.id));
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!supabase || !user) return;
    const client = supabase;
    void (async () => {
      const { data: favorites } = await client.from('favorites').select('document_id').eq('user_id', user.id).order('created_at', { ascending: false });
      const ids = (favorites || []).map((item) => item.document_id);
      if (!ids.length) { setDocs([]); setLoading(false); return; }
      const { data } = await client.from('documents').select('id,course_id,owner_id,title,description,kind,storage_path,file_name,mime_type,status,created_at').in('id', ids).eq('status', 'published');
      const byId = new Map((data || []).map((item) => [item.id, item as DocumentRecord]));
      setDocs(ids.map((id) => byId.get(id)).filter((item): item is DocumentRecord => Boolean(item)));
      setLoading(false);
    })();
  }, [user]);
  return <main className="container page"><Breadcrumb items={[["พื้นที่ของฉัน", "/me"]]} current="รายการโปรด" /><PageHead eyebrow="SAVED FOR LATER" title="รายการโปรดของฉัน" description="สรุปและสไลด์ที่คุณบันทึกไว้ กลับมาอ่านได้ทุกเมื่อ" />{loading ? <div className="loading-line">กำลังโหลดรายการโปรด...</div> : docs.length ? <div className="document-list">{docs.map((doc) => <DocumentCard key={doc.id} doc={doc} summary={reviewSummaries[doc.id]} />)}</div> : <EmptyState title="ยังไม่มีรายการโปรด" detail="กดปุ่มบันทึกบนหน้าเอกสาร แล้วเอกสารจะมาอยู่ที่นี่" action={<Link className="button button-dark" to="/catalog">สำรวจรายวิชา <ArrowRight size={17} /></Link>} />}</main>;
}

function DocumentPage() {
  const { id = '' } = useParams();
  const { user, profile } = useAuth();
  const policyStatus = usePolicyStatus(user?.id);
  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    setDoc(null);
    setFileUrl('');
    setReviewSummary(null);
    setSaved(false);
    setError('');
    let active = true;
    void (async () => {
      const { data, error } = await supabase!.from('documents').select('id,course_id,owner_id,title,description,kind,storage_path,file_name,mime_type,status,created_at').eq('id', id).maybeSingle();
      if (!active) return;
      if (error || !data || (data.status !== 'published' && data.owner_id !== user?.id)) { setError('ไม่พบเอกสารหรือไม่มีสิทธิ์เข้าถึง'); setLoading(false); return; }
      setDoc(data as DocumentRecord);
      const { data: signed, error: signError } = await supabase!.storage.from('documents').createSignedUrl(data.storage_path, 60);
      if (active) { if (signError) setError('เปิดไฟล์ไม่สำเร็จ: ' + signError.message); else setFileUrl(signed.signedUrl); setLoading(false); }
      if (user) { const { data: favorite } = await supabase!.from('favorites').select('id').eq('user_id', user.id).eq('document_id', id).maybeSingle(); if (active) setSaved(Boolean(favorite)); }
    })();
    return () => { active = false; };
  }, [id, user?.id]);
  useEffect(() => {
    if (!supabase || !user || !profile || policyStatus !== 'accepted' || !doc || window.sessionStorage.getItem('pendingFavoriteDocument') !== doc.id) return;
    void supabase.from('favorites').upsert({ user_id: user.id, document_id: doc.id }, { onConflict: 'user_id,document_id' }).then(({ error }) => {
      if (error) setError(error.message);
      else { setSaved(true); window.sessionStorage.removeItem('pendingFavoriteDocument'); }
    });
  }, [user, profile, policyStatus, doc]);
  async function toggleFavorite() {
    if (!user || policyStatus !== 'accepted' || !profile) { window.sessionStorage.setItem('pendingFavoriteDocument', id); navigate(!user ? `/login?next=${encodeURIComponent(`/document/${id}`)}` : policyStatus !== 'accepted' ? `/policy/accept?next=${encodeURIComponent(`/document/${id}`)}` : `/onboarding?next=${encodeURIComponent(`/document/${id}`)}`); return; }
    if (!supabase || !doc) return;
    setBusy(true); setError('');
    const next = !saved;
    const result = next ? await supabase.from('favorites').upsert({ user_id: user.id, document_id: doc.id }, { onConflict: 'user_id,document_id' }) : await supabase.from('favorites').delete().eq('user_id', user.id).eq('document_id', doc.id);
    if (result.error) setError(result.error.message); else setSaved(next);
    setBusy(false);
  }
  if (loading) return <main className="container page"><div className="loading-line">กำลังเปิดเอกสาร...</div></main>;
  if (!doc) return <main className="container page"><EmptyState title="ไม่พบเอกสาร" detail={error || 'เอกสารนี้อาจถูกซ่อนหรือย้ายแล้ว'} action={<Link className="button button-dark" to="/catalog">กลับไปสารบัญ</Link>} /></main>;
  return <main className="container reader-page"><div className="reader-top"><Link to="/catalog" className="back-link"><ArrowLeft size={18} /> สารบัญ</Link><span className="doc-kind">{kindLabels[doc.kind]}</span></div><div className="reader-heading"><div><h1>{doc.title}</h1><p>{doc.description || 'เอกสารประกอบการเรียน'}</p><a className="reader-review-link" href="#reviews" aria-label="ไปยังรีวิวเอกสาร"><ReviewScore summary={reviewSummary} /> <ArrowRight size={15} aria-hidden="true" /></a></div><div className="reader-actions"><button className={saved ? 'button button-saved' : 'button button-outline'} onClick={() => void toggleFavorite()} disabled={busy}>{saved ? <Check size={18} /> : <Bookmark size={18} />}{saved ? 'บันทึกแล้ว' : 'บันทึก Fav'}</button>{fileUrl && <a className="button button-dark" href={fileUrl} target="_blank" rel="noreferrer" download={doc.file_name}>เปิดไฟล์ <ArrowRight size={17} /></a>}</div></div>{error && <p className="error-note" role="alert">{error}</p>}<div className="reader-layout"><div className="reader-canvas">{fileUrl ? doc.mime_type === 'application/pdf' ? <iframe title={doc.title} src={`${fileUrl}#toolbar=0`} /> : <img src={fileUrl} alt={doc.title} /> : <EmptyState title="ยังเปิดไฟล์ไม่ได้" detail="ลองรีเฟรชหน้าอีกครั้ง" />}</div><aside className="reader-side"><span className="eyebrow">ABOUT THIS FILE</span><h2>รายละเอียดเอกสาร</h2><div className="reader-meta"><span>ประเภท</span><strong>{kindLabels[doc.kind]}</strong></div><div className="reader-meta"><span>ไฟล์</span><strong>{doc.file_name}</strong></div><div className="reader-meta"><span>อัปโหลด</span><strong>{new Date(doc.created_at).toLocaleDateString('th-TH')}</strong></div><p className="reader-side-note">เปิดบน iPad แนวตั้ง แนวนอน หรือแบ่งหน้าจอได้ตามพื้นที่ที่มี</p></aside></div><ReviewsSection key={doc.id} document={doc} policyStatus={policyStatus} onSummaryChange={setReviewSummary} /></main>;
}

function UploadPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('course') || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<DocumentRecord['kind']>('summary');
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const navigate = useNavigate();
  const matching = getCourse(code);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !user || !matching || !file) { setError('เลือกรายวิชาและไฟล์ก่อนอัปโหลด'); return; }
    if (!confirmed) { setError('กรุณายืนยันว่าไฟล์นี้เป็นงานที่คุณสร้างเอง'); return; }
    if (!['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('รองรับ PDF, PNG, JPG และ WebP'); return; }
    if (file.size === 0) { setError('ไฟล์ว่างเปล่า กรุณาเลือกไฟล์อื่น'); return; }
    if (file.size > MAX_UPLOAD_FILE_BYTES) { setError('ไฟล์ต้องไม่เกิน 50 MB ตามข้อจำกัดของ Supabase Free'); return; }
    setSaving(true); setError(''); setUploadProgress(0);
    const { data: hasQuota, error: quotaError } = await supabase.rpc('can_upload_document_on_free_plan');
    if (quotaError) { setError('ยังตรวจโควตาอัปโหลดไม่ได้ กรุณาตรวจว่าได้รัน migration 005–006 แล้ว'); setSaving(false); return; }
    if (!hasQuota) { setError('โควตาอัปโหลดช่วงทดลองเต็มแล้ว (5 ไฟล์ต่อบัญชี, 50 ไฟล์ทั้งเว็บ หรือพื้นที่ไฟล์ถึง 750 MB)'); setSaving(false); return; }
    const { data: course, error: courseError } = await supabase.from('courses').select('id').eq('source_key', `moodle:${matching.code}`).maybeSingle();
    if (courseError || !course) { setError('ยังไม่พบวิชานี้ในฐานข้อมูล กรุณานำเข้ารายวิชาตาม README'); setSaving(false); return; }
    const id = crypto.randomUUID();
    const storagePath = `${user.id}/${id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    try { await uploadDocumentFile(file, storagePath, setUploadProgress); }
    catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'อัปโหลดไฟล์ไม่สำเร็จ'); setSaving(false); return; }
    const { error: insertError } = await supabase.from('documents').insert({ id, course_id: course.id, owner_id: user.id, title: title.trim(), description: description.trim(), kind, storage_path: storagePath, file_name: file.name, mime_type: file.type, status: 'published', self_created_confirmed: true });
    if (insertError) { await supabase.storage.from('documents').remove([storagePath]); setError(insertError.message); setSaving(false); return; }
    navigate(`/document/${id}`);
  }
  return <main className="container form-page"><div className="form-intro"><span className="eyebrow">SHARE KNOWLEDGE</span><h1>สรุปดี ๆ<br />แบ่งปันกันได้</h1><p>อัปโหลดเฉพาะสรุปหรือสไลด์ที่คุณเขียนและทำขึ้นเอง</p><SelfCreatedNotice /></div><form className="form-card" onSubmit={(event) => void submit(event)}><label>รหัสวิชา <span>*</span><input value={code} onChange={(event) => setCode(event.target.value)} placeholder="เช่น GE1162" required />{code && <small>{matching ? `${matching.code} · ${matching.title}` : 'ยังไม่พบรหัสนี้ในสารบัญ'}</small>}</label><label>ชื่อเอกสาร <span>*</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="สรุปบทที่ 1 — ..." required /></label><label>ประเภทเอกสาร <span>*</span><select value={kind} onChange={(event) => setKind(event.target.value as DocumentRecord['kind'])}>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>คำอธิบาย<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={3} placeholder="เอกสารนี้ช่วยเรื่องอะไรบ้าง" /></label><label>ไฟล์ PDF หรือรูปภาพ <span>*</span><input type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} required /><small>ช่วงทดลอง: สูงสุด 50 MB ต่อไฟล์ · 5 ไฟล์ต่อบัญชี · 1 ไฟล์ต่อเอกสาร</small></label><label className="upload-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required /><span>ฉันยืนยันว่าไฟล์นี้เป็นงานที่ฉันเขียนหรือสร้างเองทั้งหมด ไม่มีสไลด์อาจารย์/มหาวิทยาลัย ไฟล์จาก HCU e-learning หรือส่วนของผู้อื่นที่ไม่มีสิทธิ์เผยแพร่</span></label><p className="form-hint"><ShieldCheck size={18} /> อ่านรายละเอียดเพิ่มเติมใน <Link to="/policy">ข้อกำหนดการใช้งาน</Link></p>{error && <p className="error-note" role="alert">{error}</p>}<button className="button button-dark button-wide" disabled={saving || !matching || !confirmed || !isSupabaseConfigured}>{saving ? uploadProgress ? `กำลังอัปโหลด ${uploadProgress}%` : 'กำลังเตรียมอัปโหลด...' : 'เผยแพร่เอกสาร'} <ArrowRight size={18} /></button>{saving && uploadProgress > 0 && <p className="form-hint" role="status">อัปโหลดแล้ว {uploadProgress}%</p>}{!isSupabaseConfigured && <div className="notice">ระบบอัปโหลดยังไม่เปิดใช้งาน</div>}</form></main>;
}

function EditProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { setName(profile?.display_name || ''); setBio(profile?.bio || ''); }, [profile]);
  async function submit(event: FormEvent) { event.preventDefault(); if (!supabase || !user) return; setSaving(true); const { error } = await supabase.from('profiles').update({ display_name: name.trim(), bio: bio.trim() }).eq('id', user.id); if (error) setError(error.message); else { await refreshProfile(); navigate('/me'); } setSaving(false); }
  return <main className="container form-page"><div className="form-intro"><span className="eyebrow">YOUR PROFILE</span><h1>แก้ไขโปรไฟล์</h1><p>ชื่อและคำแนะนำตัวที่เพื่อนจะเห็นบนหน้าเอกสารของคุณ</p></div><form className="form-card" onSubmit={(event) => void submit(event)}><label>username<input value={`@${profile?.username || ''}`} disabled /><small>เปลี่ยน username ยังไม่รองรับในเวอร์ชันแรก</small></label><label>ชื่อที่แสดง <span>*</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={50} required /></label><label>คำแนะนำตัว<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={300} rows={4} /></label>{error && <p className="error-note" role="alert">{error}</p>}<button className="button button-dark button-wide" disabled={saving || !name.trim()}>{saving ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'} <ArrowRight size={18} /></button></form></main>;
}

function NotFound() { return <main className="container page"><EmptyState title="ไม่พบหน้านี้" detail="ลองกลับไปหน้าแรกหรือค้นหาวิชาที่ต้องการ" action={<Link className="button button-dark" to="/">กลับหน้าแรก <ArrowRight size={17} /></Link>} /></main>; }

export default function App() {
  return <div className="app-shell"><Header /><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/catalog" element={<Catalog />} />
    <Route path="/catalog/ge" element={<GEPage />} />
    <Route path="/faculty/:faculty" element={<FacultyPage />} />
    <Route path="/faculty/:faculty/branch/:branch" element={<FacultyPage />} />
    <Route path="/search" element={<SearchPage />} />
    <Route path="/course/:code" element={<CoursePage />} />
    <Route path="/document/:id" element={<DocumentPage />} />
    <Route path="/u/:username" element={<PublicProfile />} />
    <Route path="/policy" element={<PolicyPage />} />
    <Route path="/policy/accept" element={<PolicyAcceptancePage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/auth/callback" element={<AuthCallback />} />
    <Route path="/onboarding" element={<RequireUser><Onboarding /></RequireUser>} />
    <Route path="/me" element={<RequireUser><MyPage /></RequireUser>} />
    <Route path="/me/favorites" element={<RequireUser><FavoritesPage /></RequireUser>} />
    <Route path="/upload" element={<RequireUser><UploadPage /></RequireUser>} />
    <Route path="/settings/profile" element={<RequireUser><EditProfile /></RequireUser>} />
    <Route path="*" element={<NotFound />} />
  </Routes><Footer /></div>;
}
