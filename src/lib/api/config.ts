// Check if Supabase is configured (runtime check)
export const isSupabaseConfigured = () => {
  // Client-side: use window or process.env
  const url = typeof window !== 'undefined' 
    ? (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    : process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  
  const key = typeof window !== 'undefined'
    ? (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  // Check if values exist and are not placeholders
  if (!url || !key) return false;
  if (url === 'your_supabase_project_url' || key === 'your_supabase_anon_key') return false;
  if (url.startsWith('https:https://') || url.startsWith('http:http://')) return false; // Check for double protocol
  
  // Check if URL is a valid HTTP/HTTPS URL
  try {
    const cleanUrl = url.replace(/^https?:/, '').replace(/^\/\//, '');
    const urlObj = new URL(`https://${cleanUrl}`);
    if (!['http:', 'https:'].includes(urlObj.protocol)) return false;
    if (!url.includes('.supabase.co')) return false; // Basic validation
  } catch {
    return false; // Invalid URL format
  }
  
  return true;
};

// Use real API if configured, otherwise use mock (runtime check)
export const USE_REAL_API = isSupabaseConfigured();
