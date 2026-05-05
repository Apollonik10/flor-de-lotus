'use strict';

/* ═══════════════════════════════════════════════════════
   pwa/js/install.js  —  Instalação PWA Flor de Lótus
   Fluxo:
     1. Cardápio  → banner no topo (após 1.5 s)
     2. Cadastro  → modal grande após concluir onboarding
═══════════════════════════════════════════════════════ */

const K = {
  installed:  'fl_installed',
  dismissed:  'fl_banner_dismissed',
  days:       7,          // dias até o banner reaparecer
};

/* ── Detecções ─────────────────────────────────────── */
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
      || navigator.standalone === true;
}
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}
function isSafariIOS() {
  return isIOS()
      && /safari/i.test(navigator.userAgent)
      && !/crios|fxios|opios/i.test(navigator.userAgent);
}
function alreadyInstalled() {
  return isStandalone() || !!localStorage.getItem(K.installed);
}
function bannerDismissed() {
  const ts = parseInt(localStorage.getItem(K.dismissed) || '0', 10);
  return ts && (Date.now() - ts) < K.days * 864e5;
}

/* ── Animações (injetadas uma vez) ─────────────────── */
(function injectStyles() {
  if (document.getElementById('fl-pwa-styles')) return;
  const s = document.createElement('style');
  s.id = 'fl-pwa-styles';
  s.textContent = `
    /* ── Banner topo ── */
    #fl-banner {
      position: fixed; top: 0; left: 0; right: 0; z-index: 99990;
      background: linear-gradient(135deg,#1a1a1a,#111);
      border-bottom: 1px solid rgba(243,215,207,.18);
      display: flex; align-items: center; gap: .75rem;
      padding: .7rem 1rem;
      font-family: 'Outfit', system-ui, sans-serif;
      transform: translateY(-100%);
      transition: transform .4s cubic-bezier(.25,.46,.45,.94);
    }
    #fl-banner.fl-visible { transform: translateY(0); }
    .fl-banner-icon {
      width: 38px; height: 38px; border-radius: 10px;
      object-fit: cover; flex-shrink: 0;
      border: 1px solid rgba(243,215,207,.15);
    }
    .fl-banner-text { flex: 1; min-width: 0; }
    .fl-banner-text strong {
      display: block; font-size: .82rem; font-weight: 600;
      color: #f5f5f5; white-space: nowrap; overflow: hidden;
      text-overflow: ellipsis;
    }
    .fl-banner-text span {
      font-size: .72rem; color: rgba(245,245,245,.5);
    }
    .fl-banner-btn {
      flex-shrink: 0; padding: .45rem 1rem;
      font-family: 'Outfit', system-ui, sans-serif;
      font-size: .75rem; font-weight: 600;
      letter-spacing: .08em; text-transform: uppercase;
      color: #0b0b0b;
      background: linear-gradient(135deg,#e8b4a2,#d98f7a);
      border: none; border-radius: 8px; cursor: pointer;
      transition: opacity .2s;
    }
    .fl-banner-btn:active { opacity: .8; }
    .fl-banner-close {
      flex-shrink: 0; width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      background: transparent; border: none; cursor: pointer;
      color: rgba(245,245,245,.4); font-size: 1rem;
      transition: color .2s;
    }
    .fl-banner-close:active { color: rgba(245,245,245,.8); }

    /* ── Modal instalação ── */
    #fl-modal {
      position: fixed; inset: 0; z-index: 99999;
      display: flex; align-items: flex-end; justify-content: center;
      padding: 1rem;
      background: rgba(0,0,0,.78);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      opacity: 0; pointer-events: none;
      transition: opacity .35s ease;
    }
    #fl-modal.fl-visible {
      opacity: 1; pointer-events: auto;
    }
    .fl-modal-card {
      width: 100%; max-width: 440px;
      background: #0f0f0f;
      border: 1px solid rgba(243,215,207,.18);
      border-radius: 28px 28px 22px 22px;
      padding: 1.8rem 1.5rem 1.5rem;
      font-family: 'Outfit', system-ui, sans-serif;
      transform: translateY(60px);
      transition: transform .4s cubic-bezier(.25,.46,.45,.94) .05s;
    }
    #fl-modal.fl-visible .fl-modal-card {
      transform: translateY(0);
    }
    .fl-modal-pill {
      width: 44px; height: 4px; border-radius: 99px;
      background: rgba(255,255,255,.13);
      margin: 0 auto 1.6rem;
    }
    .fl-modal-header {
      display: flex; align-items: center; gap: 1rem;
      margin-bottom: 1.2rem;
    }
    .fl-modal-icon {
      width: 64px; height: 64px; border-radius: 16px;
      object-fit: cover; flex-shrink: 0;
      border: 1px solid rgba(243,215,207,.15);
      box-shadow: 0 8px 24px rgba(0,0,0,.4);
    }
    .fl-modal-label {
      font-size: .6rem; letter-spacing: .22em;
      text-transform: uppercase; color: #d98f7a;
      margin-bottom: .25rem;
      display: flex; align-items: center; gap: .3rem;
    }
    .fl-modal-title {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 1.55rem; font-weight: 300;
      color: #f5f5f5; line-height: 1.2;
    }
    .fl-modal-title em { color: #e8b4a2; font-style: italic; }
    .fl-modal-desc {
      font-size: .88rem; color: rgba(245,245,245,.58);
      line-height: 1.7; margin-bottom: 1.4rem;
    }
    /* Benefícios */
    .fl-modal-perks {
      display: flex; flex-direction: column; gap: .55rem;
      margin-bottom: 1.5rem;
    }
    .fl-modal-perk {
      display: flex; align-items: center; gap: .65rem;
      font-size: .84rem; color: rgba(245,245,245,.72);
    }
    .fl-modal-perk i {
      width: 20px; text-align: center;
      color: #d98f7a; flex-shrink: 0;
    }
    /* Passos iOS */
    .fl-ios-steps {
      padding: .9rem 1rem;
      background: rgba(232,180,162,.07);
      border: 1px solid rgba(232,180,162,.18);
      border-radius: 12px;
      margin-bottom: 1.4rem;
    }
    .fl-ios-steps ol {
      padding-left: 1.1rem;
      display: flex; flex-direction: column; gap: .5rem;
    }
    .fl-ios-steps li {
      font-size: .85rem; color: rgba(245,245,245,.7); line-height: 1.5;
    }
    .fl-ios-steps li strong { color: #f5f5f5; }
    .fl-ios-share {
      display: inline-flex; align-items: center; justify-content: center;
      width: 24px; height: 24px;
      border: 1.5px solid rgba(243,215,207,.4);
      border-radius: 5px; font-size: .75rem;
      color: #d98f7a; vertical-align: middle; margin: 0 2px;
    }
    .fl-ios-arrow {
      text-align: center; margin-top: .8rem;
      font-size: .8rem; color: #d98f7a;
    }
    .fl-ios-arrow i { animation: flBounce 1.2s ease-in-out infinite; }
    @keyframes flBounce {
      0%,100% { transform: translateY(0); }
      50%      { transform: translateY(5px); }
    }
    /* Botões */
    .fl-modal-btn-install {
      width: 100%; padding: 15px;
      font-family: 'Outfit', system-ui, sans-serif;
      font-size: .85rem; font-weight: 600;
      letter-spacing: .12em; text-transform: uppercase;
      color: #0b0b0b;
      background: linear-gradient(135deg, #e8b4a2, #d98f7a);
      border: none; border-radius: 14px; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: .5rem;
      margin-bottom: .75rem;
      box-shadow: 0 8px 24px rgba(217,143,122,.3);
      transition: opacity .2s, transform .2s;
    }
    .fl-modal-btn-install:active { opacity: .85; transform: scale(.98); }
    .fl-modal-btn-later {
      width: 100%; padding: 12px;
      font-family: 'Outfit', system-ui, sans-serif;
      font-size: .8rem; color: rgba(245,245,245,.38);
      background: transparent; border: none; cursor: pointer;
      transition: color .2s;
    }
    .fl-modal-btn-later:active { color: rgba(245,245,245,.7); }
  `;
  document.head.appendChild(s);
})();

/* ── Banner (cardápio) ─────────────────────────────── */
function showBanner() {
  if (alreadyInstalled() || bannerDismissed()) return;
  if (document.getElementById('fl-banner')) return;

  const el = document.createElement('div');
  el.id = 'fl-banner';
  el.innerHTML = `
    <img class="fl-banner-icon"
         src="./icons/icon-192.png"
         alt="Ícone Flor de Lótus">
    <div class="fl-banner-text">
      <strong>Flor de Lótus</strong>
      <span>Instale e acesse como app</span>
    </div>
    <button class="fl-banner-btn" id="fl-banner-install">Instalar</button>
    <button class="fl-banner-close" id="fl-banner-close" aria-label="Fechar">
      <i class="fas fa-times"></i>
    </button>
  `;
  document.body.prepend(el);

  /* empurra o conteúdo para baixo */
  requestAnimationFrame(() => {
    el.classList.add('fl-visible');
    document.body.style.paddingTop =
      (parseInt(document.body.style.paddingTop || '0') + el.offsetHeight) + 'px';
  });

  document.getElementById('fl-banner-install').addEventListener('click', () => {
    _closeBanner(false);
    showModal();
  });

  document.getElementById('fl-banner-close').addEventListener('click', () => {
    _closeBanner(true);
  });
}

function _closeBanner(dismiss) {
  const el = document.getElementById('fl-banner');
  if (!el) return;
  if (dismiss) localStorage.setItem(K.dismissed, String(Date.now()));
  el.classList.remove('fl-visible');
  setTimeout(() => el.remove(), 400);
  document.body.style.paddingTop = '';
}

/* ── Modal instalação (após cadastro) ─────────────── */
function showModal() {
  if (alreadyInstalled()) return;
  if (document.getElementById('fl-modal')) return;

  const hasPrompt = !!window.__pwaPrompt;
  const safIOS    = isSafariIOS();
  const otherIOS  = isIOS() && !safIOS;

  let innerHTML = '';

  if (hasPrompt) {
    innerHTML = `
      <div class="fl-modal-perks">
        <div class="fl-modal-perk"><i class="fas fa-bolt"></i> Abre com um toque — sem abrir o navegador</div>
        <div class="fl-modal-perk"><i class="fas fa-wifi-slash"></i> Funciona mesmo sem internet</div>
        <div class="fl-modal-perk"><i class="fas fa-expand"></i> Tela cheia, sem barra de endereço</div>
      </div>
      <button id="fl-modal-install" class="fl-modal-btn-install">
        <i class="fas fa-download"></i> Instalar agora — é grátis
      </button>
      <button id="fl-modal-later" class="fl-modal-btn-later">Agora não</button>
    `;
  } else if (safIOS) {
    innerHTML = `
      <div class="fl-ios-steps">
        <ol>
          <li>Toque em <span class="fl-ios-share">□↑</span> <strong>Compartilhar</strong> na barra do Safari</li>
          <li>Role e toque em <strong>"Adicionar à Tela de Início"</strong></li>
          <li>Toque em <strong>Adicionar</strong> — pronto!</li>
        </ol>
        <p class="fl-ios-arrow"><i class="fas fa-arrow-down"></i> Compartilhar fica lá embaixo</p>
      </div>
      <button id="fl-modal-later" class="fl-modal-btn-later">Entendi, farei depois</button>
    `;
  } else if (otherIOS) {
    innerHTML = `
      <p class="fl-modal-desc">
        Para instalar no iPhone, abra este link no <strong>Safari</strong>
        e toque em Compartilhar → "Adicionar à Tela de Início".
      </p>
      <button id="fl-modal-later" class="fl-modal-btn-later">Entendi</button>
    `;
  } else {
    /* Android sem prompt ainda (Chrome pode demorar 1 visita) */
    innerHTML = `
      <div class="fl-modal-perks">
        <div class="fl-modal-perk"><i class="fas fa-bolt"></i> Abre com um toque na tela inicial</div>
        <div class="fl-modal-perk"><i class="fas fa-expand"></i> Sem barra do navegador</div>
        <div class="fl-modal-perk"><i class="fas fa-wifi-slash"></i> Funciona offline</div>
      </div>
      <div class="fl-ios-steps">
        <ol>
          <li>Toque em <strong>⋮</strong> no canto superior direito do Chrome</li>
          <li>Toque em <strong>"Adicionar à tela inicial"</strong></li>
          <li>Confirme tocando em <strong>Adicionar</strong></li>
        </ol>
      </div>
      <button id="fl-modal-later" class="fl-modal-btn-later">Entendi</button>
    `;
  }

  const el = document.createElement('div');
  el.id = 'fl-modal';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = `
    <div class="fl-modal-card">
      <div class="fl-modal-pill"></div>
      <div class="fl-modal-header">
        <img class="fl-modal-icon"
             src="./icons/icon-192.png"
             alt="Flor de Lótus">
        <div>
          <p class="fl-modal-label"><i class="fas fa-mobile-screen-button"></i> App gratuito</p>
          <h2 class="fl-modal-title">Flor de <em>Lótus</em></h2>
        </div>
      </div>
      <p class="fl-modal-desc">
        Salve o cardápio na sua tela inicial e acesse como um app de verdade — rápido, bonito e sem complicação.
      </p>
      ${innerHTML}
    </div>
  `;
  document.body.appendChild(el);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add('fl-visible'));
  });

  /* Fecha ao clicar no fundo */
  el.addEventListener('click', e => {
    if (e.target === el) _closeModal();
  });

  /* Botão instalar (Android nativo) */
  document.getElementById('fl-modal-install')?.addEventListener('click', async () => {
    if (window.__pwaPrompt) {
      try {
        window.__pwaPrompt.prompt();
        const { outcome } = await window.__pwaPrompt.userChoice;
        if (outcome === 'accepted') {
          window.__pwaPrompt = null;
          localStorage.setItem(K.installed, '1');
        }
      } catch (err) {
        console.warn('[PWA] prompt error:', err);
      }
    }
    _closeModal();
  });

  /* Botão fechar */
  document.getElementById('fl-modal-later')?.addEventListener('click', _closeModal);
}

function _closeModal() {
  const el = document.getElementById('fl-modal');
  if (!el) return;
  el.classList.remove('fl-visible');
  setTimeout(() => el.remove(), 400);
}

/* ── API pública ───────────────────────────────────── */
window.PWAInstall = { showBanner, showModal };

/* ── Auto-init no cardápio (index.html) ────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const isCardapio = !!document.getElementById('mainContent');
  if (!isCardapio) return;

  /* Botão de download na top-bar (secundário) */
  const btn = document.getElementById('btnInstall');
  if (btn) {
    if (alreadyInstalled()) {
      btn.style.display = 'none';
    } else {
      btn.style.display = 'inline-flex';
      btn.addEventListener('click', () => {
        localStorage.removeItem(K.dismissed);
        showModal();
      });
    }
  }

  document.addEventListener('pwa:installed', () => {
    _closeBanner(false);
    _closeModal();
    if (btn) btn.style.display = 'none';
  });

  /* Banner aparece 1.5 s após carregar */
  if (!alreadyInstalled() && !bannerDismissed()) {
    setTimeout(showBanner, 1500);
  }
});
