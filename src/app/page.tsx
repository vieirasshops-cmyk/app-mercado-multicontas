"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus, 
  Settings, 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Eye,
  Edit,
  Trash2,
  Store,
  BarChart3,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  Target,
  Zap,
  TestTube,
  Download,
  Sparkles,
  LogOut,
  Shield
} from 'lucide-react'
import { MercadoLivreAccount, Product } from '@/lib/types'
import { formatCurrency, formatNumber, calculateMetrics } from '@/lib/mercadolivre'
import { authService } from '@/lib/auth'
import LoginPage from '@/components/LoginPage'
import AccountManager from '@/components/AccountManager'
import SyncManager from '@/components/SyncManager'
import APITester from '@/components/APITester'
import UserManagement from '@/components/UserManagement'

export default function MercadoTurboApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser())

  useEffect(() => {
    const user = authService.getCurrentUser()
    setIsAuthenticated(!!user)
    setCurrentUser(user)
  }, [])

  const handleLoginSuccess = () => {
    const user = authService.getCurrentUser()
    setIsAuthenticated(true)
    setCurrentUser(user)
  }

  const handleLogout = () => {
    authService.logout()
    setIsAuthenticated(false)
    setCurrentUser(null)
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  return <Dashboard currentUser={currentUser} onLogout={handleLogout} />
}

function Dashboard({ currentUser, onLogout }: { currentUser: any, onLogout: () => void }) {
  const [accounts, setAccounts] = useState<MercadoLivreAccount[]>([])

  const [products, setProducts] = useState<Product[]>([
    {
      id: '1',
      title: 'Smartphone Samsung Galaxy A54 128GB',
      price: 1299.99,
      stock: 15,
      status: 'active',
      account: 'vendedor_pro',
      views: 2340,
      sales: 23,
      category: 'Celulares e Telefones'
    },
    {
      id: '2',
      title: 'Notebook Lenovo IdeaPad 3 Intel Core i5',
      price: 2499.99,
      stock: 8,
      status: 'active',
      account: 'loja_premium',
      views: 1890,
      sales: 12,
      category: 'Computação'
    },
    {
      id: '3',
      title: 'Fone Bluetooth JBL Tune 510BT',
      price: 299.99,
      stock: 0,
      status: 'paused',
      account: 'vendedor_pro',
      views: 567,
      sales: 45,
      category: 'Áudio'
    },
    {
      id: '4',
      title: 'Smart TV LG 55" 4K UHD',
      price: 2199.99,
      stock: 5,
      status: 'active',
      account: 'mega_store',
      views: 3456,
      sales: 8,
      category: 'TV e Home Theater'
    }
  ])

  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [newProduct, setNewProduct] = useState({
    title: '',
    price: '',
    stock: '',
    account: '',
    category: ''
  })
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  const metrics = calculateMetrics(accounts, products)
  const activeAccounts = accounts.filter(acc => acc.status === 'active').length

  const handleAddProduct = () => {
    if (!authService.hasPermission('manageProducts')) {
      alert('Você não tem permissão para adicionar produtos')
      return
    }

    if (newProduct.title && newProduct.price && newProduct.account) {
      const product: Product = {
        id: Date.now().toString(),
        title: newProduct.title,
        price: parseFloat(newProduct.price),
        stock: parseInt(newProduct.stock) || 0,
        status: 'active',
        account: newProduct.account,
        views: 0,
        sales: 0,
        category: newProduct.category
      }
      setProducts([...products, product])
      setNewProduct({ title: '', price: '', stock: '', account: '', category: '' })
      setIsAddProductOpen(false)
    }
  }

  const handleAccountImport = (newAccount: MercadoLivreAccount, newProducts: Product[]) => {
    const existingAccountIndex = accounts.findIndex(
      acc => acc.nickname === newAccount.nickname || acc.userId === newAccount.userId
    )

    if (existingAccountIndex >= 0) {
      const updatedAccounts = [...accounts]
      updatedAccounts[existingAccountIndex] = {
        ...updatedAccounts[existingAccountIndex],
        ...newAccount,
        id: updatedAccounts[existingAccountIndex].id
      }
      setAccounts(updatedAccounts)
    } else {
      setAccounts(prev => [...prev, newAccount])
    }

    const filteredProducts = products.filter(p => p.account !== newAccount.nickname)
    setProducts([...filteredProducts, ...newProducts])

    setImportSuccess(`Conta "${newAccount.nickname}" importada com ${newProducts.length} produtos!`)
    setTimeout(() => setImportSuccess(null), 5000)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Store className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Mercado Turbo
                  </h1>
                  <p className="text-xs text-gray-500">Gerenciador de Multicontas ML</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                <Activity className="w-3 h-3 mr-1" />
                {activeAccounts} contas ativas
              </Badge>
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <Shield className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{currentUser?.username}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerta de sucesso da importação */}
        {importSuccess && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-medium">{importSuccess}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setImportSuccess(null)}
                  className="text-green-600 hover:text-green-700"
                >
                  ✕
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Dashboard Cards */}
        {authService.hasPermission('viewDashboard') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
                <DollarSign className="h-5 w-5 opacity-80" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
                <p className="text-xs opacity-80">+12% em relação ao mês anterior</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Produtos Ativos</CardTitle>
                <Package className="h-5 w-5 opacity-80" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(metrics.totalProducts)}</div>
                <p className="text-xs opacity-80">Em {activeAccounts} contas ativas</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contas ML</CardTitle>
                <Users className="h-5 w-5 opacity-80" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{accounts.length}</div>
                <p className="text-xs opacity-80">{activeAccounts} ativas, {accounts.length - activeAccounts} inativas</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa Conversão</CardTitle>
                <Target className="h-5 w-5 opacity-80" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.conversionRate.toFixed(1)}%</div>
                <p className="text-xs opacity-80">{formatNumber(metrics.totalViews)} visualizações</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 bg-white shadow-sm">
            {authService.hasPermission('viewDashboard') && (
              <TabsTrigger value="overview" className="data-[state=active]:bg-blue-50">
                <BarChart3 className="w-4 h-4 mr-2" />
                Visão Geral
              </TabsTrigger>
            )}
            {authService.hasPermission('manageAccounts') && (
              <TabsTrigger value="accounts" className="data-[state=active]:bg-purple-50">
                <Users className="w-4 h-4 mr-2" />
                Contas ML
              </TabsTrigger>
            )}
            {authService.hasPermission('manageProducts') && (
              <TabsTrigger value="products" className="data-[state=active]:bg-green-50">
                <Package className="w-4 h-4 mr-2" />
                Produtos
              </TabsTrigger>
            )}
            {authService.hasPermission('manageSync') && (
              <TabsTrigger value="sync" className="data-[state=active]:bg-yellow-50">
                <Settings className="w-4 h-4 mr-2" />
                Sincronização
              </TabsTrigger>
            )}
            {authService.hasPermission('viewAnalytics') && (
              <TabsTrigger value="analytics" className="data-[state=active]:bg-orange-50">
                <TrendingUp className="w-4 h-4 mr-2" />
                Relatórios
              </TabsTrigger>
            )}
            {authService.hasPermission('manageSync') && (
              <TabsTrigger value="test" className="data-[state=active]:bg-red-50">
                <TestTube className="w-4 h-4 mr-2" />
                Teste API
              </TabsTrigger>
            )}
            {authService.hasPermission('manageUsers') && (
              <TabsTrigger value="users" className="data-[state=active]:bg-indigo-50">
                <Shield className="w-4 h-4 mr-2" />
                Usuários
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          {authService.hasPermission('viewDashboard') && (
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Zap className="w-5 h-5 mr-2 text-yellow-500" />
                      Performance por Conta
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {accounts.map((account) => (
                        <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(account.status)}`}></div>
                            <div>
                              <p className="font-medium">{account.nickname}</p>
                              <p className="text-sm text-gray-500">{account.products} produtos</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatNumber(account.sales)} vendas</p>
                            <p className="text-sm text-gray-500">{account.reputation}% reputação</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
                      Métricas Gerais
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-gray-700">Ticket Médio</span>
                        <span className="font-semibold text-green-700">
                          {formatCurrency(metrics.averageTicket)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-gray-700">Total de Vendas</span>
                        <span className="font-semibold text-blue-700">
                          {formatNumber(metrics.totalSales)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                        <span className="text-gray-700">Produtos sem Estoque</span>
                        <span className="font-semibold text-purple-700">
                          {products.filter(p => p.stock === 0).length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                        <span className="text-gray-700">Reputação Média</span>
                        <span className="font-semibold text-orange-700">
                          {Math.round(accounts.reduce((sum, acc) => sum + acc.reputation, 0) / accounts.length)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* Accounts Tab */}
          {authService.hasPermission('manageAccounts') && (
            <TabsContent value="accounts" className="space-y-6">
              <AccountManager 
                accounts={accounts} 
                onAccountsChange={setAccounts}
              />
            </TabsContent>
          )}

          {/* Products Tab */}
          {authService.hasPermission('manageProducts') && (
            <TabsContent value="products" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Gestão de Produtos</h2>
                  <p className="text-gray-600">Monitore e gerencie produtos de todas as contas</p>
                </div>
                <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Produto
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Adicionar Produto</DialogTitle>
                      <DialogDescription>
                        Cadastre um novo produto para uma das suas contas
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Título do Produto</Label>
                        <Input
                          id="title"
                          value={newProduct.title}
                          onChange={(e) => setNewProduct({...newProduct, title: e.target.value})}
                          placeholder="Nome do produto"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="price">Preço</Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            value={newProduct.price}
                            onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="stock">Estoque</Label>
                          <Input
                            id="stock"
                            type="number"
                            value={newProduct.stock}
                            onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="account">Conta</Label>
                        <Select value={newProduct.account} onValueChange={(value) => setNewProduct({...newProduct, account: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma conta" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.filter(acc => acc.status === 'active').map((account) => (
                              <SelectItem key={account.id} value={account.nickname}>
                                {account.nickname}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="category">Categoria</Label>
                        <Input
                          id="category"
                          value={newProduct.category}
                          onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                          placeholder="Categoria do produto"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsAddProductOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleAddProduct}>
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Card className="shadow-lg">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Produto
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Conta
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Preço
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estoque
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Performance
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {products.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                                  {product.title}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {product.category}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant="outline" className="text-xs">
                                {product.account}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatCurrency(product.price)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className={product.stock === 0 ? 'text-red-600 font-medium' : ''}>
                                {product.stock}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge 
                                className={
                                  product.status === 'active' ? 'bg-green-100 text-green-800' :
                                  product.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }
                              >
                                {product.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div>
                                <div>{formatNumber(product.views)} views</div>
                                <div className="text-green-600 font-medium">{product.sales} vendas</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-700">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Sync Tab */}
          {authService.hasPermission('manageSync') && (
            <TabsContent value="sync" className="space-y-6">
              <SyncManager 
                accounts={accounts} 
                onAccountsUpdate={setAccounts}
              />
            </TabsContent>
          )}

          {/* Analytics Tab */}
          {authService.hasPermission('viewAnalytics') && (
            <TabsContent value="analytics" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Relatórios e Análises</h2>
                <p className="text-gray-600">Insights detalhados sobre o desempenho das suas contas</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Vendas por Conta
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {accounts.map((account) => {
                        const accountProducts = products.filter(p => p.account === account.nickname)
                        const accountRevenue = accountProducts.reduce((sum, p) => sum + (p.price * p.sales), 0)
                        
                        return (
                          <div key={account.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`w-4 h-4 rounded-full ${getStatusColor(account.status)}`}></div>
                              <div>
                                <p className="font-medium">{account.nickname}</p>
                                <p className="text-sm text-gray-500">{account.products} produtos</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatCurrency(accountRevenue)}</p>
                              <p className="text-sm text-gray-500">{account.sales} vendas</p>
                              <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                                <div 
                                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full" 
                                  style={{ width: `${metrics.totalRevenue > 0 ? (accountRevenue / metrics.totalRevenue) * 100 : 0}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Produtos Top Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {products
                        .sort((a, b) => (b.price * b.sales) - (a.price * a.sales))
                        .slice(0, 5)
                        .map((product) => (
                          <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{product.title}</p>
                              <p className="text-sm text-gray-500">{product.account}</p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="font-semibold text-green-600">
                                {formatCurrency(product.price * product.sales)}
                              </p>
                              <p className="text-sm text-gray-500">{product.sales} vendas</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* Test API Tab */}
          {authService.hasPermission('manageSync') && (
            <TabsContent value="test" className="space-y-6">
              <APITester onAccountImport={handleAccountImport} />
            </TabsContent>
          )}

          {/* Users Tab */}
          {authService.hasPermission('manageUsers') && (
            <TabsContent value="users" className="space-y-6">
              <UserManagement />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
