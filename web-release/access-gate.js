(() => {
  'use strict';

  const ADMIN_ALLOWLIST = new Set([
    'geopro.ec2@gmail.com',
    'dcoellom2@unemi.edu.ec',
    'diogenes.coello@gestionderiesgos.gob.ec'
  ]);

  const LEGACY_SCRIPTS = [
    'data.js',
    'enos-data.js',
    'enos-reviews.js',
    'risk-locations.js',
    'f03-data.js',
    'cases-data.js',
    'app.js'
  ];

  const $ = selector => document.querySelector(selector);
  const normalizeEmail = value => String(value || '').trim().toLowerCase();
  let legacyLoaded = false;
  let legacyLoading = false;

  function setLoginMessage(message = '') {
    const target = $('#loginError');
    if (target) target.textContent = message;
  }

  function showLogin(message = '') {
    $('#app')?.classList.add('hidden');
    $('#login')?.classList.remove('hidden');
    $('#guideHelp')?.classList.add('hidden');
    $('#riskAnalyst')?.classList.add('hidden');
    setLoginMessage(message);
  }

  function setStatus(text, state = 'local') {
    const target = $('#syncStatus');
    if (!target) return;
    target.textContent = text;
    target.className = `sync-status ${state}`;
  }

  function isAdministrator(profile, user) {
    const email = normalizeEmail(user?.email);
    return ADMIN_ALLOWLIST.has(email)
      || profile?.codigoRol === 'ADMIN'
      || profile?.rol === 'Administrador';
  }

  function profileScope(profile) {
    const parts = [];
    if (Array.isArray(profile?.provinciaIds) && profile.provinciaIds.length) {
      parts.push(`Provincias: ${profile.provinciaIds.join(', ')}`);
    }
    if (Array.isArray(profile?.territorioIds) && profile.territorioIds.length) {
      parts.push(`Territorios: ${profile.territorioIds.join(', ')}`);
    }
    if (Array.isArray(profile?.unidadIds) && profile.unidadIds.length) {
      parts.push(`Unidades: ${profile.unidadIds.join(', ')}`);
    }
    if (Array.isArray(profile?.institucionIds) && profile.institucionIds.length) {
      parts.push(`Instituciones: ${profile.institucionIds.join(', ')}`);
    }
    return parts.length ? parts.join(' · ') : 'Alcance pendiente de completar';
  }

  function showSecureMigrationScreen(user, profile) {
    $('#login')?.classList.add('hidden');
    $('#app')?.classList.remove('hidden');
    $('#guideHelp')?.classList.add('hidden');
    $('#riskAnalyst')?.classList.add('hidden');

    const role = profile?.rol || profile?.codigoRol || 'Perfil autorizado';
    $('#sessionUser').textContent = `${user.displayName || user.email} · ${role}`;
    $('#pageTitle').textContent = 'Acceso autorizado';
    $('#pageSubtitle').textContent = 'Seguridad territorial V10';
    $('#nav').innerHTML = '';

    setStatus('Perfil verificado · datos segregados pendientes', 'saving');

    $('#content').innerHTML = `
      <section class="card">
        <span class="badge success">PERFIL AUTORIZADO</span>
        <h3>Tu cuenta fue reconocida correctamente</h3>
        <p>SmartRisk CZ5 está terminando la migración de información por territorio, provincia, institución y mesa técnica.</p>
        <div class="detail-grid">
          <section>
            <h4>Perfil</h4>
            <p><b>${escapeHtml(role)}</b></p>
          </section>
          <section>
            <h4>Alcance asignado</h4>
            <p>${escapeHtml(profileScope(profile))}</p>
          </section>
        </div>
        <div class="notice">
          Por seguridad, esta cuenta todavía no descargará la base zonal completa.
          El acceso operativo se habilitará después de finalizar las reglas y las pruebas de segregación.
        </div>
        <p><b>Soporte técnico:</b> <a href="mailto:diogenes.coello@gestionderiesgos.gob.ec">diogenes.coello@gestionderiesgos.gob.ec</a></p>
      </section>`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`No fue posible cargar ${src}`));
      document.body.appendChild(script);
    });
  }

  async function loadAdministratorApplication() {
    if (legacyLoaded || legacyLoading) return;
    legacyLoading = true;
    setStatus('Cargando administración zonal...', 'saving');

    try {
      for (const src of LEGACY_SCRIPTS) {
        await loadScript(src);
      }
      legacyLoaded = true;
    } catch (error) {
      console.error(error);
      showLogin('No fue posible cargar la administración de SmartRisk.');
      await auth.signOut();
    } finally {
      legacyLoading = false;
    }
  }

  async function readProfile(user) {
    const snapshot = await db.collection('perfiles').doc(user.uid).get();
    return snapshot.exists ? snapshot.data() : null;
  }

  async function handleAuthenticatedUser(user) {
    setLoginMessage('');
    let profile;

    try {
      profile = await readProfile(user);
    } catch (error) {
      console.error(error);
      showLogin('No fue posible verificar tu perfil. Intenta nuevamente.');
      await auth.signOut();
      return;
    }

    if (!profile || profile.estado !== 'Activo') {
      showLogin('Tu cuenta no tiene un perfil activo autorizado.');
      await auth.signOut();
      return;
    }

    if (isAdministrator(profile, user)) {
      await loadAdministratorApplication();
      return;
    }

    if (legacyLoaded) {
      location.reload();
      return;
    }

    showSecureMigrationScreen(user, profile);
  }

  $('#loginForm').onsubmit = async event => {
    event.preventDefault();
    setLoginMessage('');
    const email = normalizeEmail($('#email').value);
    const password = $('#password').value;

    try {
      await auth.signInWithEmailAndPassword(email, password);
      $('#password').value = '';
    } catch (error) {
      setLoginMessage('Correo o contraseña incorrectos.');
    }
  };

  $('#showRecovery').onclick = async () => {
    const email = normalizeEmail($('#email').value);
    if (!email) {
      setLoginMessage('Escribe tu correo para recibir el enlace.');
      $('#email').focus();
      return;
    }

    try {
      await auth.sendPasswordResetEmail(email, {
        url: location.origin + location.pathname
      });
    } catch (error) {
      // No revelar si el correo existe.
    }

    setLoginMessage('Si el correo está registrado, recibirás un enlace para definir una nueva contraseña.');
  };

  $('#logout').onclick = () => auth.signOut();

  $('#changePassword').onclick = async () => {
    const email = normalizeEmail(auth.currentUser?.email);
    if (!email) return;

    try {
      await auth.sendPasswordResetEmail(email, {
        url: location.origin + location.pathname
      });
    } catch (error) {
      // Mensaje neutro.
    }

    alert('Se solicitó un enlace para definir una nueva contraseña. Revisa tu correo.');
  };

  auth.onAuthStateChanged(async user => {
    if (user) {
      await handleAuthenticatedUser(user);
      return;
    }

    if (legacyLoaded) {
      location.reload();
      return;
    }

    showLogin();
  });

  window.SMART_RISK_ACCESS_GATE = {
    version: '10.1',
    mode: 'containment',
    support: 'diogenes.coello@gestionderiesgos.gob.ec'
  };
})();
