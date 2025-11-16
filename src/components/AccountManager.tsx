"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus, 
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  Copy,
  Key,
  Shield,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { MercadoLivreAccount } from '@/lib/types'
import { MercadoLivreAPI, formatNumber, getStatusText, diagnoseAuthorizationError } from '@/lib/mercadolivre'

interface AccountManagerProps {
  accounts: MercadoLivreAccount[]
  onAccountsChange: (accounts: MercadoLivreAccount[]) => void
}

export default function AccountManager({ accounts, onAccountsChange }: AccountManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<MercadoLivreAccount | null>(null)
  const [syncingAccounts, setSyncingAccounts] = useState<Set<string>>(new Set())
  const [showTokens, setShowTokens] = useState<Set<string>>(new Set())
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [lastError, setLastError] = useState<string>('')
  const [testingToken, setTestingToken] = useState(false)
  const [tokenTestResult, setTokenTestResult] = useState<{ success: boolean; message: string } | null>(null)
  
  const [newAccount, setNewAccount] = useState({
    nickname: '',
    email: '',
    accessToken: '',
    autoSync: true
  })

  const getCurrentUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return 'http://localhost:3000'
  }

  const getAuthorizationUrl = (clientId: string) => {
    return `https://auth.mercadolibre.com.br/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(getCurrentUrl())}&scope=read+write+offline_access`
  }

  // Função para testar o token e sincronizar automaticamente
  const handleTestAndSync = async () => {
    if (!newAccount.accessToken) {
      setTokenTestResult({ success: false, message: 'Digite um access token primeiro' })
      return
    }

    setTestingToken(true)
    setTokenTestResult(null)

    try {
      const api = new MercadoLivreAPI(newAccount.accessToken)
      
      // Cria uma conta temporária para teste
      const tempAccount: MercadoLivreAccount = {
        id: 'temp',
        nickname: newAccount.nickname || 'Testando...',
        email: newAccount.email || 'teste@teste.com',
        status: 'inactive',
        reputation: 0,
        sales: 0,
        products: 0,
        lastSync: 'Nunca',
        accessToken: newAccount.accessToken
      }

      const result = await api.syncAccount(tempAccount)
      
      if (result.success) {
        // Token válido! Atualiza os dados do formulário com as informações sincronizadas
        setNewAccount({
          ...newAccount,
          nickname: result.data.nickname || newAccount.nickname,
          email: result.data.email || newAccount.email
        })

        setTokenTestResult({ 
          success: true, 
          message: `✅ Token válido! Dados sincronizados: ${result.data.products} produtos, ${result.data.sales} vendas, ${result.data.reputation}% reputação` 
        })

        // Aguarda 1.5 segundos para o usuário ver a mensagem de sucesso
        setTimeout(() => {
          // Adiciona a conta automaticamente com os dados sincronizados
          const newAccountData: MercadoLivreAccount = {
            id: Date.now().toString(),
            nickname: result.data.nickname,
            email: result.data.email,
            status: 'active',
            reputation: result.data.reputation,
            sales: result.data.sales,
            products: result.data.products,
            lastSync: result.data.lastSync,
            accessToken: newAccount.accessToken
          }

          onAccountsChange([...accounts, newAccountData])
          
          // Reseta o formulário e fecha o diálogo
          setNewAccount({ nickname: '', email: '', accessToken: '', autoSync: true })
          setTokenTestResult(null)
          setIsAddDialogOpen(false)
        }, 1500)

      } else {
        if (result.error?.toLowerCase().includes('unauthorized') || result.error?.toLowerCase().includes('policy')) {
          setLastError(result.error)
          setIsErrorDialogOpen(true)
          setTokenTestResult({ success: false, message: '❌ Erro de autorização. Verifique os scopes da sua aplicação.' })
        } else {
          setTokenTestResult({ success: false, message: `❌ Erro: ${result.error}` })
        }
      }
    } catch (error) {
      setTokenTestResult({ success: false, message: '❌ Erro ao testar token. Verifique se está correto.' })
    } finally {
      setTestingToken(false)
    }
  }

  const handleEditAccount = () => {
    if (!selectedAccount) return

    const updatedAccounts = accounts.map(acc => 
      acc.id === selectedAccount.id ? selectedAccount : acc
    )
    onAccountsChange(updatedAccounts)
    setIsEditDialogOpen(false)
    setSelectedAccount(null)
  }

  const handleDeleteAccount = (accountId: string) => {
    if (confirm('Tem certeza que deseja remover esta conta?')) {
      const updatedAccounts = accounts.filter(acc => acc.id !== accountId)
      onAccountsChange(updatedAccounts)
    }
  }

  const handleSyncAccount = async (account: MercadoLivreAccount) => {
    if (!account.accessToken) {
      alert('Token de acesso não configurado para esta conta')
      return
    }

    setSyncingAccounts(prev => new Set(prev).add(account.id))

    try {
      const api = new MercadoLivreAPI(account.accessToken)
      const result = await api.syncAccount(account)
      
      if (result.success) {
        const updatedAccounts = accounts.map(acc => 
          acc.id === account.id ? { ...result.data, status: 'active' as const } : acc
        )
        onAccountsChange(updatedAccounts)
      } else {
        if (result.error?.toLowerCase().includes('unauthorized') || result.error?.toLowerCase().includes('policy')) {
          setLastError(result.error)
          setIsErrorDialogOpen(true)
        } else {
          alert(`Erro na sincronização: ${result.error}`)
        }
      }
    } catch (error) {
      alert('Erro ao sincronizar conta')
    } finally {
      setSyncingAccounts(prev => {
        const newSet = new Set(prev)
        newSet.delete(account.id)
        return newSet
      })
    }
  }

  const toggleTokenVisibility = (accountId: string) => {
    setShowTokens(prev => {
      const newSet = new Set(prev)
      if (newSet.has(accountId)) {
        newSet.delete(accountId)
      } else {
        newSet.add(accountId)
      }
      return newSet
    })
  }

  const copyAuthUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch (error) {
      console.error('Erro ao copiar URL:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'inactive': return 'bg-yellow-500'
      case 'suspended': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />
      case 'inactive': return <Clock className="w-4 h-4" />
      case 'suspended': return <AlertCircle className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciar Contas</h2>
          <p className="text-gray-600">Configure e monitore suas contas do Mercado Livre</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open)
          if (!open) {
            setTokenTestResult(null)
            setNewAccount({ nickname: '', email: '', accessToken: '', autoSync: true })
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Nova Conta do Mercado Livre</DialogTitle>
              <DialogDescription>
                Configure e teste sua conexão automaticamente
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Passo 1: Obter Código de Autorização */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    1
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">Obter Access Token</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Primeiro, você precisa obter um access token do Mercado Livre
                      </p>
                    </div>

                    <Alert className="border-orange-200 bg-orange-50">
                      <Shield className="w-4 h-4 text-orange-600" />
                      <AlertDescription className="text-orange-800 text-sm">
                        <strong>Configure sua aplicação com os scopes:</strong> read, write, offline_access
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="clientIdInput">Client ID da sua aplicação</Label>
                      <Input
                        id="clientIdInput"
                        placeholder="Digite seu Client ID aqui"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const clientId = (document.getElementById('clientIdInput') as HTMLInputElement)?.value
                          if (!clientId) {
                            alert('Digite seu Client ID primeiro')
                            return
                          }
                          copyAuthUrl(getAuthorizationUrl(clientId))
                        }}
                        className={`flex-1 ${copiedUrl ? 'border-green-200 bg-green-50 text-green-700' : ''}`}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        {copiedUrl ? 'URL Copiada!' : 'Copiar URL'}
                      </Button>
                      
                      <Button
                        onClick={() => {
                          const clientId = (document.getElementById('clientIdInput') as HTMLInputElement)?.value
                          if (!clientId) {
                            alert('Digite seu Client ID primeiro')
                            return
                          }
                          window.open(getAuthorizationUrl(clientId), '_blank', 'width=600,height=700')
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Abrir Autorização
                      </Button>
                    </div>

                    <p className="text-xs text-gray-500">
                      Após autorizar, troque o código retornado por um access token usando sua aplicação
                    </p>
                  </div>
                </div>
              </div>

              {/* Passo 2: Testar e Sincronizar */}
              <div className="border rounded-lg p-4 bg-green-50">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    2
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">Testar Token e Sincronizar</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Cole seu access token abaixo. Vamos testar e sincronizar automaticamente!
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="token">Access Token *</Label>
                        <Textarea
                          id="token"
                          value={newAccount.accessToken}
                          onChange={(e) => {
                            setNewAccount({...newAccount, accessToken: e.target.value})
                            setTokenTestResult(null)
                          }}
                          placeholder="APP_USR-1234567890-123456-abcdef..."
                          className="h-24 resize-none font-mono text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="nickname">Nickname (opcional)</Label>
                          <Input
                            id="nickname"
                            value={newAccount.nickname}
                            onChange={(e) => setNewAccount({...newAccount, nickname: e.target.value})}
                            placeholder="Será preenchido automaticamente"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email (opcional)</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newAccount.email}
                            onChange={(e) => setNewAccount({...newAccount, email: e.target.value})}
                            placeholder="Será preenchido automaticamente"
                          />
                        </div>
                      </div>

                      {tokenTestResult && (
                        <Alert className={tokenTestResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                          {tokenTestResult.success ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          )}
                          <AlertDescription className={tokenTestResult.success ? 'text-green-800' : 'text-red-800'}>
                            {tokenTestResult.message}
                          </AlertDescription>
                        </Alert>
                      )}

                      <Button
                        onClick={handleTestAndSync}
                        disabled={testingToken || !newAccount.accessToken}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      >
                        {testingToken ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Testando e Sincronizando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Testar Token e Adicionar Conta
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-gray-500 text-center">
                        {tokenTestResult?.success 
                          ? '🎉 Conta será adicionada automaticamente em instantes...'
                          : 'Ao clicar, vamos validar o token e sincronizar seus dados automaticamente'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dialog de Erro de Autorização */}
      <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Erro de Autorização
            </DialogTitle>
            <DialogDescription>
              Problema com as permissões da sua aplicação
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800 text-sm">
                <strong>Erro:</strong> {lastError}
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm whitespace-pre-wrap text-gray-700">
                {diagnoseAuthorizationError(lastError)}
              </pre>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsErrorDialogOpen(false)} className="w-full sm:w-auto">
                Fechar
              </Button>
              
              <Button
                onClick={() => window.open('https://developers.mercadolibre.com.br/', '_blank')}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Configurar App
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => (
          <Card key={account.id} className="hover:shadow-lg transition-all duration-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  {account.nickname}
                  {account.accessToken && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      API
                    </Badge>
                  )}
                </CardTitle>
                <Badge className={`${getStatusColor(account.status)} text-white`}>
                  {getStatusIcon(account.status)}
                  <span className="ml-1">{getStatusText(account.status)}</span>
                </Badge>
              </div>
              <CardDescription className="truncate">{account.email}</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Reputação</p>
                  <p className="font-semibold text-green-600">{account.reputation}%</p>
                </div>
                <div>
                  <p className="text-gray-600">Vendas</p>
                  <p className="font-semibold">{formatNumber(account.sales)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Produtos</p>
                  <p className="font-semibold">{formatNumber(account.products)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Última Sync</p>
                  <p className="font-semibold text-xs truncate">{account.lastSync}</p>
                </div>
              </div>

              {/* Access Token */}
              {account.accessToken && (
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-600">Access Token</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleTokenVisibility(account.id)}
                    >
                      {showTokens.has(account.id) ? (
                        <EyeOff className="w-3 h-3" />
                      ) : (
                        <Eye className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs font-mono bg-gray-50 p-2 rounded mt-1 break-all">
                    {showTokens.has(account.id) 
                      ? account.accessToken 
                      : '••••••••••••••••••••••••••••••••'
                    }
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedAccount(account)
                    setIsEditDialogOpen(true)
                  }}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleSyncAccount(account)}
                  disabled={syncingAccounts.has(account.id) || !account.accessToken}
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${syncingAccounts.has(account.id) ? 'animate-spin' : ''}`} />
                  Sync
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDeleteAccount(account.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Conta</DialogTitle>
            <DialogDescription>
              Modifique as configurações da conta
            </DialogDescription>
          </DialogHeader>
          {selectedAccount && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-nickname">Nickname</Label>
                  <Input
                    id="edit-nickname"
                    value={selectedAccount.nickname}
                    onChange={(e) => setSelectedAccount({
                      ...selectedAccount, 
                      nickname: e.target.value
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={selectedAccount.email}
                    onChange={(e) => setSelectedAccount({
                      ...selectedAccount, 
                      email: e.target.value
                    })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-token">Access Token</Label>
                <Textarea
                  id="edit-token"
                  value={selectedAccount.accessToken || ''}
                  onChange={(e) => setSelectedAccount({
                    ...selectedAccount, 
                    accessToken: e.target.value
                  })}
                  placeholder="APP_USR-1234567890-123456-abcdef..."
                  className="h-20 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Token deve ter scopes: read, write, offline_access
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button onClick={handleEditAccount} className="w-full sm:w-auto">
                  Salvar Alterações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
