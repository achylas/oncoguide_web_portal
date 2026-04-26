import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const BUCKET = 'scan-reports';

/**
 * Upload a File object to Supabase Storage.
 * Returns the public URL or null on failure.
 */
export async function uploadImage(file, patientId, imageType) {
  const timestamp = Date.now();
  const ext       = file.name.split('.').pop();
  const path      = `patient_images/${patientId}/${imageType}_${timestamp}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    console.error('[Supabase] Upload failed:', error.message);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
