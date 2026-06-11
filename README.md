# 🌸 Flor de Lotus - PWA

Projeto de app estilo cardápio digital (PWA) feito com foco em organização de código e separação de responsabilidades.

---

## 🚀 O que é esse projeto?

Um app web que funciona como:
- Cardápio digital
- Carrinho de compras
- Sistema de favoritos
- Perfil de usuário
- Sistema de pontos (loyalty)
- Funciona offline (PWA)

---

## 📂 Estrutura do projeto

### 📄 Páginas

- `cardapio.html` → tela principal com os produtos  
- `register.html` → cadastro de usuário  

---

### ⚙️ JavaScript (arquitetura)

#### 🧠 Núcleo
- `app.js` → inicia o app e conecta tudo  
- `js/state.js` → guarda todos os dados do app  
- `js/render.js` → atualiza a tela  
- `js/events.js` → controla cliques/toques  

---

#### 🧩 Funcionalidades
- `js/api.js` → busca dados (menu.json / API)  
- `js/cart.js` → lógica do carrinho  
- `js/favorites.js` → favoritos  
- `js/loyalty.js` → sistema de pontos  
- `js/profile.js` → dados do usuário  

---

#### 🎨 Interface / suporte
- `js/modal.js` → popups  
- `js/toast.js` → mensagens rápidas  
- `js/utils.js` → funções auxiliares  

---

### 📦 Dados
- `menu.json` → lista de produtos  

---

### 🎨 Estilo
- `styles.css` → visual e responsividade  

---

### ⚙️ PWA
- `service-worker.js` → cache offline  
- `js/sw.js` → controle/registro do service worker  
- `manifest.json` → config de instalação  

---

### 🔊 Assets
- `audio/happy.mp3` → som de feedback  
- `icons/fundo1.png` → imagem/ícone  

---

## 🧠 Como o app funciona (fluxo)

1. `app.js` inicia tudo  
2. `state.js` guarda os dados  
3. `api.js` carrega produtos  
4. `render.js` mostra na tela  
5. `events.js` escuta ações do usuário  
6. módulos (`cart`, `favorites`, etc.) cuidam das regras  

---

## 📱 Foco mobile

- Interface pensada para toque  
- Sem dependência de hover  
- Estrutura leve  
- Funciona offline (PWA)  
- Separação de código pra manter performance  

---

## ⚠️ Observações

- Código separado por responsabilidade (padrão profissional)  
- Fácil de escalar e adicionar novas features  
- Ideal pra portfólio front-end  

---

## 🔥 Próximos passos (melhoria)

- Melhorar performance do render  
- Refinar UI/UX mobile  
- Integrar backend (Firebase ou API real)  
- Adicionar pagamento (Efí Bank / PIX)
- integrar deshbord própria
- integração com n8n

---

## 💡 Resumo

Projeto focado em:
- Organização de código  
- Arquitetura limpa  
- Experiência mobile  
- Evolução para SaaS
