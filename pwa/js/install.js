'use strict';

/* ═══════════════════════════════════════════════════
   install.js — PWA Install (com fallback manual)
═══════════════════════════════════════════════════ */

// O evento já foi capturado no <head> (window.__pwaPrompt)
// Este arquivo só expõe as funções globais

window.isInstallable = () => !!window.__pwaPrompt;

window.triggerInstall = async () => {
  if (window.__pwaPrompt) {
    try {
      window.__pwaPrompt.prompt();
      const { outcome } = await window.__pwaPrompt.userChoice;
      console.log('[install] Escolha:', outcome);
      if (outcome === 'accepted') window.__pwaPrompt = null;
    } catch (err) {
      console.warn('[install] Erro no prompt:', err);
      showInstallGuide(); // fallback se prompt falhar
    }
  } else {
    showInstallGuide(); // fallback manual sempre disponível
  }
};

function showInstallGuide() {
  // Remove guia anterior se existir
  document.getElementById('installGuideModal')?.remove();

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const steps = isIOS
    ? `
      <li>Toque no ícone <strong>Compartilhar</strong> (□↑) na barra inferior</li>
      <li>Role e toque em <strong>"Adicionar à Tela de Início"</strong></li>
      <li>Toque em <strong>Adicionar</strong> no canto superior direito</li>
    `
    : `
      <li>Toque no menu <strong>⋮</strong> (três pontos) no canto superior direito</li>
      <li>Toque em <strong>"Adicionar à tela inicial"</strong></li>
      <li>Confirme tocando em <strong>Adicionar</strong></li>
    `;

  const modal = document.createElement('div');
  modal.id = 'installGuideModal';
  modal.innerHTML = `
    <div style="
      position:fixed;inset:0;z-index:9999;
      background:rgba(0,0,0,.75);
      backdrop-filter:blur(8px);
      display:flex;align-items:flex-end;justify-content:center;
      padding:1rem;
      animation:fadeIn .3s ease both;
    ">
      <div style="
        width:100%;max-width:420px;
        background:#111;
        border:1px solid rgba(243,215,207,.2);
        border-radius:20px 20px 16px 16px;
        padding:1.5rem;
        font-family:'Outfit',system-ui,sans-serif;
      ">
        <div style="
          width:36px;height:4px;border-radius:99px;
          background:rgba(255,255,255,.15);
          margin:0 auto 1.2rem;
        "></div>

        <p style="
          font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;
          color:#d98f7a;margin-bottom:.6rem;
          display:flex;align-items:center;gap:.4rem;
        ">
          <i class="fas fa-download"></i> Instalar App
        </p>

        <h3 style="
          font-family:'Cormorant Garamond',serif;
          font-size:1.5rem;font-weight:300;
          color:#f5f5f5;margin-bottom:.3rem;
        ">
          Adicionar à <em style="color:#e8b4a2;font-style:italic">Tela Inicial</em>
        </h3>
        <p style="font-size:.82rem;color:rgba(245,245,245,.6);margin-bottom:1.2rem;line-height:1.6">
          Siga os passos abaixo no ${isIOS ? 'Safari' : 'Chrome'}:
        </p>

        <ol style="
          padding-left:1.2rem;
          font-size:.88rem;color:rgba(245,245,245,.75);
          line-height:1.8;
          display:flex;flex-direction:column;gap:.4rem;
          margin-bottom:1.4rem;
        ">
          ${steps}
        </ol>

        <button onclick="document.getElementById('installGuideModal').remove()" style="
          width:100%;padding:13px;
          font-family:'Outfit',system-ui,sans-serif;
          font-size:.78rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;
          color:#0b0b0b;background:#d98f7a;
          border:none;border-radius:10px;cursor:pointer;
        ">
          Entendi
        </button>
      </div>
    </div>
    <style>
      @keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
    </style>
  `;

  document.body.appendChild(modal);

  // Fechar ao clicar fora
  modal.querySelector('div').addEventListener('click', e => {
    if (e.target === modal.querySelector('div')) modal.remove();
  });
}

// Atualiza botão de install na top-bar quando o evento chega
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnInstall');
  
  function updateBtn() {
    if (!btn) return;
    // Mostrar sempre — mesmo sem prompt, abre o guia manual
    btn.style.display = 'inline-flex';
    btn.setAttribute('aria-disabled', 'false');
  }

  updateBtn();
  document.addEventListener('pwa:installable', updateBtn);
  document.addEventListener('pwa:installed', () => {
    if (btn) btn.style.display = 'none';
  });

  btn?.addEventListener('click', () => window.triggerInstall?.());
});