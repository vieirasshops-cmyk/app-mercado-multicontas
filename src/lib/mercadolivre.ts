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
      const response = await fetch(`${ML_API_BASE}/users/me?access_token=${this.accessToken}`)
      const data = await response.json()
      
      if (!response.ok) {
        return { data: null, success: false, error: data.message || `Erro HTTP: ${response.status}` }
      }

      return { data, success: true }
    } catch (error) {
      return { data: null, success: false, error: 'Erro ao conectar com a API do Mercado Livre' }
    }
  }

  // Listar produtos do usuário
  async getProducts(sellerId: string): Promise<MLApiResponse<Product[]>> {
    try {
      const response = await fetch(
        `${ML_API_BASE}/users/${sellerId}/items/search?access_token=${this.accessToken}`
      )
      const data = await response.json()
      
      if (!response.ok) {
        return { data: [], success: false, error: data.message }
      }

      // Buscar detalhes de cada produto
      const products = await Promise.all(
        data.results.slice(0, 50).map(async (itemId: string) => {
          const itemResponse = await fetch(`${ML_API_BASE}/items/${itemId}`)
          const itemData = await itemResponse.json()
          
          return {
            id: itemData.id,
            title: itemData.title,
            price: itemData.price,
            stock: itemData.available_quantity,
            status: itemData.status === 'active' ? 'active' : 'paused',
            account: sellerId,
            views: 0, // Seria necessário outra chamada para obter views
            sales: itemData.sold_quantity,
            category: itemData.category_id,
            images: itemData.pictures?.map((pic: any) => pic.url) || [],
            description: itemData.description,
            mlId: itemData.id
          } as Product
        })
      )

      return { data: products, success: true }
    } catch (error) {
      return { data: [], success: false, error: 'Erro ao buscar produtos' }
    }
  }

  // Obter estatísticas de vendas
  async getSalesStats(sellerId: string): Promise<MLApiResponse<any>> {
    try {
      const response = await fetch(
        `${ML_API_BASE}/users/${sellerId}/metrics?access_token=${this.accessToken}`
      )
      const data = await response.json()
      
      if (!response.ok) {
        return { data: null, success: false, error: data.message }
      }

      return { data, success: true }
    } catch (error) {
      return { data: null, success: false, error: 'Erro ao buscar estatísticas' }
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

      // Obter produtos
      const products = await this.getProducts(userInfo.data.id)
      
      // Obter estatísticas
      const stats = await this.getSalesStats(userInfo.data.id)

      const updatedAccount: MercadoLivreAccount = {
        ...account,
        reputation: userInfo.data.seller_reputation?.power_seller_status ? 95 : 85,
        products: products.data?.length || 0,
        sales: stats.data?.period_sales || account.sales,
        lastSync: new Date().toLocaleString('pt-BR'),
        userId: userInfo.data.id
      }

      return { data: updatedAccount, success: true }
    } catch (error) {
      return { data: account, success: false, error: 'Erro na sincronização' }
    }
  }
}

// Função para trocar código de autorização por access token
export async function exchangeCodeForToken(code: string, clientId: string, clientSecret: string, redirectUri: string): Promise<MLApiResponse<any>> {
  try {
    console.log('🔄 Iniciando troca do código por token...')
    console.log('📋 Parâmetros:', {
      code: code.substring(0, 10) + '...',
      clientId: clientId.substring(0, 10) + '...',
      redirectUri
    })

    // Limpar espaços e caracteres especiais do código
    const cleanCode = code.trim().replace(/\s+/g, '')
    
    const requestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
      code: cleanCode,
      redirect_uri: redirectUri.trim()
    })

    console.log('📤 Enviando requisição para:', 'https://api.mercadolibre.com/oauth/token')
    console.log('📋 Body da requisição:', requestBody.toString())

    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'MercadoLivre-Integration/1.0'
      },
      body: requestBody
    })

    console.log('📥 Status da resposta:', response.status)
    
    const data = await response.json()
    console.log('📋 Resposta da API:', data)
    
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
          case 'unsupported_grant_type':
            errorMessage = 'Tipo de grant não suportado.'
            break
          default:
            errorMessage = data.error_description || data.message || data.error
        }
      }
      
      console.error('❌ Erro na troca do token:', errorMessage)
      return { 
        data: null, 
        success: false, 
        error: errorMessage
      }
    }

    console.log('✅ Token obtido com sucesso!')
    return { data, success: true }
  } catch (error) {
    console.error('❌ Erro inesperado:', error)
    return { 
      data: null, 
      success: false, 
      error: 'Erro de rede ou conexão. Verifique sua internet e tente novamente.' 
    }
  }
}

// Função para testar conexão com a API usando access token
export async function testAPIConnection(accessToken: string): Promise<MLApiResponse<any>> {
  console.log('🔍 Testando conexão com access token...')
  const api = new MercadoLivreAPI(accessToken)
  const result = await api.getUserInfo()
  
  if (result.success) {
    console.log('✅ Conexão testada com sucesso!')
  } else {
    console.error('❌ Falha no teste de conexão:', result.error)
  }
  
  return result
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