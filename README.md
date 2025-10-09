# 🚀 Mercado Turbo - Gerenciador de Multicontas ML

Um aplicativo completo para gerenciar múltiplas contas do Mercado Livre em uma única plataforma. Monitore vendas, produtos, sincronize dados e acompanhe métricas de performance de todas as suas contas.

## ✨ Funcionalidades Principais

### 🏪 Gerenciamento de Multicontas
- **Adicionar múltiplas contas** do Mercado Livre
- **Configuração de tokens** de acesso para API
- **Status em tempo real** (ativo, inativo, suspenso)
- **Métricas individuais** por conta (vendas, produtos, reputação)

### 📦 Gestão de Produtos
- **Visualização unificada** de produtos de todas as contas
- **Monitoramento de estoque** e alertas
- **Tracking de performance** (views, vendas, conversão)
- **Organização por categorias** e contas

### 🔄 Sincronização Automática
- **Sync automática** configurável (15min, 30min, 1h, 2h)
- **Sincronização manual** individual ou em lote
- **Notificações em tempo real** do status
- **Histórico de sincronizações**

### 📊 Analytics e Relatórios
- **Dashboard completo** com métricas gerais
- **Performance por conta** e produto
- **Taxa de conversão** e ticket médio
- **Gráficos de vendas** e faturamento

## 🛠️ Tecnologias Utilizadas

- **Next.js 15** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS v4** - Estilização moderna
- **Shadcn/ui** - Componentes UI
- **Lucide Icons** - Ícones modernos
- **API Mercado Livre** - Integração oficial

## 🚀 Como Usar

### 1. Configuração Inicial
1. Clone o repositório
2. Instale as dependências: `npm install`
3. Execute o projeto: `npm run dev`

### 2. Adicionar Contas ML
1. Acesse a aba **"Contas ML"**
2. Clique em **"Nova Conta"**
3. Preencha nickname e email
4. **Opcional**: Adicione o Access Token para sincronização automática

### 3. Obter Access Token (Opcional)
Para funcionalidades avançadas, você precisa de um token da API do ML:

1. Acesse [Mercado Livre Developers](https://developers.mercadolibre.com.ar/)
2. Crie uma aplicação
3. Obtenha o Access Token
4. Cole no campo correspondente na conta

### 4. Configurar Sincronização
1. Acesse a aba **"Sincronização"**
2. Ative a **sincronização automática**
3. Escolha o **intervalo desejado**
4. Monitore o status em tempo real

## 📱 Interface

### Dashboard Principal
- **Cards de métricas** com faturamento, produtos, contas e conversão
- **Gradientes modernos** e design responsivo
- **Navegação por abas** intuitiva

### Gerenciamento de Contas
- **Cards visuais** para cada conta
- **Status colorido** (verde=ativo, amarelo=inativo, vermelho=suspenso)
- **Ações rápidas** (editar, sincronizar, excluir)
- **Visualização de tokens** com toggle de privacidade

### Tabela de Produtos
- **Listagem completa** de todos os produtos
- **Filtros por conta** e status
- **Métricas de performance** (views, vendas)
- **Alertas de estoque** baixo

### Relatórios Avançados
- **Gráficos de vendas** por conta
- **Ranking de produtos** mais vendidos
- **Métricas consolidadas** de performance

## 🎨 Design System

### Cores Principais
- **Azul**: `#3B82F6` - Elementos primários
- **Roxo**: `#8B5CF6` - Gradientes e destaques
- **Verde**: `#10B981` - Status positivo e métricas
- **Vermelho**: `#EF4444` - Alertas e status negativos

### Componentes
- **Cards com sombra** e hover effects
- **Badges coloridos** para status
- **Botões com gradientes** para ações principais
- **Tabelas responsivas** com hover states

## 🔧 Configurações Avançadas

### API do Mercado Livre
O app suporta integração completa com a API oficial:

```typescript
// Endpoints utilizados
- GET /users/me - Informações do usuário
- GET /users/{user_id}/items/search - Lista de produtos
- GET /users/{user_id}/metrics - Estatísticas de vendas
- GET /items/{item_id} - Detalhes do produto
```

### Estrutura de Dados
```typescript
interface MercadoLivreAccount {
  id: string
  nickname: string
  email: string
  status: 'active' | 'inactive' | 'suspended'
  reputation: number
  sales: number
  products: number
  lastSync: string
  accessToken?: string
}
```

## 🚨 Limitações e Considerações

### Rate Limiting
- A API do ML tem limites de requisições
- O app implementa delays entre sincronizações
- Recomendado: máximo 1 sync por minuto por conta

### Tokens de Acesso
- Tokens podem expirar e precisar renovação
- Mantenha os tokens seguros e privados
- Use apenas em ambiente confiável

### Dados Simulados
- O app inclui dados de exemplo para demonstração
- Para dados reais, configure os tokens de acesso
- Algumas métricas podem ser aproximadas

## 🔒 Segurança

- **Tokens criptografados** no armazenamento local
- **Visualização opcional** de tokens sensíveis
- **Validação de entrada** em todos os formulários
- **Tratamento de erros** da API

## 📈 Roadmap Futuro

- [ ] **Automação de preços** baseada na concorrência
- [ ] **Relatórios em PDF** exportáveis
- [ ] **Notificações push** para eventos importantes
- [ ] **Integração com WhatsApp** para alertas
- [ ] **Dashboard mobile** otimizado
- [ ] **Backup automático** de dados

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

**Desenvolvido com ❤️ para vendedores do Mercado Livre**

*Simplifique o gerenciamento de suas múltiplas contas e maximize seus resultados!*