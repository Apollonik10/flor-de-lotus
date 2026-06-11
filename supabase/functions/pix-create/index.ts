import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const EFI_CLIENT_ID = Deno.env.get('EFI_CLIENT_ID')
const EFI_CLIENT_SECRET = Deno.env.get('EFI_CLIENT_SECRET')
const EFI_API_URL = Deno.env.get('EFI_API_URL') // Deve ser sandbox ou produção

// Função para autenticar na Efí
async function getEfiToken() {
  const credentials = btoa(`${EFI_CLIENT_ID}:${EFI_CLIENT_SECRET}`)
  const response = await fetch(`${EFI_API_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ grant_type: 'client_credentials' })
  })
  const data = await response.json()
  return data.access_token
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  
  try {
    const { value, orderId } = await req.json()
    const token = await getEfiToken()

    // Criar cobrança PIX (Pix Cob)
    const response = await fetch(`${EFI_API_URL}/v2/cob`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valor: { original: value.toFixed(2) },
        chave: Deno.env.get('EFI_PIX_KEY'),
        solicitacaoPagamento: `Pedido #${orderId}`
      })
    })

    const cob = await response.json()
    
    // Retornar dados para o front (qrcode e copia e cola)
    return new Response(JSON.stringify(cob), { 
      headers: { "Content-Type": "application/json" } 
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
