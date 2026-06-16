# 🛠️ Configuração MCP — Flor de Lótus

Guia completo para integrar Model Context Protocol (MCP) ao projeto.

## 📋 Visão Geral

```
┌─────────────────────────────────────────────────┐
│  Qualquer IA (Gemini, Claude, Cursor, MiMo)     │
│                     ↓                           │
│  ┌─────────────────────────────────────────┐    │
│  │  .mcp.json (Global)                     │    │
│  │  ├── Filesystem MCP → /flor-de-lotus    │    │
│  │  ├── GitHub MCP → Repositório           │    │
│  │  ├── Supabase MCP → Banco de Dados      │    │
│  │  └── Vercel MCP → Deploy                │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

## 📁 Arquivo Único de Configuração

**`.mcp.json`** — Configuração global para todas as IAs

Formato padrão suportado por:
- Claude Code
- Cursor
- Windsurf
- Cline
- Gemini CLI
- MiMo Code
- Qualquer ferramenta que suporte MCP

## 🚀 MCPs Disponíveis

### 1. Filesystem MCP
**Purpose**: Acesso ao sistema de arquivos do projeto

```json
{
  "filesystem": {
    "command": "npx",
    "args": [
      "-y",
      "@modelcontextprotocol/server-filesystem",
      "/data/data/com.termux/files/home/projects/flor-de-lotus"
    ]
  }
}
```

**Exemplos de uso**:
```
"Liste todos os arquivos do projeto"
"Leia o arquivo README.md"
"Crie um novo componente"
"Analise a estrutura do projeto"
```

### 2. GitHub MCP
**Purpose**: API do GitHub para issues, commits, PRs

```json
{
  "github": {
    "command": "npx",
    "args": ["-y", "github-mcp"],
    "env": {
      "GITHUB_TOKEN": "${GITHUB_TOKEN}"
    }
  }
}
```

**Exemplos de uso**:
```
"Quais issues estão abertas?"
"Crie um commit com as alterações"
"Abra um PR para a branch main"
"Liste as branches disponíveis"
```

### 3. Supabase MCP
**Purpose**: Banco de dados Supabase

```json
{
  "supabase": {
    "command": "npx",
    "args": ["-y", "@supabase/mcp-server-supabase"],
    "env": {
      "SUPABASE_URL": "${SUPABASE_URL}",
      "SUPABASE_ANON_KEY": "${SUPABASE_ANON_KEY}"
    }
  }
}
```

**Exemplos de uso**:
```
"Liste todas as tabelas do banco"
"Crie uma tabela favorites"
"Gere uma migration para adicionar coluna"
"Inspecione o schema da tabela orders"
```

### 4. Vercel MCP
**Purpose**: Deploy e gerenciamento na Vercel

```json
{
  "vercel": {
    "command": "npx",
    "args": ["-y", "mcp-server-vercel"],
    "env": {
      "VERCEL_TOKEN": "${VERCEL_TOKEN}"
    }
  }
}
```

**Exemplos de uso**:
```
"Mostre os últimos deploys"
"Faça deploy da branch staging"
"Quais ambientes estão configurados?"
"Crie um deploy de preview"
```

## 🔧 Configuração de Variáveis de Ambiente

### Método Recomendado: Arquivo `.env`

1. Copie o template:
```bash
cp .env.example .env
```

2. Preencha com suas credenciais:
```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VERCEL_TOKEN=seu_token_vercel_aqui
```

3. Para carregar automaticamente, adicione ao `~/.bashrc`:
```bash
[ -f /data/data/com.termux/files/home/projects/flor-de-lotus/.env ] && source /data/data/com.termux/files/home/projects/flor-de-lotus/.env
```

4. Execute:
```bash
source ~/.bashrc
```

**⚠️ Segurança**: O `.env` já está no `.gitignore` e nunca será commitado.

## 🎯 Fluxo de Trabalho

1. **Desenvolvimento**: Use Filesystem MCP para análise e criação de código
2. **Banco de Dados**: Use Supabase MCP para migrations e queries
3. **Controle de Versão**: Use GitHub MCP para commits e PRs
4. **Deploy**: Use Vercel MCP para publicar alterações

## ✅ Checklist

- [ ] Arquivo `.mcp.json` existe na raiz
- [ ] Variáveis de ambiente configuradas
- [ ] Testado com a IA desejada
- [ ] `.env` adicionado ao `.gitignore`

## 🐛 Solução de Problemas

### MCP não aparece

```bash
# Verificar se o pacote está instalado
npm list -g | grep mcp

# Reinstalar se necessário
npm install -g @modelcontextprotocol/server-filesystem
```

### Erro de permissão

```bash
# Verificar variáveis de ambiente
echo $GITHUB_TOKEN
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY
echo $VERCEL_TOKEN
```

### IA não reconhece os MCPs

1. Verifique se o arquivo `.mcp.json` existe
2. Reinicie a IA/IDE
3. Verifique a sintaxe JSON

---

**Status**: Configurado globalmente para todas as IAs
**Última atualização**: 2026-06-16