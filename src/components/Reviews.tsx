import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase, type DocumentRecord } from '../lib/supabase';

export type ReviewSummary = { document_id: string; review_count: number; average_rating: number };
type RatingSummary = Pick<ReviewSummary, 'review_count' | 'average_rating'>;

type Review = {
  id: string;
  document_id: string;
  user_id: string;
  rating: number;
  body: string;
  reviewed_storage_path: string;
  reviewed_file_name: string;
  created_at: string;
  updated_at: string;
  author: { username: string; display_name: string } | null;
};

type RawReview = Omit<Review, 'author'> & { author: Review['author'] | Review['author'][] };
function normalizeReviews(data: unknown): Review[] {
  return ((data || []) as RawReview[]).map((row) => ({ ...row, author: Array.isArray(row.author) ? row.author[0] || null : row.author }));
}

const REVIEW_FIELDS = 'id,document_id,user_id,rating,body,reviewed_storage_path,reviewed_file_name,created_at,updated_at,author:profiles!reviews_user_id_fkey(username,display_name)';
const PAGE_SIZE = 20;

export function useReviewSummaries(documentIds: string[]) {
  const key = documentIds.join(',');
  const [summaries, setSummaries] = useState<Record<string, ReviewSummary>>({});
  useEffect(() => {
    if (!supabase || !key) { setSummaries({}); return; }
    let active = true;
    void supabase.from('document_review_summary').select('document_id,review_count,average_rating').in('document_id', key.split(',')).then(({ data }) => {
      if (active) setSummaries(Object.fromEntries(((data || []) as ReviewSummary[]).map((item) => [item.document_id, item])));
    });
    return () => { active = false; };
  }, [key]);
  return summaries;
}

export function useProfileReviewSummary(userId?: string) {
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  useEffect(() => {
    if (!supabase || !userId) { setSummary(null); return; }
    let active = true;
    void supabase.from('profile_review_summary').select('review_count,average_rating').eq('user_id', userId).maybeSingle().then(({ data }) => {
      if (active) setSummary(data as RatingSummary | null);
    });
    return () => { active = false; };
  }, [userId]);
  return summary;
}

export function ReviewScore({ summary, compact = false }: { summary?: RatingSummary | null; compact?: boolean }) {
  if (!summary?.review_count) return <span className={`review-score ${compact ? 'review-score-compact' : ''}`} title="ยังไม่มีรีวิว">ใหม่</span>;
  return <span className={`review-score ${compact ? 'review-score-compact' : ''}`}><Star size={compact ? 15 : 19} fill="currentColor" aria-hidden="true" /><strong>{Number(summary.average_rating).toFixed(1)}</strong><span>({summary.review_count} รีวิว)</span></span>;
}

function RatingStars({ rating, label }: { rating: number; label: string }) {
  return <span className="rating-stars" aria-label={`${label} ${rating} จาก 5 ดาว`}>{[1, 2, 3, 4, 5].map((number) => <Star key={number} size={15} fill={number <= rating ? 'currentColor' : 'none'} aria-hidden="true" />)}</span>;
}

export function ReviewsSection({ document, policyStatus, onSummaryChange }: { document: DocumentRecord; policyStatus: 'loading' | 'accepted' | 'missing' | 'error'; onSummaryChange?: (summary: ReviewSummary | null) => void }) {
  const { user, profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ownReview, setOwnReview] = useState<Review | null>(null);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const loadReviews = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const client = supabase;
    setLoading(true);
    const [listResult, summaryResult, ownResult] = await Promise.all([
      client.from('reviews').select(REVIEW_FIELDS).eq('document_id', document.id).order('created_at', { ascending: false }).range(0, PAGE_SIZE - 1),
      client.from('document_review_summary').select('document_id,review_count,average_rating').eq('document_id', document.id).maybeSingle(),
      user ? client.from('reviews').select(REVIEW_FIELDS).eq('document_id', document.id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);
    const loadError = listResult.error || summaryResult.error || ownResult.error;
    if (loadError) setError(`โหลดรีวิวไม่สำเร็จ: ${loadError.message}`);
    else {
      const mine = normalizeReviews(ownResult.data ? [ownResult.data] : [])[0] || null;
      setReviews(normalizeReviews(listResult.data));
      const nextSummary = summaryResult.data as ReviewSummary | null;
      setSummary(nextSummary);
      onSummaryChange?.(nextSummary);
      setOwnReview(mine);
      setRating(mine?.rating || 0);
      setBody(mine?.body || '');
      setError('');
    }
    setLoading(false);
  }, [document.id, user?.id, onSummaryChange]);

  useEffect(() => { void loadReviews(); }, [loadReviews]);

  async function loadMore() {
    if (!supabase || loadingMore) return;
    setLoadingMore(true);
    const { data, error: loadError } = await supabase.from('reviews').select(REVIEW_FIELDS).eq('document_id', document.id).order('created_at', { ascending: false }).range(reviews.length, reviews.length + PAGE_SIZE - 1);
    if (loadError) setError(loadError.message);
    else setReviews((current) => [...current, ...normalizeReviews(data)]);
    setLoadingMore(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !user || !profile || policyStatus !== 'accepted' || saving) return;
    if (rating < 1 || rating > 5) { setError('เลือกคะแนน 1–5 ดาวก่อนบันทึก'); return; }
    setSaving(true); setError('');
    const values = { rating, body: body.trim() };
    const result = ownReview
      ? await supabase.from('reviews').update(values).eq('id', ownReview.id).eq('user_id', user.id)
      : await supabase.from('reviews').insert({ ...values, document_id: document.id, user_id: user.id });
    if (result.error) setError(result.error.code === '23505' ? 'คุณรีวิวเอกสารนี้แล้ว กรุณาโหลดหน้าใหม่เพื่อแก้ไขรีวิว' : result.error.message);
    else await loadReviews();
    setSaving(false);
  }

  async function remove() {
    if (!supabase || !user || !ownReview || saving) return;
    setSaving(true); setError('');
    const { error: removeError } = await supabase.from('reviews').delete().eq('id', ownReview.id).eq('user_id', user.id);
    if (removeError) setError(removeError.message);
    else await loadReviews();
    setSaving(false);
  }

  const next = `/document/${document.id}`;
  const memberPath = !user ? `/login?next=${encodeURIComponent(next)}` : policyStatus !== 'accepted' ? `/policy/accept?next=${encodeURIComponent(next)}` : !profile ? `/onboarding?next=${encodeURIComponent(next)}` : null;
  const canReview = document.status === 'published' && document.owner_id !== user?.id;

  return <section className="reviews-section" id="reviews" aria-labelledby="reviews-title">
    <div className="reviews-heading"><div><span className="eyebrow">STUDENT REVIEWS</span><h2 id="reviews-title">รีวิวจากเพื่อน ๆ</h2><p>ให้คะแนนสรุปหรือสไลด์นี้ตามประโยชน์ที่ได้รับ</p></div><ReviewScore summary={summary} /></div>
    {loading ? <p className="loading-line">กำลังโหลดรีวิว...</p> : <>
      {document.owner_id === user?.id ? <p className="review-info">คุณเป็นเจ้าของเอกสารนี้ จึงให้คะแนนงานของตัวเองไม่ได้</p> : document.status !== 'published' ? <p className="review-info">เอกสารที่ยังไม่เผยแพร่รับรีวิวไม่ได้</p> : memberPath ? <div className="review-join"><p>เข้าสู่ระบบและตั้งโปรไฟล์เพื่อให้ดาวหรือเขียนรีวิว</p><Link to={memberPath} className="button button-dark">เริ่มเขียนรีวิว <ArrowRight size={17} /></Link></div> : canReview && <form className="review-form" onSubmit={(event) => void submit(event)}><h3>{ownReview ? 'แก้ไขรีวิวของคุณ' : 'เขียนรีวิวของคุณ'}</h3><div className="review-rating-choice" role="group" aria-label="เลือกคะแนน 1 ถึง 5 ดาว">{[1, 2, 3, 4, 5].map((number) => <button type="button" key={number} aria-label={`${number} ดาว`} aria-pressed={rating === number} onClick={() => setRating(number)}><Star size={30} fill={number <= rating ? 'currentColor' : 'none'} aria-hidden="true" /></button>)}<span>{rating ? `${rating} / 5 ดาว` : 'เลือกดาว'}</span></div><label htmlFor="review-body">ความเห็นเพิ่มเติม <small>(ไม่บังคับ)</small></label><textarea id="review-body" rows={4} maxLength={1000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="เอกสารนี้ช่วยให้เข้าใจเรื่องไหน หรือมีข้อเสนอแนะอะไรบ้าง" /><div className="review-form-actions"><button className="button button-dark" type="submit" disabled={saving || rating === 0}>{saving ? 'กำลังบันทึก...' : ownReview ? 'บันทึกการแก้ไข' : 'เผยแพร่รีวิว'}</button>{ownReview && <button className="button button-outline" type="button" onClick={() => void remove()} disabled={saving}>ถอนรีวิว</button>}</div></form>}
      {error && <p className="error-note" role="alert">{error}</p>}
      {reviews.length ? <div className="review-list">{reviews.map((review) => <article className="review-card" key={review.id}><div className="review-avatar" aria-hidden="true">{review.author?.display_name?.charAt(0) || 'U'}</div><div className="review-content"><div className="review-author-line"><strong>{review.author?.display_name || 'สมาชิก'}</strong>{review.author?.username && <Link to={`/u/${review.author.username}`}>@{review.author.username}</Link>}{review.user_id === user?.id && <span className="review-own-tag">ของคุณ</span>}</div><div className="review-detail-line"><RatingStars rating={review.rating} label="ให้คะแนน" /><time dateTime={review.updated_at}>{new Date(review.updated_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</time>{review.reviewed_storage_path !== document.storage_path && <span>รีวิวไฟล์ฉบับก่อน</span>}</div>{review.body && <p>{review.body}</p>}</div></article>)}</div> : <div className="review-empty"><Star size={24} /><p>ยังไม่มีรีวิว เป็นคนแรกที่ให้คะแนนเอกสารนี้ได้เลย</p></div>}
      {reviews.length < (summary?.review_count || 0) && <button className="button button-outline review-more" onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore ? 'กำลังโหลด...' : 'ดูรีวิวเพิ่มเติม'}</button>}
    </>}
  </section>;
}
