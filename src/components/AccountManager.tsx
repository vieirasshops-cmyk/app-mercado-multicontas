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
import { 
  Plus, 
  Edit,
  Trash2,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react'
import { MercadoLivreAccount } from '@/lib/types'
import { MercadoLivreAPI, formatNumber, getStatusText } from '@/lib/mercadolivre'

interface AccountManagerProps {
  accounts: MercadoLivreAccount[]
  onAccountsChange: (accounts: MercadoLivreAccount[]) => void
}

export default function AccountManager({ accounts, onAccountsChange }: AccountManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<MercadoLivreAccount | null>(null)
  const [syncingAccounts, setSyncingAccounts] = useState<Set<string>>(new Set())
  const [showTokens, setShowTokens] = useState<Set<string>>(new Set())
  
  const [newAccount, setNewAccount] = useState({
    nickname: '',
    email: '',
    accessToken: '',
    autoSync: true
  })

  const handleAddAccount = async () => {
    if (!newAccount.nickname || !newAccount.email) return

    const account: MercadoLivreAccount = {
      id: Date.now().toString(),
      nickname: newAccount.nickname,
      email: newAccount.email,
      status: 'inactive',
      reputation: 100,
      sales: 0,
      products: 0,
      lastSync: 'Nunca',
      accessToken: newAccount.accessToken
    }

    // Se tem access token, tenta sincronizar imediatamente
    if (newAccount.accessToken) {
      try {
        const api = new MercadoLivreAPI(newAccount.accessToken)
        const result = await api.syncAccount(account)
        if (result.success) {
          account.status = 'active'
          account.reputation = result.data.reputation
          account.products = result.data.products
          account.sales = result.data.sales
          account.lastSync = result.data.lastSync
        }
      } catch (error) {
        console.error('Erro na sincronização inicial:', error)
      }
    }

    onAccountsChange([...accounts, account])
    setNewAccount({ nickname: '', email: '', accessToken: '', autoSync: true })
    setIsAddDialogOpen(false)
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
    const updatedAccounts = accounts.filter(acc => acc.id !== accountId)
    onAccountsChange(updatedAccounts)
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
        alert(`Erro na sincronização: ${result.error}`)
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciar Contas</h2>
          <p className="text-gray-600">Configure e monitore suas contas do Mercado Livre</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Adicionar Nova Conta</DialogTitle>
              <DialogDescription>
                Configure uma nova conta do Mercado Livre para gerenciamento
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nickname">Nickname *</Label>
                  <Input
                    id="nickname"
                    value={newAccount.nickname}
                    onChange={(e) => setNewAccount({...newAccount, nickname: e.target.value})}
                    placeholder="seu_nickname"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newAccount.email}
                    onChange={(e) => setNewAccount({...newAccount, email: e.target.value})}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="token">Access Token</Label>
                <Textarea
                  id="token"
                  value={newAccount.accessToken}
                  onChange={(e) => setNewAccount({...newAccount, accessToken: e.target.value})}
                  placeholder="APP_USR-1234567890-123456-abcdef..."
                  className="h-20 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Token necessário para sincronização automática
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="autoSync"
                  checked={newAccount.autoSync}
                  onCheckedChange={(checked) => setNewAccount({...newAccount, autoSync: checked})}
                />
                <Label htmlFor="autoSync">Sincronização automática</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddAccount}>
                  Adicionar Conta
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
              <CardDescription>{account.email}</CardDescription>
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
                  <p className="font-semibold text-xs">{account.lastSync}</p>
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
                  <p className="text-xs font-mono bg-gray-50 p-2 rounded mt-1">
                    {showTokens.has(account.id) 
                      ? account.accessToken 
                      : '••••••••••••••••••••••••••••••••'
                    }
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-2">
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
              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleEditAccount}>
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