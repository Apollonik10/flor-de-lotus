import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  
  try {
    const body = await req.json()
    
    // Webhook da Efí contém um array de eventos no campo 'pix'
    if (body.pix && body.pix.length > 0) {
      for (const pix of body.pix) {
        const txid = pix.txid // Identificador da cobrança
        
        // Atualizar pedido no Supabase
        await supabase
          .from('orders')
          .update({ status: 'pago' })
          .eq('id', txid) // Assumindo que txid é o seu id do pedido
      }
    }
    
    return new Response(JSON.stringify({ status: "ok" }), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
