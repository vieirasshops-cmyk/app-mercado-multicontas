import { MercadoLivreAccount, Product, MLApiResponse } from './types'

const ML_API_BASE = 'https://api.mercadolibre.com'

// Helper para detectar erros de scope
function isScopeError(error: any): boolean {
  if (!error) return false
  const errorStr = JSON.stringify(error).toLowerCase()
  return errorStr.includes('scope') || 
         errorStr.includes('read') || 
         errorStr.includes('write') || 
         errorStr.includes('offline_access')
}

// Validar formato do token
function isValidTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') return false
  
  const trimmedToken = token.trim()
  
  // Token deve ter pelo menos 20 caracteres
  if (trimmedToken.length < 20) return false
  
  // Formato esperado: APP_USR-XXXXX-XXXXXX-XXXXXXXX ou similar
  // Aceita também tokens que começam com números (como o fornecido)
  const validPatterns = [
    /^APP_USR-[\w-]+$/i,           // Formato padrão APP_USR-...
    /^[a-f0-9]{24}-\d+$/i,         // Formato alternativo (hex-número)
    /^[a-zA-Z0-9_-]{30,}$/         // Formato genérico (alfanumérico longo)
  ]
  
  return validPatterns.some(pattern => pattern.test(trimmedToken))
}

// Mensagem padrão para erros de scope
const SCOPE_ERROR_MESSAGE = `
🔒 ERRO DE PERMISSÃO - SCOPES NECESSÁRIOS

Sua aplicação precisa dos seguintes scopes:
✓ read
✓ write  
✓ offline_access

📋 COMO RESOLVER (3 passos):

1️⃣ Configure os Scopes:
   • Acesse: https://developers.mercadolibre.com.br/
   • Vá em "Minhas Aplicações" → Sua App
   • Marque os scopes: read, write, offline_access
   • Salve

2️⃣ Obtenha NOVO Código:
   • Na aba "Teste API" deste app
   • Clique em "Abrir Autorização"
   • Autorize novamente
   • Copie o código da URL

3️⃣ Gere NOVO Token:
   • Use o novo código para obter novo token
   • Cole o novo token e teste

⚠️ Token antigo NÃO funciona após mudar scopes!
`

export class MercadoLivreAPI {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  // Obter informações do usuário
  async getUserInfo(): Promise<MLApiResponse<any>> {
    try {
      if (!this.accessToken?.trim()) {
        return { data: null, success: false, error: 'Access token não fornecido' }
      }

      // Validar formato do token
      if (!isValidTokenFormat(this.accessToken)) {
        return { 
          data: null, 
          success: false, 
          error: `❌ Formato de token inválido!\n\n` +
                 `O token fornecido não parece ser um access token válido do Mercado Livre.\n\n` +
                 `✅ Formato esperado: APP_USR-1234567890-123456-abcdef...\n` +
                 `❌ Token recebido: ${this.accessToken.substring(0, 30)}...\n\n` +
                 `💡 Certifique-se de que você está usando o ACCESS TOKEN, não o código de autorização.`
        }
      }

      const url = `${ML_API_BASE}/users/me`
      
      console.log('🔍 Tentando conectar com Mercado Livre API...')
      console.log('📍 URL:', url)
      console.log('🔑 Token (primeiros 20 chars):', this.accessToken.substring(0, 20) + '...')
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
      console.log('📡 Status da resposta:', response.status, response.statusText)
      
      const data = await response.json()
      console.log('📦 Dados recebidos:', data)
      
      if (!response.ok) {
        // Verificar se é erro de scope
        if (isScopeError(data)) {
          return { data: null, success: false, error: SCOPE_ERROR_MESSAGE }
        }
        
        if (response.status === 401) {
          return { 
            data: null, 
            success: false, 
            error: `❌ Token inválido ou expirado (HTTP 401)\n\n` +
                   `Detalhes: ${data.message || JSON.stringify(data)}\n\n` +
                   `💡 Possíveis causas:\n` +
                   `• Token expirado (tokens expiram após algumas horas)\n` +
                   `• Token inválido ou corrompido\n` +
                   `• Você está usando código de autorização em vez de access token\n\n` +
                   `✅ Solução: Obtenha um novo access token`
          }
        }
        
        if (response.status === 403) {
          return { data: null, success: false, error: SCOPE_ERROR_MESSAGE }
        }
        
        return { 
          data: null, 
          success: false, 
          error: `❌ Erro HTTP ${response.status}\n\n` +
                 `Mensagem: ${data.message || JSON.stringify(data)}\n\n` +
                 `💡 Verifique se o token está correto e não expirou.`
        }
      }

      console.log('✅ Conexão bem-sucedida!')
      return { data, success: true }
    } catch (error: any) {
      console.error('❌ Erro na getUserInfo:', error)
      
      // Erros de rede
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return { 
          data: null, 
          success: false, 
          error: `❌ Erro de conexão com a API do Mercado Livre\n\n` +
                 `Detalhes: ${error.message}\n\n` +
                 `💡 Possíveis causas:\n` +
                 `• Sem conexão com a internet\n` +
                 `• Firewall ou proxy bloqueando a requisição\n` +
                 `• API do Mercado Livre temporariamente indisponível\n\n` +
                 `✅ Soluções:\n` +
                 `• Verifique sua conexão com a internet\n` +
                 `• Tente novamente em alguns minutos\n` +
                 `• Verifique se não há bloqueios de rede`
        }
      }
      
      return { 
        data: null, 
        success: false, 
        error: `❌ Erro inesperado ao conectar com a API\n\n` +
               `Detalhes: ${error.message || 'Erro desconhecido'}\n\n` +
               `💡 Tente novamente ou entre em contato com o suporte.`
      }
    }
  }

  // Listar produtos do usuário
  async getProducts(sellerId: string): Promise<MLApiResponse<Product[]>> {
    try {
      if (!this.accessToken?.trim() || !sellerId?.trim()) {
        return { data: [], success: false, error: 'Access token e seller ID são obrigatórios' }
      }

      const url = `${ML_API_BASE}/users/${encodeURIComponent(sellerId)}/items/search`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        // Verificar se é erro de scope
        if (isScopeError(data)) {
          return { data: [], success: false, error: SCOPE_ERROR_MESSAGE }
        }
        
        if (response.status === 401) {
          return { data: [], success: false, error: 'Token de acesso inválido ou expirado. Obtenha um novo token.' }
        }
        
        if (response.status === 403) {
          return { data: [], success: false, error: SCOPE_ERROR_MESSAGE }
        }
        
        return { data: [], success: false, error: data.message || `Erro HTTP: ${response.status}` }
      }

      if (!data.results?.length) {
        return { data: [], success: true }
      }

      // Buscar detalhes dos primeiros 50 produtos
      const products = await Promise.all(
        data.results.slice(0, 50).map(async (itemId: string) => {
          try {
            if (!itemId?.trim()) return null

            const itemUrl = `${ML_API_BASE}/items/${encodeURIComponent(itemId)}`
            
            const itemResponse = await fetch(itemUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            })
            
            if (!itemResponse.ok) return null
            
            const itemData = await itemResponse.json()
            
            return {
              id: itemData.id,
              title: itemData.title || 'Produto sem título',
              price: itemData.price || 0,
              stock: itemData.available_quantity || 0,
              status: itemData.status === 'active' ? 'active' : 'paused',
              account: sellerId,
              views: 0,
              sales: itemData.sold_quantity || 0,
              category: itemData.category_id || 'Sem categoria',
              images: itemData.pictures?.map((pic: any) => pic.url) || [],
              description: itemData.description || '',
              mlId: itemData.id
            } as Product
          } catch (error) {
            return null
          }
        })
      )

      const validProducts = products.filter(product => product !== null) as Product[]

      return { data: validProducts, success: true }
    } catch (error) {
      console.error('Erro na getProducts:', error)
      return { data: [], success: false, error: 'Erro ao buscar produtos' }
    }
  }

  // Obter estatísticas de vendas
  async getSalesStats(sellerId: string): Promise<MLApiResponse<any>> {
    try {
      if (!this.accessToken?.trim() || !sellerId?.trim()) {
        return { data: { period_sales: 0, total_sales: 0 }, success: true }
      }

      const url = `${ML_API_BASE}/users/${encodeURIComponent(sellerId)}/metrics`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        // Retornar dados padrão se não tiver acesso
        return { data: { period_sales: 0, total_sales: 0 }, success: true }
      }

      return { data, success: true }
    } catch (error) {
      return { data: { period_sales: 0, total_sales: 0 }, success: true }
    }
  }

  // Sincronizar dados da conta
  async syncAccount(account: MercadoLivreAccount): Promise<MLApiResponse<MercadoLivreAccount>> {
    try {
      // Obter informações do usuário
      const userInfo = await this.getUserInfo()
      if (!userInfo.success) {
        return { data: account, success: false, error: userInfo.error }
      }
      
      // Tentar obter produtos
      let productsCount = 0
      const products = await this.getProducts(userInfo.data.id)
      if (products.success) {
        productsCount = products.data?.length || 0
      }
      
      // Tentar obter estatísticas
      let salesCount = account.sales
      const stats = await this.getSalesStats(userInfo.data.id)
      if (stats.success && stats.data) {
        salesCount = stats.data.period_sales || stats.data.total_sales || account.sales
      }

      const updatedAccount: MercadoLivreAccount = {
        ...account,
        nickname: userInfo.data.nickname || account.nickname,
        email: userInfo.data.email || account.email,
        reputation: userInfo.data.seller_reputation?.power_seller_status ? 95 : 
                   userInfo.data.seller_reputation?.level_id ? 85 : 75,
        products: productsCount,
        sales: salesCount,
        lastSync: new Date().toLocaleString('pt-BR'),
        userId: userInfo.data.id
      }

      return { data: updatedAccount, success: true }
    } catch (error) {
      console.error('Erro na syncAccount:', error)
      return { data: account, success: false, error: 'Erro na sincronização' }
    }
  }
}

// Trocar código de autorização por access token
export async function exchangeCodeForToken(
  code: string, 
  clientId: string, 
  clientSecret: string, 
  redirectUri: string
): Promise<MLApiResponse<any>> {
  try {
    // Validar parâmetros
    if (!code?.trim()) {
      return { data: null, success: false, error: 'Código de autorização é obrigatório' }
    }
    if (!clientId?.trim()) {
      return { data: null, success: false, error: 'Client ID é obrigatório' }
    }
    if (!clientSecret?.trim()) {
      return { data: null, success: false, error: 'Client Secret é obrigatório' }
    }
    if (!redirectUri?.trim()) {
      return { data: null, success: false, error: 'Redirect URI é obrigatório' }
    }

    const cleanCode = code.trim().replace(/\s+/g, '')
    
    const requestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
      code: cleanCode,
      redirect_uri: redirectUri.trim()
    })

    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: requestBody
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      // Verificar se é erro de scope
      if (isScopeError(data)) {
        return { data: null, success: false, error: SCOPE_ERROR_MESSAGE }
      }
      
      let errorMessage = 'Erro desconhecido'
      
      if (data.error) {
        switch (data.error) {
          case 'invalid_grant':
            errorMessage = 'Código de autorização inválido ou expirado. Obtenha um novo código.'
            break
          case 'invalid_client':
            errorMessage = 'Client ID ou Client Secret inválidos. Verifique suas credenciais.'
            break
          case 'invalid_request':
            errorMessage = 'Requisição inválida. Verifique se todos os campos estão preenchidos corretamente.'
            break
          case 'invalid_scope':
            errorMessage = SCOPE_ERROR_MESSAGE
            break
          default:
            errorMessage = data.error_description || data.message || data.error
        }
      }
      
      return { data: null, success: false, error: errorMessage }
    }

    return { data, success: true }
  } catch (error) {
    console.error('Erro inesperado:', error)
    return { data: null, success: false, error: 'Erro de rede ou conexão. Verifique sua internet e tente novamente.' }
  }
}

// Testar conexão com a API
export async function testAPIConnection(accessToken: string): Promise<MLApiResponse<any>> {
  try {
    if (!accessToken?.trim()) {
      return { data: null, success: false, error: 'Access token é obrigatório' }
    }

    const api = new MercadoLivreAPI(accessToken)
    return await api.getUserInfo()
  } catch (error) {
    console.error('Erro inesperado no teste de conexão:', error)
    return { data: null, success: false, error: 'Erro inesperado ao testar conexão' }
  }
}

// Utilitários para formatação
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export const getStatusText = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'active': 'Ativo',
    'inactive': 'Inativo',
    'suspended': 'Suspenso',
    'paused': 'Pausado',
    'ended': 'Finalizado'
  }
  return statusMap[status] || status
}

export const calculateMetrics = (accounts: MercadoLivreAccount[], products: Product[]) => {
  const totalSales = accounts.reduce((sum, acc) => sum + acc.sales, 0)
  const totalProducts = accounts.reduce((sum, acc) => sum + acc.products, 0)
  const totalViews = products.reduce((sum, prod) => sum + prod.views, 0)
  const totalRevenue = products.reduce((sum, prod) => sum + (prod.price * prod.sales), 0)
  
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0
  const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0

  return {
    totalSales,
    totalProducts,
    totalViews,
    totalRevenue,
    averageTicket,
    conversionRate
  }
}

// Diagnosticar problemas de autorização
export function diagnoseAuthorizationError(error: string): string {
  const lowerError = error.toLowerCase()
  
  if (lowerError.includes('scope') || 
      lowerError.includes('unauthorized') || 
      lowerError.includes('policy') || 
      lowerError.includes('permissão')) {
    return SCOPE_ERROR_MESSAGE
  }
  
  return error
}
