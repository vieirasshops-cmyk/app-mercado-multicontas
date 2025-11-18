// Sistema de autenticação e gerenciamento de usuários

export interface User {
  id: string
  username: string
  password: string // Em produção, usar hash bcrypt
  role: 'master' | 'admin' | 'user'
  permissions: {
    viewDashboard: boolean
    manageAccounts: boolean
    manageProducts: boolean
    manageSync: boolean
    viewAnalytics: boolean
    manageUsers: boolean
  }
  createdAt: string
  createdBy?: string
}

// Usuário master padrão
const MASTER_USER: User = {
  id: 'master-001',
  username: 'vieiras_shops',
  password: 'Gr@ci070910', // Em produção, usar hash
  role: 'master',
  permissions: {
    viewDashboard: true,
    manageAccounts: true,
    manageProducts: true,
    manageSync: true,
    viewAnalytics: true,
    manageUsers: true
  },
  createdAt: new Date().toISOString()
}

// Simulação de banco de dados (em produção, usar DB real)
let users: User[] = [MASTER_USER]

export const authService = {
  // Login
  login: (username: string, password: string): User | null => {
    const user = users.find(u => u.username === username && u.password === password)
    if (user) {
      // Salvar sessão no localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentUser', JSON.stringify(user))
      }
      return user
    }
    return null
  },

  // Logout
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentUser')
    }
  },

  // Obter usuário atual
  getCurrentUser: (): User | null => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('currentUser')
      if (userStr) {
        return JSON.parse(userStr)
      }
    }
    return null
  },

  // Verificar se está autenticado
  isAuthenticated: (): boolean => {
    return authService.getCurrentUser() !== null
  },

  // Verificar permissão
  hasPermission: (permission: keyof User['permissions']): boolean => {
    const user = authService.getCurrentUser()
    if (!user) return false
    return user.permissions[permission] === true
  },

  // Listar todos os usuários (apenas master/admin)
  getAllUsers: (): User[] => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser || !currentUser.permissions.manageUsers) {
      return []
    }
    return users
  },

  // Criar novo usuário (apenas master/admin)
  createUser: (userData: Omit<User, 'id' | 'createdAt' | 'createdBy'>): User | null => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser || !currentUser.permissions.manageUsers) {
      return null
    }

    // Verificar se username já existe
    if (users.find(u => u.username === userData.username)) {
      throw new Error('Nome de usuário já existe')
    }

    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id
    }

    users.push(newUser)
    
    // Salvar no localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('users', JSON.stringify(users))
    }

    return newUser
  },

  // Atualizar usuário
  updateUser: (userId: string, updates: Partial<User>): User | null => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser || !currentUser.permissions.manageUsers) {
      return null
    }

    const userIndex = users.findIndex(u => u.id === userId)
    if (userIndex === -1) return null

    // Não permitir alterar o master user
    if (users[userIndex].role === 'master' && currentUser.role !== 'master') {
      throw new Error('Apenas o master pode alterar o usuário master')
    }

    users[userIndex] = { ...users[userIndex], ...updates }
    
    // Salvar no localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('users', JSON.stringify(users))
    }

    return users[userIndex]
  },

  // Deletar usuário
  deleteUser: (userId: string): boolean => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser || !currentUser.permissions.manageUsers) {
      return false
    }

    const user = users.find(u => u.id === userId)
    if (!user) return false

    // Não permitir deletar o master user
    if (user.role === 'master') {
      throw new Error('Não é possível deletar o usuário master')
    }

    users = users.filter(u => u.id !== userId)
    
    // Salvar no localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('users', JSON.stringify(users))
    }

    return true
  },

  // Carregar usuários do localStorage
  loadUsers: () => {
    if (typeof window !== 'undefined') {
      const usersStr = localStorage.getItem('users')
      if (usersStr) {
        users = JSON.parse(usersStr)
      } else {
        // Garantir que o master user sempre existe
        users = [MASTER_USER]
        localStorage.setItem('users', JSON.stringify(users))
      }
    }
  }
}

// Carregar usuários ao inicializar
if (typeof window !== 'undefined') {
  authService.loadUsers()
}
