import { supabase } from './supabase';

function resumableEndpoint() {
  const url = new URL('/storage/v1/upload/resumable', import.meta.env.VITE_SUPABASE_URL);
  if (url.hostname.endsWith('.supabase.co') && !url.hostname.endsWith('.storage.supabase.co')) {
    url.hostname = url.hostname.replace(/\.supabase\.co$/, '.storage.supabase.co');
  }
  return url.toString();
}

export async function uploadDocumentFile(file: File, storagePath: string, onProgress: (percent: number) => void): Promise<void> {
  if (!supabase) throw new Error('ยังไม่ได้เชื่อมต่อ Supabase');
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) throw new Error('กรุณาเข้าสู่ระบบใหม่ก่อนอัปโหลด');
  const tus = await import('tus-js-client');
  if (!tus.isSupported) throw new Error('เบราว์เซอร์นี้ยังไม่รองรับการอัปโหลดไฟล์ขนาดใหญ่');

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: resumableEndpoint(),
      headers: { authorization: `Bearer ${session.access_token}` },
      metadata: {
        bucketName: 'documents',
        objectName: storagePath,
        contentType: file.type,
        cacheControl: '3600',
      },
      chunkSize: 6 * 1024 * 1024,
      retryDelays: [0, 3000, 5000, 10000],
      uploadDataDuringCreation: true,
      storeFingerprintForResuming: false,
      onProgress: (uploaded, total) => onProgress(Math.round((uploaded / total) * 100)),
      onError: reject,
      onSuccess: () => resolve(),
    });
    upload.start();
  });
}
