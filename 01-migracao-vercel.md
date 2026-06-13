# Migração Flor de Lótus — GitHub Pages → Vercel

> Objetivo: remover o prefixo `/flor-de-lotus/` de todo o projeto e publicar na raiz
> de um subdomínio `.vercel.app`, desativando o GitHub Pages.
> Cada etapa tem um teste de verificação antes de avançar para a próxima.
> **Nunca pule um teste.** Se algo falhar, pare e corrija antes de continuar.

---

## 0. Pré-requisitos

```bash
cd ~/flor-de-lotus   # ajuste para o caminho real do seu repo no Termux
git status           # garanta que está tudo commitado antes de começar
git checkout -b migracao-vercel
```

Trabalhar em uma branch separada (`migracao-vercel`) permite testar tudo
localmente e só fazer merge em `main`/`desenvolvimento` quando a migração
estiver validada. Se algo der muito errado, `git checkout main` volta ao
estado funcional no GitHub Pages instantaneamente.

**Teste 0:** `git branch` deve mostrar `* migracao-vercel`.

---

## 1. Mapear todas as ocorrências de `/flor-de-lotus/`

```bash
grep -rln "/flor-de-lotus/" \
  --include="*.html" --include="*.js" --include="*.json" --include="*.css" .
```

**Teste 1:** confirme que a lista retornada contém (aproximadamente) estes arquivos:

- `index.html`
- `apps/cardapio/index.html`
- `apps/cardapio/register.html`
- `apps/cardapio/manifest.json` (verificar — pode não ter)
- `apps/cardapio/js/sw.js`
- `apps/cardapio/js/render.js`
- `apps/cardapio/js/modal.js`
- `apps/cardapio/js/profile.js`
- `apps/cardapio/js/cart.js` (se houver fallback de imagem)
- `service-worker.js`
- `apps/admin/admin-sw.js`
- `public/menu.json`

Se aparecer algo muito fora dessa lista (ex: dentro de `node_modules`,
`.git`, ou um `.bak` antigo), **não inclua no próximo passo** — refine o grep
com `--exclude-dir`.

Salve essa lista para referência:
```bash
grep -rln "/flor-de-lotus/" \
  --include="*.html" --include="*.js" --include="*.json" --include="*.css" . \
  > /tmp/arquivos-migracao.txt
cat /tmp/arquivos-migracao.txt
```

---

## 2. Backup antes da substituição em massa

```bash
mkdir -p /tmp/backup-pre-vercel
while read -r f; do
  mkdir -p "/tmp/backup-pre-vercel/$(dirname "$f")"
  cp "$f" "/tmp/backup-pre-vercel/$f"
done < /tmp/arquivos-migracao.txt
```

**Teste 2:** `find /tmp/backup-pre-vercel -type f | wc -l` deve retornar o
mesmo número de linhas que `/tmp/arquivos-migracao.txt`.

---

## 3. Substituição em massa do prefixo

```bash
while read -r f; do
  sed -i.bak 's#/flor-de-lotus/#/#g' "$f"
done < /tmp/arquivos-migracao.txt
```

Isso transforma, por exemplo:
- `/flor-de-lotus/apps/cardapio/index.html` → `/apps/cardapio/index.html`
- `/flor-de-lotus/public/menu.json` → `/public/menu.json`
- `/flor-de-lotus/public/assets/images/placeholder.jpg` → `/public/assets/images/placeholder.jpg`

**Teste 3a:** confirme que não sobrou nenhuma ocorrência:
```bash
grep -rln "/flor-de-lotus/" \
  --include="*.html" --include="*.js" --include="*.json" --include="*.css" .
```
Deve retornar **vazio** (exceto arquivos `.bak`, que ainda têm o conteúdo
antigo — isso é esperado e serve de backup local).

**Teste 3b:** confirme que não há barras duplicadas geradas pela troca:
```bash
grep -rn "//" --include="*.html" --include="*.js" --include="*.json" . \
  | grep -v "http://" | grep -v "https://" | grep -v "//esm.sh" \
  | grep -v "// "
```
Revise manualmente qualquer resultado — comentários de código (`//`) são
normais e devem ser ignorados; o que importa é não haver `src="//apps/..."`
ou similar.

---

## 4. Ajustes manuais (o `sed` não resolve sozinho)

### 4.1 `apps/cardapio/js/sw.js`

Confirme que ficou assim:
```javascript
export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      })
        .then(() => console.log('SW registrado'))
        .catch(err => console.log('Erro SW:', err));
    });
  }
}
```

**Teste 4.1:** `grep "register\|scope" apps/cardapio/js/sw.js` deve mostrar
`/service-worker.js` e `scope: '/'`.

### 4.2 `index.html` (raiz) — redirect inicial

Confirme:
```javascript
(function () {
  var visited = localStorage.getItem('fl_visited');
  var user    = localStorage.getItem('fl_user');
  if (visited || user) {
    window.location.replace('/apps/cardapio/');
  }
})();
```

**Teste 4.2:** `grep "location.replace" index.html` deve mostrar
`/apps/cardapio/` (sem `/flor-de-lotus`).

### 4.3 `apps/cardapio/register.html`

A constante `CARDAPIO = './index.html'` já é relativa — não precisa mudar.
Confirme que nenhum link absoluto restou:
```bash
grep -n "flor-de-lotus" apps/cardapio/register.html
```
**Teste 4.3:** deve retornar vazio.

### 4.4 `service-worker.js` — bump de versão (OBRIGATÓRIO)

Como o `PRECACHE` mudou de paths, clientes com o SW antigo instalado vão
continuar tentando buscar `/flor-de-lotus/...` (404 na Vercel) até o navegador
detectar a nova versão. Bumpar a versão força a substituição:

```javascript
// Antes
const VER = 'v9';
// Depois
const VER = 'v10';
```

**Teste 4.4:** `grep "const VER" service-worker.js` deve mostrar `v10`.
Confirme também que o array `PRECACHE` não tem mais `/flor-de-lotus`:
```bash
grep -A10 "PRECACHE" service-worker.js
```

### 4.5 `apps/admin/admin-sw.js`

Os ícones de notificação (`icon`, `badge`) devem estar sem o prefixo:
```javascript
icon: '/apps/cardapio/icons/icon-192.png',
badge: '/apps/cardapio/icons/icon-72.png',
```

**Teste 4.5:** `grep "icon\|badge" apps/admin/admin-sw.js` — confirme ausência
de `/flor-de-lotus`.

### 4.6 `public/menu.json`

Todas as URLs de imagem (`"imagem": "/public/assets/images/..."`) devem estar
sem o prefixo. Como esse arquivo é só fallback (o app prioriza Supabase),
o impacto de um erro aqui é baixo, mas confira:

```bash
grep -c "flor-de-lotus" public/menu.json
```
**Teste 4.6:** deve retornar `0`.

### 4.7 Manifests (`apps/cardapio/manifest.json`, `apps/admin/admin-manifest.json`)

Esses arquivos já usam paths **relativos** (`./icons/icon-192.png`,
`./index.html`) — não precisam de alteração. Apenas confirme:

```bash
grep "flor-de-lotus" apps/cardapio/manifest.json apps/admin/admin-manifest.json
```
**Teste 4.7:** deve retornar vazio (esses arquivos nunca tiveram o prefixo).

---

## 5. Criar `vercel.json` na raiz

```json
{
  "headers": [
    {
      "source": "/service-worker.js",
      "headers": [
        { "key": "Service-Worker-Allowed", "value": "/" },
        { "key": "Cache-Control", "value": "no-cache" }
      ]
    },
    {
      "source": "/apps/admin/admin-sw.js",
      "headers": [
        { "key": "Service-Worker-Allowed", "value": "/apps/admin/" },
        { "key": "Cache-Control", "value": "no-cache" }
      ]
    }
  ]
}
```

Por que isso é necessário:
- `Service-Worker-Allowed` permite que `service-worker.js`, mesmo servido da
  raiz, registre escopo `/` (sem isso alguns navegadores restringem o escopo
  ao diretório do arquivo — que já é `/`, então tecnicamente redundante aqui,
  mas inofensivo e documenta a intenção).
- `Cache-Control: no-cache` no SW garante que o navegador sempre busque a
  versão mais recente do arquivo do Service Worker (senão a Vercel/CDN pode
  cachear o SW antigo e o bump de versão do passo 4.4 não seria detectado).

**Teste 5:** `cat vercel.json | python3 -m json.tool` não deve gerar erro de
sintaxe (valida o JSON).

---

## 6. `server.js` — ajuste opcional (apenas para testes locais)

A Vercel serve estático nativamente; `server.js` não é usado em produção.
Se você quiser continuar testando localmente com `node server.js`, ajuste:

```javascript
// Antes
const BASE_PATH = '/flor-de-lotus';
// Depois
const BASE_PATH = '';
```

E o redirect da raiz:
```javascript
if (urlPath === '/' || urlPath === '') {
  res.writeHead(302, { Location: '/index.html' });
  res.end();
  return;
}
```

**Teste 6 (opcional):**
```bash
node server.js &
sleep 1
curl -sI http://localhost:5000/ | head -1        # espera 302
curl -sI http://localhost:5000/index.html | head -1  # espera 200
curl -sI http://localhost:5000/apps/cardapio/ | head -1  # espera 200
kill %1
```

---

## 7. Teste local completo (antes do push)

Use `python -m http.server` na raiz do projeto, simulando a estrutura final
da Vercel (sem prefixo):

```bash
cd ~/flor-de-lotus
python -m http.server 8080
```

Acesse no navegador do celular: `http://localhost:8080/`

### Checklist de teste manual (app cliente)

```
[ ] /index.html abre e redireciona corretamente (se já visitou) ou mostra landing
[ ] /apps/cardapio/ carrega o cardápio (menu renderiza)
[ ] /apps/cardapio/register.html carrega o cadastro
[ ] Console do navegador SEM erros 404 de paths /flor-de-lotus/...
[ ] Ícones do PWA carregam (não aparecem quebrados)
[ ] Service Worker registra sem erro (DevTools → Application → Service Workers)
[ ] Adicionar item ao carrinho funciona
[ ] Favoritos funcionam (localStorage)
[ ] Busca no cardápio funciona
[ ] Abrir modal de item funciona, imagem carrega
[ ] Enviar pedido abre o WhatsApp com mensagem correta
[ ] Tela de acompanhamento de pedido (tracking) abre após envio
```

### Checklist de teste manual (admin)

```
[ ] /apps/admin/ carrega tela de PIN
[ ] Login com PIN funciona (Supabase Auth)
[ ] Pedidos aparecem na lista
[ ] Realtime funciona (ponto crítico do napkin — RLS)
[ ] admin-sw.js registra sem erro
[ ] Ícones do admin carregam
```

**Como inspecionar console no Android sem PC:**
- Chrome: `chrome://inspect` em outro dispositivo com Chrome DevTools, ou
- usar o Eruda (`https://cdn.jsdelivr.net/npm/eruda`) temporariamente
  injetado via bookmarklet para depuração visual no próprio celular.

---

## 8. Commit e push da branch de migração

```bash
# Remove os .bak gerados pelo sed (já confirmamos que está tudo certo)
find . -name "*.bak" -delete

git add .
git status   # revise a lista de arquivos modificados — deve bater com /tmp/arquivos-migracao.txt + vercel.json + service-worker.js (VER)

git commit -m "chore: migra paths de /flor-de-lotus/ para raiz (Vercel)

- Remove prefixo /flor-de-lotus/ de HTML, JS, JSON e SW
- Bump service-worker.js para v10 (invalida cache antigo)
- Adiciona vercel.json (headers para Service Workers)
- Ajusta sw.js (scope '/'), index.html (redirect), admin-sw.js (ícones)"

git push origin migracao-vercel
```

---

## 9. Deploy na Vercel (primeira vez)

1. Acesse vercel.com → **Add New** → **Project**
2. **Import Git Repository** → selecione `Apollonik10/flor-de-lotus`
3. Configurações de build:
   - **Framework Preset:** `Other`
   - **Root Directory:** `.` (raiz)
   - **Build Command:** (deixe vazio)
   - **Output Directory:** `.` (raiz) — ou deixe a Vercel detectar
   - **Install Command:** (deixe vazio)
4. **Branch para deploy:** escolha `migracao-vercel` para o primeiro deploy
   de teste (Preview Deployment) — isso gera uma URL tipo
   `flor-de-lotus-git-migracao-vercel-apollonik.vercel.app` sem afetar nada
5. Clique em **Deploy**

**Teste 9:** após o deploy, abra a URL de preview gerada e repita o checklist
completo do passo 7, agora no ambiente real da Vercel (não localhost).

---

## 10. Promover para produção

Depois que o preview passar em todos os testes:

```bash
git checkout main          # ou 'desenvolvimento', conforme seu fluxo
git merge migracao-vercel
git push origin main
```

Na Vercel, configure o branch `main` (ou o branch padrão do projeto) como
**Production Branch** (Project Settings → Git). O push acima vai gerar
automaticamente o deploy de produção em `<nome-do-projeto>.vercel.app`.

**Teste 10:** abra `https://<nome-do-projeto>.vercel.app/` e repita o
checklist do passo 7 mais uma vez — esta é a URL final que os clientes vão
usar.

---

## 11. Atualizar referências externas

- **WhatsApp Business / cartões de visita / redes sociais:** trocar qualquer
  link antigo `apollonik10.github.io/flor-de-lotus/` pela nova URL
  `<nome-do-projeto>.vercel.app`
- **PWA já instalado nos celulares dos clientes:** o `start_url` do manifest
  é relativo (`./index.html`), então o app instalado vai continuar tentando
  abrir a URL antiga do GitHub Pages até o usuário desinstalar e reinstalar.
  **Isso é uma limitação esperada** — não há forma de "redirecionar" um PWA
  instalado para outro domínio. Avalie se vale comunicar aos clientes
  (mensagem de WhatsApp pedindo para reinstalar a partir da nova URL).

---

## 12. Desativar o GitHub Pages

Settings do repositório → **Pages** → em "Build and deployment", trocar
**Source** para `None` (ou desabilitar).

**Teste 12:** acesse `https://apollonik10.github.io/flor-de-lotus/` —
deve retornar 404 do GitHub (confirmando que foi desativado). A essa altura,
todo o tráfego já deve estar migrado para a Vercel.

---

## 13. Rollback (se algo der muito errado em produção)

Como a branch `main` original (pré-migração) ainda existe no histórico do
Git:

```bash
git revert <hash-do-commit-de-merge>
git push origin main
```

E reative o GitHub Pages (passo 12, inverso) como destino temporário enquanto
investiga o problema na Vercel. O backup em `/tmp/backup-pre-vercel/` (passo 2)
também serve como referência rápida dos arquivos originais.

---

## Resumo de arquivos alterados

| Arquivo | Mudança |
|---|---|
| `index.html` | redirect `/apps/cardapio/` |
| `apps/cardapio/index.html` | paths internos (se houver) |
| `apps/cardapio/register.html` | paths internos (se houver) |
| `apps/cardapio/js/sw.js` | `register('/service-worker.js', {scope:'/'})` |
| `apps/cardapio/js/render.js` | fallback de imagem `/public/...` |
| `apps/cardapio/js/modal.js` | fallback de imagem `/public/...` |
| `apps/cardapio/js/profile.js` | link de registro `/apps/cardapio/register.html` |
| `service-worker.js` | `VER = 'v10'`, `PRECACHE` sem prefixo |
| `apps/admin/admin-sw.js` | ícones `/apps/cardapio/icons/...` |
| `public/menu.json` | URLs de imagem `/public/assets/images/...` |
| `vercel.json` | **novo arquivo** — headers de Service Worker |
| `server.js` | (opcional) `BASE_PATH = ''` |
