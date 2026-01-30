import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // ビルド中は環境変数がないので、ダミーでエラー回避（本番では Cloud Run 等で設定すること）
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key";

  return createBrowserClient(supabaseUrl, supabaseKey)
}