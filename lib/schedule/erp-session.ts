import "server-only"
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export const ERP_SESSION_COOKIE = "ps_erp_access_token"

function createTokenClient(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  )
}

export async function verifyErpAccessToken(accessToken: string): Promise<{
  user: User
  client: SupabaseClient
} | null> {
  if (!accessToken || accessToken.length > 5000) return null
  const client = createTokenClient(accessToken)
  const { data, error } = await client.auth.getUser(accessToken)
  if (error || !data.user || data.user.is_anonymous) return null
  return { user: data.user, client }
}

export async function getScheduleErpSession() {
  const token = (await cookies()).get(ERP_SESSION_COOKIE)?.value
  return token ? verifyErpAccessToken(token) : null
}
