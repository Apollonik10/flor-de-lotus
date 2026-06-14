# 🌸 Flor de Lótus — Cardápio Digital & Delivery

Sistema de cardápio digital elegante, performante e mobile-first, desenvolvido para o restaurante **Flor de Lótus** em Cajazeiras, PB.

## 🚀 Visão Geral
O projeto foca em uma experiência de usuário premium utilizando a estética **Glassmorphism**, com foco total em dispositivos móveis e integração direta com WhatsApp e Supabase para gestão de pedidos em tempo real.

## 🛠️ Stack Tecnológica
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+ Modules).
- **Backend/Banco**: [Supabase](https://supabase.com/) (PostgreSQL, Realtime, Auth, Edge Functions).
- **Hosting/Deploy**: [Vercel](https://vercel.com/).
- **PWA**: Service Workers para funcionamento offline e instalação como app.
- **Pagamentos**: Integração com Efí Bank (PIX).

## 📂 Estrutura do Projeto
```text
/
├── public/                 # Arquivos estáticos servidos pela Vercel
│   ├── assets/             # Menu JSON e Imagens
│   ├── apps/
│   │   ├── cardapio/       # PWA do Cliente
│   │   └── admin/          # Painel do Administrador
│   └── service-worker.js   # Controle de cache e PWA
├── supabase/               # Migrations e Edge Functions
├── vercel.json             # Configurações de deploy e headers
└── README.md               # Documentação principal
```

## 📦 Instalação e Desenvolvimento (Termux)

Este projeto foi otimizado para desenvolvimento 100% via Android usando o **Termux**.

1.  **Instalar dependências:**
    ```bash
    pkg update && pkg upgrade
    pkg install nodejs git python
    ```
2.  **Clonar o repositório:**
    ```bash
    git clone https://github.com/seu-usuario/flor-de-lotus.git
    cd flor-de-lotus
    ```
3.  **Servidor Local (opcional):**
    ```bash
    npx serve public
    ```

## ☁️ Configuração do Supabase

### Tabelas Principais
Execute o SQL em `supabase/migrations/` no editor do Supabase para criar:
- `profiles`: Dados dos clientes.
- `orders`: Registro de pedidos.
- `categories` & `products`: Gestão do cardápio online.
- `store_config`: Horários e status da loja.
- `loyalty`: Sistema de pontos/fidelidade.

### Variáveis de Ambiente
Configure no seu projeto Supabase:
- `EFI_CLIENT_ID`, `EFI_CLIENT_SECRET`, `EFI_PIX_KEY` (Para a Fase 5).

## 🗺️ Roadmap de Desenvolvimento

- [x] **Fase 1:** Frontend PWA & UI Glassmorphism.
- [x] **Fase 2:** Integração Supabase (Auth & Database).
- [x] **Fase 3:** Pedidos em Tempo Real & Dashboard Admin.
- [x] **Fase 4:** Relatórios e Métricas de Vendas.
- [ ] **Fase 5:** Pagamentos PIX (Efí Bank) - *Em progresso*.
- [ ] **Fase 6:** Notificações Push & Cupons de Desconto.

## 📜 Regras de Desenvolvimento
- **Mobile-First**: Design sempre pensado primeiro no celular.
- **Caminhos Root-Relative**: Use sempre `/assets/...` ou `/apps/...` para garantir compatibilidade com a Vercel.
- **Service Worker**: Sempre incrementar a versão em `service-worker.js` após alterações críticas em CSS/JS.

---
Desenvolvido com ❤️ por Flor de Lótus.
