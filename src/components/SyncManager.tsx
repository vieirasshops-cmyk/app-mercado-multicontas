"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Bell, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Settings,
  Zap
} from 'lucide-react'
import { MercadoLivreAccount } from '@/lib/types'
import { MercadoLivreAPI } from '@/lib/mercadolivre'

interface SyncManagerProps {
  accounts: MercadoLivreAccount[]
  onAccountsUpdate: (accounts: MercadoLivreAccount[]) => void
}

interface SyncStatus {
  accountId: string
  status: 'idle' | 'syncing' | 'success' | 'error'
  lastSync: string
  message?: string
}

export default function SyncManager({ accounts, onAccountsUpdate }: SyncManagerProps) {
  const [autoSync, setAutoSync] = useState(true)
  const [syncInterval, setSyncInterval] = useState(30) // minutos
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([])
  const [notifications, setNotifications] = useState<string[]>([])

  useEffect(() => {
    // Inicializar status de sincronização
    const initialStatuses = accounts.map(account => ({
      accountId: account.id,
      status: 'idle' as const,
      lastSync: account.lastSync
    }))
    setSyncStatuses(initialStatuses)
  }, [accounts])

  useEffect(() => {
    if (!autoSync) return

    const interval = setInterval(() => {
      syncAllAccounts()
    }, syncInterval * 60 * 1000) // Converter minutos para milissegundos

    return () => clearInterval(interval)
  }, [autoSync, syncInterval, accounts])

  const syncAccount = async (account: MercadoLivreAccount) => {
    if (!account.accessToken) {
      addNotification(`Conta ${account.nickname}: Token de acesso não configurado`)
      return
    }

    // Atualizar status para "syncing"
    setSyncStatuses(prev => prev.map(status => 
      status.accountId === account.id 
        ? { ...status, status: 'syncing' }
        : status
    ))

    try {
      const api = new MercadoLivreAPI(account.accessToken)
      const result = await api.syncAccount(account)
      
      if (result.success) {
        // Atualizar conta
        const updatedAccounts = accounts.map(acc => 
          acc.id === account.id ? { ...result.data, status: 'active' as const } : acc
        )
        onAccountsUpdate(updatedAccounts)

        // Atualizar status para "success"
        setSyncStatuses(prev => prev.map(status => 
          status.accountId === account.id 
            ? { 
                ...status, 
                status: 'success',
                lastSync: result.data.lastSync,
                message: 'Sincronização concluída'
              }
            : status
        ))

        addNotification(`Conta ${account.nickname} sincronizada com sucesso`)
      } else {
        // Atualizar status para "error"
        setSyncStatuses(prev => prev.map(status => 
          status.accountId === account.id 
            ? { 
                ...status, 
                status: 'error',
                message: result.error || 'Erro na sincronização'
              }
            : status
        ))

        addNotification(`Erro ao sincronizar ${account.nickname}: ${result.error}`)
      }
    } catch (error) {
      setSyncStatuses(prev => prev.map(status => 
        status.accountId === account.id 
          ? { 
              ...status, 
              status: 'error',
              message: 'Erro de conexão'
            }
          : status
      ))

      addNotification(`Erro ao sincronizar ${account.nickname}: Falha na conexão`)
    }
  }

  const syncAllAccounts = async () => {
    const activeAccounts = accounts.filter(acc => acc.status === 'active' && acc.accessToken)
    
    if (activeAccounts.length === 0) {
      addNotification('Nenhuma conta ativa com token configurado para sincronização')
      return
    }

    addNotification(`Iniciando sincronização de ${activeAccounts.length} contas`)

    for (const account of activeAccounts) {
      await syncAccount(account)
      // Aguardar 2 segundos entre sincronizações para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    addNotification('Sincronização de todas as contas concluída')
  }

  const addNotification = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR')
    const notification = `${timestamp}: ${message}`
    
    setNotifications(prev => [notification, ...prev.slice(0, 9)]) // Manter apenas 10 notificações
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'syncing': return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'syncing': return 'bg-blue-100 text-blue-800'
      case 'success': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Configurações de Sincronização */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Configurações de Sincronização
          </CardTitle>
          <CardDescription>
            Configure a sincronização automática das suas contas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-sync">Sincronização Automática</Label>
              <p className="text-sm text-gray-500">
                Sincronizar dados automaticamente em intervalos regulares
              </p>
            </div>
            <Switch
              id="auto-sync"
              checked={autoSync}
              onCheckedChange={setAutoSync}
            />
          </div>

          {autoSync && (
            <div className="space-y-2">
              <Label>Intervalo de Sincronização</Label>
              <div className="flex space-x-2">
                {[15, 30, 60, 120].map((minutes) => (
                  <Button
                    key={minutes}
                    variant={syncInterval === minutes ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSyncInterval(minutes)}
                  >
                    {minutes}min
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <Button 
              onClick={syncAllAccounts}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Sincronizar Todas
            </Button>
            <Button variant="outline" onClick={() => setNotifications([])}>
              Limpar Notificações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status das Contas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Status de Sincronização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {accounts.map((account) => {
              const status = syncStatuses.find(s => s.accountId === account.id)
              
              return (
                <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(status?.status || 'idle')}
                    <div>
                      <p className="font-medium">{account.nickname}</p>
                      <p className="text-sm text-gray-500">
                        {status?.message || `Última sync: ${status?.lastSync || account.lastSync}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(status?.status || 'idle')}>
                      {status?.status || 'idle'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => syncAccount(account)}
                      disabled={status?.status === 'syncing' || !account.accessToken}
                    >
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Notificações Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Nenhuma notificação</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {notifications.map((notification, index) => (
                <div key={index} className="text-sm p-2 bg-gray-50 rounded border-l-4 border-blue-500">
                  {notification}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}