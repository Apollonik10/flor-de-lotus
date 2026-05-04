'use strict';

/* ═══════════════════════════════════════════════════
   install.js — Pop-up automático de instalação PWA
═══════════════════════════════════════════════════ */

const DISMISS_KEY   = 'fl_install_dismissed';
const INSTALLED_KEY = 'fl_installed';
const DISMISS_DAYS  = 3; // dias até mostrar de novo após dispensar

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
}

function wasRecentlyDismissed() {
  const ts = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
  if (!ts) return false;
  return (Date.now() - ts) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function isSafariIOS() {
  return isIOS() && /safari/i.test(navigator.userAgent) && !/crios|fxios|opios/i.test(navigator.userAgent);
}

/* ─── Remove popup se existir ─── */
function removePopup() {
  const el = document.getElementById('fl-install-popup');
  if (el) {
    el.style.animation = 'flInstallOut .3s ease both';
    setTimeout(() => el.remove(), 300);
  }
}

/* ─── Cria e exibe o popup ─── */
function showInstallPopup() {
  if (document.getElementById('fl-install-popup')) return;
  if (isStandalone()) return;
  if (localStorage.getItem(INSTALLED_KEY)) return;
  if (wasRecentlyDismissed()) return;

  const ios = isIOS();
  const safariIOS = isSafariIOS();
  const hasNativePrompt = !!window.__pwaPrompt;

  let bodyHTML = '';

  if (hasNativePrompt) {
    bodyHTML = `
      <p class="fl-install-sub">
        Instale o cardápio no seu celular para acessar com um toque, sem abrir o navegador — como um app de verdade.
      </p>
      <button id="fl-install-confirm" class="fl-install-btn-primary">
        <i class="fas fa-download"></i> Instalar agora
      </button>
      <button id="fl-install-later" class="fl-install-btn-ghost">Agora não</button>
    `;
  } else if (safariIOS) {
    bodyHTML = `
      <p class="fl-install-sub">
        Adicione o cardápio à sua tela inicial e abra como um app — sem barra de navegação.
      </p>
      <ol class="fl-install-steps">
        <li>Toque no ícone <strong>Compartilhar</strong> <span class="fl-install-icon-demo">□↑</span> na barra inferior do Safari</li>
        <li>Role e toque em <strong>"Adicionar à Tela de Início"</strong></li>
        <li>Toque em <strong>Adicionar</strong> no canto superior direito</li>
      </ol>
      <div class="fl-install-ios-arrow">
        <i class="fas fa-arrow-down fl-install-arrow-bounce"></i>
        <span>Toque em Compartilhar abaixo</span>
      </div>
      <button id="fl-install-later" class="fl-install-btn-ghost" style="margin-top:.8rem">Entendi</button>
    `;
  } else if (ios) {
    bodyHTML = `
      <p class="fl-install-sub">
        Para instalar, abra este link no <strong>Safari</strong> e use o botão Compartilhar.
      </p>
      <button id="fl-install-later" class="fl-install-btn-ghost">Entendi</button>
    `;
  } else {
    bodyHTML = `
      <p class="fl-install-sub">
        Adicione o cardápio à tela inicial do seu celular e acesse como um app — sem barra do navegador.
      </p>
      <ol class="fl-install-steps">
        <li>Toque no menu <strong>⋮</strong> no canto superior direito do Chrome</li>
        <li>Toque em <strong>"Adicionar à tela inicial"</strong></li>
        <li>Confirme tocando em <strong>Adicionar</strong></li>
      </ol>
      <button id="fl-install-later" class="fl-install-btn-ghost" style="margin-top:.8rem">Entendi</button>
    `;
  }

  const popup = document.createElement('div');
  popup.id = 'fl-install-popup';
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-modal', 'true');
  popup.setAttribute('aria-label', 'Instalar app Flor de Lótus');
  popup.innerHTML = `
    <style>
      #fl-install-popup {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: 1rem;
        background: rgba(0,0,0,.72);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        animation: flInstallIn .35s cubic-bezier(.25,.46,.45,.94) both;
      }
      @keyframes flInstallIn {
        from { opacity:0; }
        to   { opacity:1; }
      }
      @keyframes flInstallOut {
        from { opacity:1; }
        to   { opacity:0; }
      }
      .fl-install-card {
        width: 100%;
        max-width: 420px;
        background: #0f0f0f;
        border: 1px solid rgba(243,215,207,.18);
        border-radius: 24px 24px 20px 20px;
        padding: 1.6rem 1.4rem 1.4rem;
        font-family: 'Outfit', system-ui, sans-serif;
        animation: flCardIn .4s cubic-bezier(.25,.46,.45,.94) .05s both;
      }
      @keyframes flCardIn {
        from { transform: translateY(60px); opacity:0; }
        to   { transform: translateY(0);    opacity:1; }
      }
      .fl-install-pill {
        width: 40px; height: 4px;
        border-radius: 99px;
        background: rgba(255,255,255,.15);
        margin: 0 auto 1.4rem;
      }
      .fl-install-header {
        display: flex;
        align-items: center;
        gap: .9rem;
        margin-bottom: 1rem;
      }
      .fl-install-logo {
        width: 56px; height: 56px;
        border-radius: 14px;
        object-fit: cover;
        flex-shrink: 0;
        border: 1px solid rgba(243,215,207,.15);
      }
      .fl-install-title-block {}
      .fl-install-label {
        font-size: .6rem;
        letter-spacing: .2em;
        text-transform: uppercase;
        color: #d98f7a;
        margin-bottom: .2rem;
        display: flex;
        align-items: center;
        gap: .3rem;
      }
      .fl-install-title {
        font-family: 'Cormorant Garamond', Georgia, serif;
        font-size: 1.45rem;
        font-weight: 300;
        color: #f5f5f5;
        line-height: 1.2;
      }
      .fl-install-title em {
        color: #e8b4a2;
        font-style: italic;
      }
      .fl-install-sub {
        font-size: .85rem;
        color: rgba(245,245,245,.6);
        line-height: 1.65;
        margin-bottom: 1.2rem;
      }
      .fl-install-steps {
        padding-left: 1.1rem;
        margin: 0 0 1.2rem;
        display: flex;
        flex-direction: column;
        gap: .55rem;
      }
      .fl-install-steps li {
        font-size: .86rem;
        color: rgba(245,245,245,.72);
        line-height: 1.5;
      }
      .fl-install-steps li strong {
        color: #f5f5f5;
      }
      .fl-install-icon-demo {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px; height: 22px;
        border: 1.5px solid rgba(243,215,207,.45);
        border-radius: 5px;
        font-size: .75rem;
        color: #d98f7a;
        vertical-align: middle;
        margin: 0 2px;
      }
      .fl-install-ios-arrow {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: .5rem;
        font-size: .8rem;
        color: #d98f7a;
        margin-top: .6rem;
        margin-bottom: .4rem;
      }
      .fl-install-arrow-bounce {
        animation: arrowBounce 1.2s ease-in-out infinite;
      }
      @keyframes arrowBounce {
        0%,100% { transform: translateY(0); }
        50%      { transform: translateY(5px); }
      }
      .fl-install-btn-primary {
        width: 100%;
        padding: 14px;
        font-family: 'Outfit', system-ui, sans-serif;
        font-size: .82rem;
        font-weight: 600;
        letter-spacing: .1em;
        text-transform: uppercase;
        color: #0b0b0b;
        background: linear-gradient(135deg, #e8b4a2, #d98f7a);
        border: none;
        border-radius: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: .5rem;
        margin-bottom: .65rem;
        transition: opacity .2s;
      }
      .fl-install-btn-primary:active { opacity: .85; }
      .fl-install-btn-ghost {
        width: 100%;
        padding: 11px;
        font-family: 'Outfit', system-ui, sans-serif;
        font-size: .78rem;
        font-weight: 400;
        color: rgba(245,245,245,.45);
        background: transparent;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        transition: color .2s;
      }
      .fl-install-btn-ghost:active { color: rgba(245,245,245,.75); }
    </style>

    <div class="fl-install-card">
      <div class="fl-install-pill"></div>

      <div class="fl-install-header">
        <img
          class="fl-install-logo"
          src="/flor-de-lotus/pwa/icons/icon-192.png"
          alt="Ícone Flor de Lótus"
        />
        <div class="fl-install-title-block">
          <p class="fl-install-label">
            <i class="fas fa-mobile-screen-button"></i> App Gratuito
          </p>
          <h2 class="fl-install-title">
            Flor de <em>Lótus</em>
          </h2>
        </div>
      </div>

      ${bodyHTML}
    </div>
  `;

  document.body.appendChild(popup);

  /* Fechar ao clicar no fundo */
  popup.addEventListener('click', e => {
    if (e.target === popup) dismiss();
  });

  /* Botão confirmar (Android/Chrome nativo) */
  const btnConfirm = document.getElementById('fl-install-confirm');
  if (btnConfirm) {
    btnConfirm.addEventListener('click', async () => {
      if (window.__pwaPrompt) {
        try {
          window.__pwaPrompt.prompt();
          const { outcome } = await window.__pwaPrompt.userChoice;
          if (outcome === 'accepted') {
            window.__pwaPrompt = null;
            localStorage.setItem(INSTALLED_KEY, '1');
          }
        } catch (err) {
          console.warn('[install] prompt error:', err);
        }
      }
      removePopup();
    });
  }

  /* Botão dispensar */
  const btnLater = document.getElementById('fl-install-later');
  if (btnLater) {
    btnLater.addEventListener('click', dismiss);
  }
}

function dismiss() {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
  removePopup();
}

/* ─── Botão install na top-bar ─── */
window.isInstallable = () => !!window.__pwaPrompt;

window.triggerInstall = () => {
  localStorage.removeItem(DISMISS_KEY);
  showInstallPopup();
};

/* ─── Inicialização ─── */
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnInstall');

  function updateBtn() {
    if (!btn) return;
    if (isStandalone() || localStorage.getItem(INSTALLED_KEY)) {
      btn.style.display = 'none';
    } else {
      btn.style.display = 'inline-flex';
    }
  }

  updateBtn();
  document.addEventListener('pwa:installable', updateBtn);
  document.addEventListener('pwa:installed', () => {
    if (btn) btn.style.display = 'none';
    removePopup();
  });

  btn?.addEventListener('click', () => window.triggerInstall());

  /* Pop-up automático: exibe 2s após carregar,
     mas só se não estiver em modo standalone e não dispensou recentemente */
  if (!isStandalone() && !localStorage.getItem(INSTALLED_KEY) && !wasRecentlyDismissed()) {
    setTimeout(() => {
      showInstallPopup();
    }, 2000);
  }
});
