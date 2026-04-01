import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('mt5_api_token', token)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const body = await request.json()
  const {
    platform, balance, equity, margin, freeMargin,
    openTrades, accountNumber, accountCurrency,
    accountType, brokerName, serverName, leverage,
  } = body

  const { error } = await supabase
    .from('mt5_accounts')
    .upsert({
      user_id:          profile.id,
      platform:         platform || 'MT5',
      balance,
      equity,
      margin,
      free_margin:      freeMargin,
      open_trades:      openTrades,
      account_number:   accountNumber,
      account_currency: accountCurrency,
      account_type:     accountType,
      broker_name:      brokerName,
      server_name:      serverName,
      leverage,
      synced_at:        new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) {
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true, synced_at: new Date().toISOString() })
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const bearerToken = authHeader?.replace('Bearer ', '')

  if (!bearerToken) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(bearerToken)

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('mt5_accounts')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ connected: false })
  }

  return NextResponse.json({ connected: true, ...data })
}
