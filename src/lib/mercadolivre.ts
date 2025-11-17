import { MercadoLivreAccount, Product, MLApiResponse } from './types'

const ML_API_BASE = 'https://api.mercadolibre.com'

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

      const url = `${ML_API_BASE}/users/me`
      
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
        if (response.status === 401) {
          return { data: null, success: false, error: 'Token de acesso inválido ou expirado. Obtenha um novo token com os scopes: read, write, offline_access' }
        }
        if (response.status === 403) {
          return { 
            data: null, 
            success: false, 
            error: '🔒 ERRO DE PERMISSÃO: Sua aplicação não tem os scopes necessários. Configure os scopes: read, write, offline_access na sua aplicação do Mercado Livre e obtenha um NOVO token.' 
          }
        }
        return { data: null, success: false, error: data.message || `Erro HTTP: ${response.status}` }
      }

      return { data, success: true }
    } catch (error) {
      console.error('Erro na getUserInfo:', error)
      return { data: null, success: false, error: 'Erro ao conectar com a API do Mercado Livre' }
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
        if (response.status === 401) {
          return { data: [], success: false, error: 'Token de acesso inválido ou expirado. Obtenha um novo token com os scopes: read, write, offline_access' }
        }
        if (response.status === 403) {
          return { data: [], success: false, error: 'Sua aplicação não tem permissão para acessar os produtos. Configure os scopes: read, write, offline_access' }
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
            errorMessage = 'Scopes inválidos. Configure os scopes: read, write, offline_access na sua aplicação.'
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
  
  if (lowerError.includes('unauthorized') || lowerError.includes('policy') || lowerError.includes('permissão')) {
    return `
🔧 PROBLEMA DE AUTORIZAÇÃO DETECTADO

O erro indica que sua aplicação não tem as permissões necessárias.

✅ PASSO A PASSO PARA RESOLVER:

1️⃣ Configure os Scopes na Sua Aplicação:
   • Acesse: https://developers.mercadolibre.com.br/
   • Faça login e vá em "Minhas Aplicações"
   • Selecione sua aplicação
   • Na seção "Scopes", marque: read, write, offline_access
   • Salve as alterações

2️⃣ Obtenha um NOVO Código de Autorização:
   • Volte para a aba "Teste API" neste aplicativo
   • Digite seu Client ID
   • Clique em "Abrir Autorização"
   • Autorize a aplicação novamente
   • Copie o código retornado na URL

3️⃣ Troque por um NOVO Access Token:
   • Use o código novo para obter um access token atualizado
   • O novo token terá os scopes corretos

4️⃣ Cole o Novo Token:
   • Volte para "Teste API"
   • Cole o novo access token
   • Clique em "Testar Token e Adicionar Conta"

⚠️ IMPORTANTE: 
• Tokens antigos NÃO funcionarão mesmo após configurar os scopes
• Você PRECISA obter um novo código e novo token
• Certifique-se de que os scopes estão marcados ANTES de autorizar
    `
  }
  
  return error
}
