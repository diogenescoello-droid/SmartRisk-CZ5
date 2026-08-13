(() => {
  const ADMIN_EMAILS = new Set([
    'geopro.ec2@gmail.com',
    'dcoellom2@unemi.edu.ec',
    'diogenes.coello@gestionderiesgos.gob.ec'
  ]);
  const ECONOMIC_ROLES = new Set(['gerencia','finanzas']);
  const MANAGER_ROLES = new Set(['gerencia']);

  const listeners = new Set();
  const state = {
    ready: false,
    mode: 'loading',
    user: null,
    profile: null,
    error: null
  };

  const firebaseAvailable = () =>
    typeof window.auth !== 'undefined' && typeof window.db !== 'undefined';

  const emit = () => listeners.forEach(fn => {
    try { fn({...state}); } catch (error) { console.error(error); }
  });

  const normalizeRole = role => {
    const value = String(role || '').trim().toLowerCase();
    const aliases = {
      'administrador':'gerencia',
      'gerencia / superadministrador':'gerencia',
      'coordinación técnica':'tecnico',
      'coordinacion tecnica':'tecnico',
      'gestión contractual':'contractual',
      'gestion contractual':'contractual',
      'finanzas / contabilidad':'finanzas'
    };
    return aliases[value] || value || 'auditor';
  };

  async function getConsultoriaProfile(user) {
    if (!firebaseAvailable() || !user) return null;
    try {
      const ref = window.db.collection('consultoria_perfiles').doc(user.uid);
      const snap = await ref.get();
      if (snap.exists) {
        const data = snap.data() || {};
        return {...data, rol: normalizeRole(data.rol), uid:user.uid, correo:user.email};
      }
      if (ADMIN_EMAILS.has(String(user.email || '').toLowerCase())) {
        const bootstrap = {
          uid:user.uid,
          correo:user.email,
          nombre:user.displayName || user.email,
          rol:'gerencia',
          estado:'Activo',
          proyectos:['*'],
          creadoEn:window.firebase.firestore.FieldValue.serverTimestamp(),
          actualizadoEn:window.firebase.firestore.FieldValue.serverTimestamp()
        };
        try { await ref.set(bootstrap, {merge:true}); } catch (_) {}
        return {...bootstrap, creadoEn:null, actualizadoEn:null};
      }
      return {
        uid:user.uid,
        correo:user.email,
        nombre:user.displayName || user.email,
        rol:'auditor',
        estado:'Pendiente',
        proyectos:[]
      };
    } catch (error) {
      console.warn('SmartRisk Consultoría: perfil remoto no disponible', error);
      return ADMIN_EMAILS.has(String(user.email || '').toLowerCase())
        ? {uid:user.uid, correo:user.email, nombre:user.email, rol:'gerencia', estado:'Activo', proyectos:['*']}
        : {uid:user.uid, correo:user.email, nombre:user.email, rol:'auditor', estado:'Pendiente', proyectos:[]};
    }
  }

  function hasEconomicAccess(profile = state.profile) {
    return !!profile && ECONOMIC_ROLES.has(normalizeRole(profile.rol));
  }

  function isManager(profile = state.profile) {
    return !!profile && MANAGER_ROLES.has(normalizeRole(profile.rol));
  }

  function isActive(profile = state.profile) {
    return !!profile && String(profile.estado || '').toLowerCase() === 'activo';
  }

  function mapProjectDoc(doc) {
    const data = doc.data ? doc.data() : doc;
    const id = doc.id || data.id;
    return {
      id,
      code:data.code || data.codigo || id,
      province:data.province || data.provincia || '',
      canton:data.canton || '',
      stage:data.stage || data.etapa || 'Prospección',
      service:data.service || data.servicio || 'Consultoría',
      gate:data.gate || 'G0',
      gateProgress:Number(data.gateProgress ?? data.avanceGate ?? 0),
      gateRequirements:data.gateRequirements || data.requisitosGate || 'Pendiente de configurar',
      note:data.note || data.nota || '',
      alerts:Array.isArray(data.alerts) ? data.alerts : [],
      usuarios:Array.isArray(data.usuarios) ? data.usuarios : [],
      clienteUids:Array.isArray(data.clienteUids) ? data.clienteUids : [],
      source:'firestore'
    };
  }

  async function loadEconomicSummary(projectId) {
    if (!firebaseAvailable() || !hasEconomicAccess()) return null;
    try {
      const snap = await window.db.collection('consultoria_proyectos').doc(projectId)
        .collection('economia').doc('resumen').get();
      if (!snap.exists) return null;
      const d = snap.data() || {};
      return {
        price:Number(d.price ?? d.precio ?? 0),
        cost:Number(d.cost ?? d.costoPresupuestado ?? 0),
        committed:Number(d.committed ?? d.costoComprometido ?? 0),
        actual:Number(d.actual ?? d.costoReal ?? 0),
        invoiced:Number(d.invoiced ?? d.facturado ?? 0),
        collected:Number(d.collected ?? d.cobrado ?? 0)
      };
    } catch (error) {
      console.warn('Economía no disponible para', projectId, error);
      return null;
    }
  }

  async function loadProjects() {
    const demo = Array.isArray(window.SR_CONSULTORIA_DATA?.projects)
      ? window.SR_CONSULTORIA_DATA.projects.map(p => ({...p, source:'demo'})) : [];
    if (state.mode === 'demo' || !firebaseAvailable() || !state.user || !isActive()) return demo;

    try {
      let docs = [];
      if (isManager()) {
        const snap = await window.db.collection('consultoria_proyectos').limit(100).get();
        docs = snap.docs;
      } else {
        const snap = await window.db.collection('consultoria_proyectos')
          .where('usuarios','array-contains',state.user.uid).limit(100).get();
        docs = snap.docs;
      }
      if (!docs.length) return demo;
      const projects = docs.map(mapProjectDoc);
      if (hasEconomicAccess()) {
        const economics = await Promise.all(projects.map(p => loadEconomicSummary(p.id)));
        economics.forEach((econ,index) => { if (econ) Object.assign(projects[index], econ); });
      }
      return projects;
    } catch (error) {
      console.warn('SmartRisk Consultoría: usando datos de demostración', error);
      state.error = error;
      return demo;
    }
  }

  async function saveProject(project) {
    if (state.mode === 'demo') {
      const created = {...project, id:project.id || `demo-${Date.now()}`, source:'demo'};
      window.SR_CONSULTORIA_DATA.projects.unshift(created);
      return created;
    }
    if (!firebaseAvailable() || !state.user || !isActive()) throw new Error('Sesión no habilitada para guardar proyectos.');

    const ref = project.id
      ? window.db.collection('consultoria_proyectos').doc(project.id)
      : window.db.collection('consultoria_proyectos').doc();
    const economic = {
      price:Number(project.price || 0), cost:Number(project.cost || 0),
      committed:Number(project.committed || 0), actual:Number(project.actual || 0),
      invoiced:Number(project.invoiced || 0), collected:Number(project.collected || 0),
      updatedAt:window.firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy:state.user.email
    };
    const clean = {
      code:project.code || ref.id,
      province:project.province || '', canton:project.canton || '',
      stage:project.stage || 'Prospección', service:project.service || 'Consultoría',
      gate:project.gate || 'G0', gateProgress:Number(project.gateProgress || 0),
      gateRequirements:project.gateRequirements || '0 requisitos completados',
      note:project.note || '', alerts:Array.isArray(project.alerts) ? project.alerts : [],
      usuarios:Array.isArray(project.usuarios) && project.usuarios.length ? project.usuarios : [state.user.uid],
      clienteUids:Array.isArray(project.clienteUids) ? project.clienteUids : [],
      updatedAt:window.firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy:state.user.email
    };
    await ref.set(clean,{merge:true});
    if (hasEconomicAccess()) await ref.collection('economia').doc('resumen').set(economic,{merge:true});
    await logAudit(ref.id,'project.save',{stage:clean.stage,gate:clean.gate});
    return {...project,id:ref.id,source:'firestore'};
  }

  async function saveAction(projectId, action) {
    if (state.mode === 'demo') return {...action,id:`demo-action-${Date.now()}`,source:'demo'};
    if (!firebaseAvailable() || !state.user || !isActive()) throw new Error('Sesión no habilitada.');
    const ref = window.db.collection('consultoria_proyectos').doc(projectId).collection('acciones').doc();
    const payload = {
      ...action,
      creadoPor:state.user.email,
      creadoPorUid:state.user.uid,
      creadoEn:window.firebase.firestore.FieldValue.serverTimestamp(),
      actualizadoEn:window.firebase.firestore.FieldValue.serverTimestamp()
    };
    await ref.set(payload);
    await logAudit(projectId,'action.save',{actionId:ref.id,titulo:action.titulo || ''});
    return {...payload,id:ref.id};
  }

  async function logAudit(projectId, event, detail={}) {
    if (state.mode === 'demo' || !firebaseAvailable() || !state.user) return;
    try {
      await window.db.collection('consultoria_proyectos').doc(projectId).collection('auditoria').add({
        evento:event, detalle:detail, usuario:state.user.email, uid:state.user.uid,
        fecha:window.firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) { console.warn('No se pudo registrar auditoría', error); }
  }

  async function login(email,password) {
    if (!firebaseAvailable()) throw new Error('Firebase no está disponible en este entorno.');
    return window.auth.signInWithEmailAndPassword(email,password);
  }

  async function logout() {
    if (state.mode === 'demo') {
      state.mode='signed-out'; state.user=null; state.profile=null; emit(); return;
    }
    if (firebaseAvailable()) await window.auth.signOut();
  }

  function enterDemo() {
    state.ready=true; state.mode='demo';
    state.user={uid:'demo-user',email:'demo@smartrisk.local',displayName:'Usuario Demo'};
    state.profile={uid:'demo-user',correo:'demo@smartrisk.local',nombre:'Usuario Demo',rol:'gerencia',estado:'Activo',proyectos:['*']};
    emit();
  }

  function onSession(fn) { listeners.add(fn); fn({...state}); return () => listeners.delete(fn); }

  if (firebaseAvailable()) {
    window.auth.onAuthStateChanged(async user => {
      state.ready=true; state.user=user || null; state.error=null;
      if (user) {
        state.profile=await getConsultoriaProfile(user);
        state.mode='firebase';
      } else {
        state.profile=null; state.mode='signed-out';
      }
      emit();
    }, error => {
      state.ready=true; state.mode='error'; state.error=error; emit();
    });
  } else {
    state.ready=true; state.mode='signed-out'; emit();
  }

  window.SR_CONSULTORIA_STORE = {
    state, onSession, login, logout, enterDemo, loadProjects, saveProject, saveAction,
    logAudit, hasEconomicAccess, isManager, isActive, normalizeRole
  };
})();
