"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Crown,
  UserCog
} from 'lucide-react'
import { authService, User } from '@/lib/auth'

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    permissions: {
      viewDashboard: true,
      manageAccounts: false,
      manageProducts: false,
      manageSync: false,
      viewAnalytics: false,
      manageUsers: false
    }
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = () => {
    const allUsers = authService.getAllUsers()
    setUsers(allUsers)
  }

  const handleCreateUser = () => {
    setError('')
    setSuccess('')

    try {
      if (!newUser.username || !newUser.password) {
        setError('Preencha todos os campos obrigatórios')
        return
      }

      if (newUser.password.length < 6) {
        setError('A senha deve ter no mínimo 6 caracteres')
        return
      }

      const user = authService.createUser(newUser)
      
      if (user) {
        setSuccess(`Usuário "${user.username}" criado com sucesso!`)
        loadUsers()
        setIsAddUserOpen(false)
        setNewUser({
          username: '',
          password: '',
          role: 'user',
          permissions: {
            viewDashboard: true,
            manageAccounts: false,
            manageProducts: false,
            manageSync: false,
            viewAnalytics: false,
            manageUsers: false
          }
        })
        setTimeout(() => setSuccess(''), 5000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário')
    }
  }

  const handleUpdateUser = () => {
    if (!editingUser) return

    setError('')
    setSuccess('')

    try {
      const updated = authService.updateUser(editingUser.id, editingUser)
      
      if (updated) {
        setSuccess(`Usuário "${updated.username}" atualizado com sucesso!`)
        loadUsers()
        setEditingUser(null)
        setTimeout(() => setSuccess(''), 5000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar usuário')
    }
  }

  const handleDeleteUser = (userId: string, username: string) => {
    if (!confirm(`Tem certeza que deseja deletar o usuário "${username}"?`)) {
      return
    }

    setError('')
    setSuccess('')

    try {
      const deleted = authService.deleteUser(userId)
      
      if (deleted) {
        setSuccess(`Usuário "${username}" deletado com sucesso!`)
        loadUsers()
        setTimeout(() => setSuccess(''), 5000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar usuário')
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'master':
        return <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white"><Crown className="w-3 h-3 mr-1" />Master</Badge>
      case 'admin':
        return <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"><Shield className="w-3 h-3 mr-1" />Admin</Badge>
      default:
        return <Badge variant="outline"><UserCog className="w-3 h-3 mr-1" />Usuário</Badge>
    }
  }

  const currentUser = authService.getCurrentUser()

  if (!currentUser || !currentUser.permissions.manageUsers) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Você não tem permissão para gerenciar usuários.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h2>
          <p className="text-gray-600">Crie e gerencie usuários com permissões personalizadas</p>
        </div>
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Configure as permissões de acesso do novo usuário
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="new-username">Nome de Usuário</Label>
                <Input
                  id="new-username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  placeholder="usuario123"
                />
              </div>

              <div>
                <Label htmlFor="new-password">Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <Label htmlFor="new-role">Função</Label>
                <Select value={newUser.role} onValueChange={(value: 'admin' | 'user') => setNewUser({...newUser, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 pt-2 border-t">
                <Label>Permissões de Acesso</Label>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="perm-dashboard" className="text-sm font-normal">Ver Dashboard</Label>
                  <Switch
                    id="perm-dashboard"
                    checked={newUser.permissions.viewDashboard}
                    onCheckedChange={(checked) => setNewUser({
                      ...newUser,
                      permissions: {...newUser.permissions, viewDashboard: checked}
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="perm-accounts" className="text-sm font-normal">Gerenciar Contas ML</Label>
                  <Switch
                    id="perm-accounts"
                    checked={newUser.permissions.manageAccounts}
                    onCheckedChange={(checked) => setNewUser({
                      ...newUser,
                      permissions: {...newUser.permissions, manageAccounts: checked}
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="perm-products" className="text-sm font-normal">Gerenciar Produtos</Label>
                  <Switch
                    id="perm-products"
                    checked={newUser.permissions.manageProducts}
                    onCheckedChange={(checked) => setNewUser({
                      ...newUser,
                      permissions: {...newUser.permissions, manageProducts: checked}
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="perm-sync" className="text-sm font-normal">Gerenciar Sincronização</Label>
                  <Switch
                    id="perm-sync"
                    checked={newUser.permissions.manageSync}
                    onCheckedChange={(checked) => setNewUser({
                      ...newUser,
                      permissions: {...newUser.permissions, manageSync: checked}
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="perm-analytics" className="text-sm font-normal">Ver Relatórios</Label>
                  <Switch
                    id="perm-analytics"
                    checked={newUser.permissions.viewAnalytics}
                    onCheckedChange={(checked) => setNewUser({
                      ...newUser,
                      permissions: {...newUser.permissions, viewAnalytics: checked}
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="perm-users" className="text-sm font-normal">Gerenciar Usuários</Label>
                  <Switch
                    id="perm-users"
                    checked={newUser.permissions.manageUsers}
                    onCheckedChange={(checked) => setNewUser({
                      ...newUser,
                      permissions: {...newUser.permissions, manageUsers: checked}
                    })}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateUser}>
                  Criar Usuário
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Usuários do Sistema
          </CardTitle>
          <CardDescription>
            {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    user.role === 'master' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                    user.role === 'admin' ? 'bg-gradient-to-r from-blue-500 to-purple-500' :
                    'bg-gray-400'
                  }`}>
                    {user.role === 'master' ? <Crown className="w-5 h-5 text-white" /> :
                     user.role === 'admin' ? <Shield className="w-5 h-5 text-white" /> :
                     <UserCog className="w-5 h-5 text-white" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{user.username}</p>
                      {getRoleBadge(user.role)}
                    </div>
                    <p className="text-sm text-gray-500">
                      Criado em {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {user.role !== 'master' && (
                    <>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setEditingUser(user)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Editar Usuário</DialogTitle>
                            <DialogDescription>
                              Altere as permissões de "{user.username}"
                            </DialogDescription>
                          </DialogHeader>
                          {editingUser && editingUser.id === user.id && (
                            <div className="space-y-4">
                              <div className="space-y-3 pt-2">
                                <Label>Permissões de Acesso</Label>
                                
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-normal">Ver Dashboard</Label>
                                  <Switch
                                    checked={editingUser.permissions.viewDashboard}
                                    onCheckedChange={(checked) => setEditingUser({
                                      ...editingUser,
                                      permissions: {...editingUser.permissions, viewDashboard: checked}
                                    })}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-normal">Gerenciar Contas ML</Label>
                                  <Switch
                                    checked={editingUser.permissions.manageAccounts}
                                    onCheckedChange={(checked) => setEditingUser({
                                      ...editingUser,
                                      permissions: {...editingUser.permissions, manageAccounts: checked}
                                    })}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-normal">Gerenciar Produtos</Label>
                                  <Switch
                                    checked={editingUser.permissions.manageProducts}
                                    onCheckedChange={(checked) => setEditingUser({
                                      ...editingUser,
                                      permissions: {...editingUser.permissions, manageProducts: checked}
                                    })}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-normal">Gerenciar Sincronização</Label>
                                  <Switch
                                    checked={editingUser.permissions.manageSync}
                                    onCheckedChange={(checked) => setEditingUser({
                                      ...editingUser,
                                      permissions: {...editingUser.permissions, manageSync: checked}
                                    })}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-normal">Ver Relatórios</Label>
                                  <Switch
                                    checked={editingUser.permissions.viewAnalytics}
                                    onCheckedChange={(checked) => setEditingUser({
                                      ...editingUser,
                                      permissions: {...editingUser.permissions, viewAnalytics: checked}
                                    })}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-normal">Gerenciar Usuários</Label>
                                  <Switch
                                    checked={editingUser.permissions.manageUsers}
                                    onCheckedChange={(checked) => setEditingUser({
                                      ...editingUser,
                                      permissions: {...editingUser.permissions, manageUsers: checked}
                                    })}
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end space-x-2 pt-2">
                                <Button variant="outline" onClick={() => setEditingUser(null)}>
                                  Cancelar
                                </Button>
                                <Button onClick={handleUpdateUser}>
                                  Salvar Alterações
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
