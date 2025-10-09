"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  User, 
  Store, 
  Star,
  Package,
  DollarSign,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Clock,
  Zap,
  Download,
  Database,
  ArrowRight,
  Bug,
  Info
} from 'lucide-react'
import { exchangeCodeForToken, testAPIConnection, MercadoLivreAPI } from '@/lib/mercadolivre'
import { MercadoLivreAccount, Product } from '@/lib/types'

interface TestResult {
  success: boolean
  data?: any
  error?: string
  timestamp: string
}

interface APITesterProps {
  onAccountImport?: (account: MercadoLivreAccount, products: Product[]) => void
}

export default function APITester({ onAccountImport }: APITesterProps) {
  const [authCode, setAuthCode] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [redirectUri, setRedirectUri] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [tokenResult, setTokenResult] = useState<TestResult | null>(null)
  const [showSecret, setShowSecret] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [autoExchangeEnabled, setAutoExchangeEnabled] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null)
  const [debugMode, setDebugMode] = useState(false)

  // Efeito para trocar automaticamente o código por token quando todos os campos estiverem preenchidos
  useEffect(() => {
    if (autoExchangeEnabled && authCode && clientId && clientSecret && redirectUri && authCode.length > 10) {
      // Pequeno delay para evitar múltiplas chamadas
      const timer = setTimeout(() => {
        handleExchangeToken(true) // true indica que é automático
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [authCode, clientId, clientSecret, redirectUri, autoExchangeEnabled])

  const handleExchangeToken = async (isAutomatic = false) => {
    if (!authCode || !clientId || !clientSecret || !redirectUri) {
      if (!isAutomatic) {
        setTokenResult({
          success: false,
          error: 'Preencha todos os campos obrigatórios',
          timestamp: new Date().toLocaleString('pt-BR')
        })
      }
      return
    }

    setIsLoading(true)
    setTokenResult(null)
    setAccessToken('') // Limpar token anterior

    try {
      console.log('🚀 Iniciando processo de troca do código por token...')
      const result = await exchangeCodeForToken(authCode, clientId, clientSecret, redirectUri)
      
      if (result.success && result.data) {
        setAccessToken(result.data.access_token)
        setTokenResult({
          success: true,
          data: result.data,
          timestamp: new Date().toLocaleString('pt-BR')
        })
        
        console.log('✅ Token obtido com sucesso:', result.data.access_token.substring(0, 20) + '...')
        
        // Se foi automático e bem-sucedido, também testa a conexão automaticamente
        if (isAutomatic && result.data.access_token) {
          setTimeout(() => {
            handleTestConnection(result.data.access_token, true)
          }, 1000)
        }
      } else {
        console.error('❌ Erro ao obter token:', result.error)
        setTokenResult({
          success: false,
          error: result.error || 'Erro desconhecido',
          timestamp: new Date().toLocaleString('pt-BR')
        })
      }
    } catch (error) {
      console.error('❌ Erro inesperado:', error)
      setTokenResult({
        success: false,
        error: 'Erro inesperado ao trocar código por token',
        timestamp: new Date().toLocaleString('pt-BR')
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestConnection = async (token?: string, isAutomatic = false) => {
    const tokenToUse = token || accessToken
    
    if (!tokenToUse) {
      if (!isAutomatic) {
        setTestResult({
          success: false,
          error: 'Access token é obrigatório',
          timestamp: new Date().toLocaleString('pt-BR')
        })
      }
      return
    }

    if (!isAutomatic) {
      setIsLoading(true)
    }
    setTestResult(null)

    try {
      console.log('🔍 Testando conexão com a API...')
      const result = await testAPIConnection(tokenToUse)
      
      setTestResult({
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: new Date().toLocaleString('pt-BR')
      })
    } catch (error) {
      console.error('❌ Erro no teste de conexão:', error)
      setTestResult({
        success: false,
        error: 'Erro inesperado ao testar conexão',
        timestamp: new Date().toLocaleString('pt-BR')
      })
    } finally {
      if (!isAutomatic) {
        setIsLoading(false)
      }
    }
  }

  const handleImportToSystem = async () => {
    if (!accessToken || !testResult?.success || !testResult.data) {
      setImportResult({
        success: false,
        message: 'É necessário ter uma conexão bem-sucedida antes de importar'
      })
      return
    }

    setIsImporting(true)
    setImportResult(null)

    try {
      const api = new MercadoLivreAPI(accessToken)
      const userData = testResult.data

      // Criar conta baseada nos dados do usuário
      const newAccount: MercadoLivreAccount = {
        id: Date.now().toString(),
        nickname: userData.nickname,
        email: userData.email || `${userData.nickname}@mercadolivre.com`,
        status: userData.status === 'active' ? 'active' : 'inactive',
        reputation: userData.seller_reputation?.power_seller_status ? 95 : 
                   userData.seller_reputation?.level_id === '5_green' ? 90 :
                   userData.seller_reputation?.level_id === '4_light_green' ? 85 :
                   userData.seller_reputation?.level_id === '3_yellow' ? 75 : 70,
        sales: userData.seller_reputation?.transactions?.total || 0,
        products: 0, // Será atualizado após buscar produtos
        lastSync: new Date().toLocaleString('pt-BR'),
        accessToken: accessToken,
        userId: userData.id
      }

      // Buscar produtos do usuário
      const productsResult = await api.getProducts(userData.id)
      let products: Product[] = []

      if (productsResult.success && productsResult.data) {
        products = productsResult.data.map(product => ({
          ...product,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // ID único para o sistema local
          account: userData.nickname
        }))
        
        // Atualizar contagem de produtos na conta
        newAccount.products = products.length
      }

      // Chamar callback para importar no sistema principal
      if (onAccountImport) {
        onAccountImport(newAccount, products)
        setImportResult({
          success: true,
          message: `✅ Conta "${userData.nickname}" importada com sucesso! ${products.length} produtos foram sincronizados.`
        })
      } else {
        setImportResult({
          success: false,
          message: 'Função de importação não está disponível'
        })
      }

    } catch (error) {
      console.error('❌ Erro na importação:', error)
      setImportResult({
        success: false,
        message: 'Erro ao importar dados para o sistema'
      })
    } finally {
      setIsImporting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const generateAuthUrl = () => {
    if (!clientId || !redirectUri) {
      alert('Preencha Client ID e Redirect URI primeiro')
      return
    }
    
    const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`
    console.log('🔗 URL de autorização gerada:', authUrl)
    window.open(authUrl, '_blank')
  }

  const isCodeExpiredError = (error: string) => {
    return error.includes('authorization code') && error.includes('invalid') ||
           error.includes('grant') && error.includes('invalid') ||
           error.includes('expired') ||
           error.includes('inválido') ||
           error.includes('expirado')
  }

  const validateCode = (code: string) => {
    // Código do ML geralmente tem formato específico
    const cleanCode = code.trim()
    if (cleanCode.length < 10) {
      return 'Código muito curto - verifique se copiou corretamente'
    }
    if (cleanCode.includes(' ')) {
      return 'Código contém espaços - remova espaços extras'
    }
    if (cleanCode.includes('?code=')) {
      return 'Copie apenas o valor após ?code=, não a URL inteira'
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <TestTube className="w-6 h-6 mr-2 text-blue-600" />
          Teste da API Mercado Livre
        </h2>
        <p className="text-gray-600">Teste sua integração e importe dados reais para o sistema</p>
        
        {/* Toggle de debug */}
        <div className="flex items-center space-x-2 mt-2">
          <input 
            type="checkbox" 
            id="debugMode" 
            checked={debugMode}
            onChange={(e) => setDebugMode(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="debugMode" className="text-sm text-gray-600 flex items-center">
            <Bug className="w-4 h-4 mr-1" />
            Modo Debug (logs detalhados)
          </label>
        </div>
      </div>

      {/* Alerta sobre sincronização automática */}
      <Alert className="border-green-200 bg-green-50">
        <Zap className="w-5 h-5 text-green-600" />
        <AlertDescription className="text-green-800">
          <div className="space-y-2">
            <p className="font-medium">⚡ Sincronização Automática Ativada!</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>Quando você colar o código de autorização, o token será obtido <strong>automaticamente</strong></li>
              <li>Após obter o token, a conexão será testada <strong>automaticamente</strong></li>
              <li>Com conexão bem-sucedida, você pode <strong>importar os dados reais</strong> para o sistema</li>
            </ul>
            <div className="flex items-center space-x-2 mt-2">
              <input 
                type="checkbox" 
                id="autoExchange" 
                checked={autoExchangeEnabled}
                onChange={(e) => setAutoExchangeEnabled(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="autoExchange" className="text-sm font-medium">
                Ativar sincronização automática
              </label>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Alerta sobre código expirado */}
      <Alert className="border-amber-200 bg-amber-50">
        <Clock className="w-5 h-5 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <div className="space-y-2">
            <p className="font-medium">⚠️ Importante sobre códigos de autorização:</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>Códigos OAuth expiram em <strong>10 minutos</strong></li>
              <li>Cada código pode ser usado <strong>apenas uma vez</strong></li>
              <li>Se der erro, você precisa obter um <strong>novo código</strong></li>
              <li>Copie <strong>apenas o valor</strong> após ?code= (sem espaços)</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {/* Seção 0: Configuração da aplicação */}
      <Card className="shadow-lg border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Store className="w-5 h-5 mr-2 text-blue-600" />
            Configuração da Aplicação
          </CardTitle>
          <CardDescription>
            Configure as credenciais da sua aplicação no Mercado Livre
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientId">Client ID *</Label>
              <Input
                id="clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="3022997452168462"
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label htmlFor="clientSecret">Client Secret *</Label>
              <div className="relative">
                <Input
                  id="clientSecret"
                  type={showSecret ? "text" : "password"}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Secret da sua aplicação"
                  className="pr-10 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
          
          <div>
            <Label htmlFor="redirectUri">Redirect URI *</Label>
            <Input
              id="redirectUri"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              placeholder="https://developers.mercadolivre.com.br/devcenter"
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Deve ser exatamente igual ao configurado na sua aplicação
            </p>
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={generateAuthUrl}
              disabled={!clientId || !redirectUri}
              variant="outline"
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Obter Novo Código de Autorização
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Seção 1: Trocar código por token */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <RefreshCw className="w-5 h-5 mr-2 text-green-600" />
            Passo 1: Código de Autorização
            {autoExchangeEnabled && (
              <Badge className="ml-2 bg-green-100 text-green-800">
                <Zap className="w-3 h-3 mr-1" />
                Auto
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Cole o código de autorização - o token será obtido automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="authCode">Código de Autorização *</Label>
            <Input
              id="authCode"
              value={authCode}
              onChange={(e) => {
                const newCode = e.target.value
                setAuthCode(newCode)
                
                // Validação em tempo real
                if (newCode && debugMode) {
                  const validation = validateCode(newCode)
                  if (validation) {
                    console.warn('⚠️ Validação do código:', validation)
                  }
                }
              }}
              placeholder="Cole aqui o código da URL: ?code=XXXXXXXX"
              className="font-mono text-sm"
            />
            <div className="text-xs text-gray-500 mt-1 space-y-1">
              <p>
                {autoExchangeEnabled 
                  ? "⚡ Sincronização automática ativa - cole o código e aguarde"
                  : "Copie o valor do parâmetro \"code\" da URL de callback"
                }
              </p>
              {authCode && debugMode && (
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-blue-700 font-medium">🔍 Debug - Código analisado:</p>
                  <p className="text-blue-600">Comprimento: {authCode.length} caracteres</p>
                  <p className="text-blue-600">Contém espaços: {authCode.includes(' ') ? 'Sim ⚠️' : 'Não ✅'}</p>
                  <p className="text-blue-600">Formato válido: {validateCode(authCode) ? '❌' : '✅'}</p>
                  {validateCode(authCode) && (
                    <p className="text-red-600 font-medium">⚠️ {validateCode(authCode)}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {!autoExchangeEnabled && (
            <Button 
              onClick={() => handleExchangeToken(false)}
              disabled={isLoading || !authCode || !clientId || !clientSecret || !redirectUri}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Trocando código...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Trocar Código por Token
                </>
              )}
            </Button>
          )}

          {isLoading && autoExchangeEnabled && (
            <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Loader2 className="w-5 h-5 mr-2 animate-spin text-blue-600" />
              <span className="text-blue-700 font-medium">Processando automaticamente...</span>
            </div>
          )}

          {tokenResult && (
            <Alert className={tokenResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <div className="flex items-start space-x-2">
                {tokenResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription>
                    {tokenResult.success ? (
                      <div className="space-y-2">
                        <p className="font-medium text-green-800">
                          ✅ Token obtido com sucesso!
                          {autoExchangeEnabled && (
                            <Badge className="ml-2 bg-green-100 text-green-800">
                              <Zap className="w-3 h-3 mr-1" />
                              Automático
                            </Badge>
                          )}
                        </p>
                        <div className="bg-white p-3 rounded border">
                          <p className="text-sm font-medium mb-1">Access Token:</p>
                          <div className="flex items-center space-x-2">
                            <code className="text-xs bg-gray-100 p-1 rounded flex-1 truncate">
                              {tokenResult.data.access_token}
                            </code>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(tokenResult.data.access_token)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Expira em: {tokenResult.data.expires_in} segundos
                          </p>
                        </div>
                        {autoExchangeEnabled && (
                          <div className="p-2 bg-blue-50 rounded border border-blue-200">
                            <p className="text-sm text-blue-700">
                              🔄 Testando conexão automaticamente...
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium text-red-800">❌ Erro ao obter token</p>
                          <p className="text-sm text-red-700 mt-1">{tokenResult.error}</p>
                        </div>
                        
                        {isCodeExpiredError(tokenResult.error || '') && (
                          <div className="p-3 bg-red-50 rounded border border-red-200">
                            <div className="flex items-start space-x-2">
                              <Clock className="w-4 h-4 text-red-600 mt-0.5" />
                              <div className="text-sm text-red-700">
                                <p className="font-medium">🔄 Código expirado ou já usado!</p>
                                <p className="mt-1">Você precisa obter um novo código de autorização:</p>
                                <ol className="list-decimal list-inside mt-2 space-y-1">
                                  <li>Clique em "Obter Novo Código de Autorização" acima</li>
                                  <li>Faça login na sua conta do Mercado Livre</li>
                                  <li>Autorize sua aplicação</li>
                                  <li>Copie o novo código da URL de callback</li>
                                  <li>Cole aqui e {autoExchangeEnabled ? 'aguarde a sincronização automática' : 'tente novamente'}</li>
                                </ol>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="p-3 bg-red-50 rounded border border-red-200">
                          <div className="flex items-start space-x-2">
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                            <div className="text-sm text-red-700">
                              <p className="font-medium">Outras possíveis causas:</p>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                <li>Client ID ou Client Secret incorretos</li>
                                <li>Redirect URI não confere exatamente com o cadastrado</li>
                                <li>Aplicação não está ativa no Mercado Livre</li>
                                <li>Código copiado incorretamente (com espaços ou caracteres extras)</li>
                                <li>Código já foi usado anteriormente</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        {debugMode && (
                          <div className="p-3 bg-gray-50 rounded border border-gray-200">
                            <div className="flex items-start space-x-2">
                              <Info className="w-4 h-4 text-gray-600 mt-0.5" />
                              <div className="text-sm text-gray-700">
                                <p className="font-medium">🔍 Informações de Debug:</p>
                                <ul className="list-disc list-inside mt-1 space-y-1">
                                  <li>Código usado: {authCode.substring(0, 10)}...</li>
                                  <li>Client ID: {clientId.substring(0, 10)}...</li>
                                  <li>Redirect URI: {redirectUri}</li>
                                  <li>Timestamp: {tokenResult.timestamp}</li>
                                </ul>
                                <p className="mt-2 text-xs">Verifique o console do navegador para logs detalhados</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Testado em: {tokenResult.timestamp}
                    </p>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Seção 2: Testar conexão */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2 text-blue-600" />
            Passo 2: Teste de Conexão
            {autoExchangeEnabled && (
              <Badge className="ml-2 bg-blue-100 text-blue-800">
                <Zap className="w-3 h-3 mr-1" />
                Auto
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {autoExchangeEnabled 
              ? "A conexão será testada automaticamente após obter o token"
              : "Teste se o access token está funcionando corretamente"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="accessToken">Access Token</Label>
            <div className="relative">
              <Textarea
                id="accessToken"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Cole aqui o access token obtido no passo anterior"
                className="font-mono text-sm min-h-[80px] pr-10"
                style={{ WebkitTextSecurity: showToken ? 'none' : 'disc' }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {!autoExchangeEnabled && (
            <Button 
              onClick={() => handleTestConnection()}
              disabled={isLoading || !accessToken}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testando conexão...
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4 mr-2" />
                  Testar Conexão com API
                </>
              )}
            </Button>
          )}

          {testResult && (
            <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <div className="flex items-start space-x-2">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription>
                    {testResult.success ? (
                      <div className="space-y-3">
                        <p className="font-medium text-green-800">
                          🎉 Conexão bem-sucedida!
                          {autoExchangeEnabled && (
                            <Badge className="ml-2 bg-green-100 text-green-800">
                              <Zap className="w-3 h-3 mr-1" />
                              Automático
                            </Badge>
                          )}
                        </p>
                        
                        <div className="bg-white p-4 rounded border space-y-3">
                          <h4 className="font-medium text-gray-900">Informações da Conta:</h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium">ID:</span>
                                <Badge variant="outline">{testResult.data.id}</Badge>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Store className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-medium">Nickname:</span>
                                <Badge className="bg-green-100 text-green-800">
                                  {testResult.data.nickname}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Star className="w-4 h-4 text-yellow-600" />
                                <span className="text-sm font-medium">Reputação:</span>
                                <Badge className="bg-yellow-100 text-yellow-800">
                                  {testResult.data.seller_reputation?.level_id || 'N/A'}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Package className="w-4 h-4 text-purple-600" />
                                <span className="text-sm font-medium">Site:</span>
                                <Badge variant="outline">{testResult.data.site_id}</Badge>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <DollarSign className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-medium">Status:</span>
                                <Badge className={
                                  testResult.data.status === 'active' 
                                    ? "bg-green-100 text-green-800" 
                                    : "bg-red-100 text-red-800"
                                }>
                                  {testResult.data.status}
                                </Badge>
                              </div>
                              
                              {testResult.data.seller_reputation?.transactions?.total && (
                                <div className="flex items-center space-x-2">
                                  <Star className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm font-medium">Transações:</span>
                                  <Badge className="bg-blue-100 text-blue-800">
                                    {testResult.data.seller_reputation.transactions.total}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>

                          {testResult.data.email && (
                            <div className="pt-2 border-t">
                              <p className="text-sm text-gray-600">
                                <strong>Email:</strong> {testResult.data.email}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Botão para importar dados para o sistema */}
                        <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Database className="w-6 h-6 text-purple-600" />
                              <div>
                                <p className="font-medium text-purple-800">Importar para o Sistema</p>
                                <p className="text-sm text-purple-600">
                                  Adicione esta conta e seus produtos ao sistema principal
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={handleImportToSystem}
                              disabled={isImporting}
                              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                            >
                              {isImporting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Importando...
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4 mr-2" />
                                  Importar Dados
                                  <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium text-red-800">❌ Falha na conexão</p>
                        <p className="text-sm text-red-700 mt-1">{testResult.error}</p>
                        
                        <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                          <div className="flex items-start space-x-2">
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                            <div className="text-sm text-red-700">
                              <p className="font-medium">Possíveis causas:</p>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                <li>Access token inválido ou expirado</li>
                                <li>Token copiado incorretamente</li>
                                <li>Problema de conectividade com a API</li>
                                <li>Aplicação sem permissões adequadas</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Testado em: {testResult.timestamp}
                    </p>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          {/* Resultado da importação */}
          {importResult && (
            <Alert className={importResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <div className="flex items-start space-x-2">
                {importResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription>
                    <p className={importResult.success ? "text-green-800" : "text-red-800"}>
                      {importResult.message}
                    </p>
                    {importResult.success && (
                      <p className="text-sm text-green-600 mt-2">
                        💡 Vá para a aba "Contas ML" ou "Produtos" para ver os dados importados!
                      </p>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Instruções detalhadas */}
      <Card className="shadow-lg border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-700">
            <AlertCircle className="w-5 h-5 mr-2" />
            Guia Passo a Passo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-700 space-y-3">
            <div className="p-3 bg-green-50 rounded border border-green-200">
              <p className="font-medium text-green-800 mb-2">⚡ Como usar a sincronização automática:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Preencha Client ID, Client Secret e Redirect URI</li>
                <li>Clique em "Obter Novo Código de Autorização"</li>
                <li>Autorize sua aplicação no Mercado Livre</li>
                <li>Copie <strong>APENAS o código</strong> da URL (após ?code=)</li>
                <li>Cole no campo "Código de Autorização"</li>
                <li><strong>Aguarde!</strong> O sistema fará tudo automaticamente</li>
                <li><strong>Clique em "Importar Dados"</strong> para adicionar ao sistema principal</li>
              </ol>
            </div>
            
            <div className="p-3 bg-purple-50 rounded border border-purple-200">
              <p className="font-medium text-purple-800 mb-2">🎯 Novo: Importação de Dados Reais!</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Conta real:</strong> Importa nickname, email, reputação e estatísticas</li>
                <li><strong>Produtos reais:</strong> Sincroniza todos os produtos ativos da conta</li>
                <li><strong>Dados atualizados:</strong> Preços, estoque, vendas e visualizações</li>
                <li><strong>Integração completa:</strong> Os dados aparecem nas abas "Contas ML" e "Produtos"</li>
              </ul>
            </div>
            
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <p className="font-medium text-blue-800 mb-2">📋 Como obter as credenciais:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Acesse <a href="https://developers.mercadolivre.com.br" target="_blank" rel="noopener noreferrer" className="underline">developers.mercadolivre.com.br</a></li>
                <li>Faça login com sua conta do Mercado Livre</li>
                <li>Vá em "Minhas aplicações" e selecione sua app</li>
                <li>Copie o Client ID e Client Secret</li>
                <li>Verifique se o Redirect URI está correto</li>
              </ol>
            </div>
            
            <div className="p-3 bg-amber-50 rounded border border-amber-200">
              <p className="font-medium text-amber-800 mb-2">⚠️ Problemas comuns e soluções:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Código expirado:</strong> Obtenha um novo código (expira em 10 min)</li>
                <li><strong>Redirect URI:</strong> Deve ser EXATAMENTE igual ao cadastrado</li>
                <li><strong>Credenciais:</strong> Verifique se Client ID/Secret estão corretos</li>
                <li><strong>Espaços:</strong> Não copie espaços extras no código</li>
                <li><strong>URL completa:</strong> Copie apenas o valor após ?code=, não a URL inteira</li>
                <li><strong>Código já usado:</strong> Cada código funciona apenas uma vez</li>
                <li><strong>Sincronização:</strong> Mantenha a opção automática ativada para melhor experiência</li>
              </ul>
            </div>

            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <p className="font-medium text-gray-800 mb-2">🔧 Dicas de troubleshooting:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Ative o "Modo Debug" para ver logs detalhados</li>
                <li>Verifique o console do navegador (F12) para erros</li>
                <li>Teste com credenciais de uma aplicação ativa</li>
                <li>Certifique-se de que sua aplicação tem as permissões necessárias</li>
                <li>Use sempre códigos recém-gerados (não reutilize códigos antigos)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}