/* ============================================================
   StuTool · 主脚本（密码门 + 交互）
   ============================================================ */

(function () {
  // FNV-1a 哈希：不依赖 Web Crypto，本地 file:// 预览也能用
  function fnv1a(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }

  // 密码 "123456" 的哈希。改密码：把这里换成新密码的 fnv1a 值即可
  // （计算方式：fnv1a("你的新密码")，可让我帮你算）
  const PASSWORD_HASH = '9b97f868';
  const AUTH_KEY = 'stutool_auth';

  function isAuthed() {
    try {
      return localStorage.getItem(AUTH_KEY) === PASSWORD_HASH;
    } catch (e) {
      return false;
    }
  }

  function showGate() {
    const gate = document.createElement('div');
    gate.className = 'auth-gate';
    gate.innerHTML = `
      <div class="auth-card">
        <div class="auth-logo"><i class="fas fa-graduation-cap"></i></div>
        <h2>StuTool</h2>
        <p class="auth-sub">请输入访问密码</p>
        <input class="auth-input" id="authInput" type="password" maxlength="20" placeholder="••••••" autocomplete="off">
        <button class="auth-btn" id="authBtn">进入</button>
        <div class="auth-error" id="authError"></div>
      </div>`;
    document.body.appendChild(gate);
    document.body.style.overflow = 'hidden';

    const input = gate.querySelector('#authInput');
    const btn = gate.querySelector('#authBtn');
    const err = gate.querySelector('#authError');

    function tryLogin() {
      const v = input.value.trim();
      if (!v) {
        err.textContent = '请输入密码';
        return;
      }
      if (fnv1a(v) === PASSWORD_HASH) {
        try { localStorage.setItem(AUTH_KEY, PASSWORD_HASH); } catch (e) {}
        gate.remove();
        document.body.style.overflow = '';
      } else {
        err.textContent = '密码不对，请再试一次';
        input.value = '';
        input.focus();
      }
    }

    btn.addEventListener('click', tryLogin);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') tryLogin();
    });
    setTimeout(() => input.focus(), 60);
  }

  function init() {
    if (!isAuthed()) showGate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
