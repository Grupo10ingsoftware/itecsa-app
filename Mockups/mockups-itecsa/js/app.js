/* Mockups ITECSA M01-M13. Todo es estático, con estados simulados en localStorage. */
(() => {
  const DATA = window.ITECSA_DATA;
  const AUTH = window.ITECSA_AUTH;
  const PAGE_META = {
    m02: { title: 'M02 · Layout base y navegación por rol', defaultRole: 'Administrador', subtitle: 'Estructura común, permisos visibles, perfil y últimos registros.' },
    m03: { title: 'M03 · Registro de pedido desde Nota de Venta', defaultRole: 'Ventas', subtitle: 'Ingreso por NV, datos importados desde Manager, fecha estimada y sobrecarga.' },
    m04: { title: 'M04 · Kanban productivo', defaultRole: 'Operario', subtitle: 'Tablero de cuatro estados, filtros, bloqueo por pago y movimiento simulado.' },
    m05: { title: 'M05 · Detalle de pedido', defaultRole: 'Ventas', subtitle: 'Resumen comercial, pago, documentos, avance, comentarios e historial.' },
    m06: { title: 'M06 · Confirmación de pago', defaultRole: 'Cobranzas', subtitle: 'Actualización de pago con firma digital y bloqueo de avance.' },
    m07: { title: 'M07 · Asociación de OP y ficha cliente', defaultRole: 'Administrador', subtitle: 'Adjuntos documentales después del pago confirmado.' },
    m08: { title: 'M08 · Producción lanyards', defaultRole: 'Operario', subtitle: 'Stepper de Impresión, Sublimación, Corte y Costura.' },
    m09: { title: 'M09 · Producción tarjetas', defaultRole: 'Operario', subtitle: 'Stepper de Revisar información, Ordenar información y Cargar datos.' },
    m10: { title: 'M10 · Capacidad y calendario', defaultRole: 'Administrador', subtitle: 'Calendario mensual, carga diaria, sobrecarga y ajustes simulados.' },
    m11: { title: 'M11 · Anuncios y notificaciones', defaultRole: 'Administrador', subtitle: 'Comunicados internos y avisos por pedido.' },
    m12: { title: 'M12 · Reportes gerenciales', defaultRole: 'Gerencia', subtitle: 'Indicadores, gráficos estáticos y exportación simulada.' },
    m13: { title: 'M13 · Gestión de usuarios', defaultRole: 'Administrador', subtitle: 'Usuarios, roles válidos, estado, firma e historial.' }
  };

  const columns = ['Confirmación de pago', 'Listo para producción', 'En producción', 'Listo para entrega'];
  const labels = ['Todas', 'Prioridad', 'Urgencia', 'Atraso', 'Sin etiqueta'];

  document.addEventListener('DOMContentLoaded', () => {
    const pageId = document.body.dataset.page;
    if (pageId === 'login') return initLogin();
    initInternal(pageId);
  });

  function qs(selector, root = document) { return root.querySelector(selector); }
  function qsa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }
  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }
  function pageUrl(file) { return file; }
  function getOrders() {
    const raw = localStorage.getItem('itecsaOrders');
    if (!raw) return JSON.parse(JSON.stringify(DATA.orders));
    try { return JSON.parse(raw); } catch (e) { return JSON.parse(JSON.stringify(DATA.orders)); }
  }
  function saveOrders(orders) { localStorage.setItem('itecsaOrders', JSON.stringify(orders)); }
  function resetOrders() { localStorage.removeItem('itecsaOrders'); }
  function currentOrder() {
    const params = new URLSearchParams(location.search);
    const nv = params.get('nv') || localStorage.getItem('itecsaSelectedNV') || 'NV-2026-0148';
    return getOrders().find(o => o.nv === nv) || getOrders()[0];
  }
  function selectOrder(nv) { localStorage.setItem('itecsaSelectedNV', nv); }
  function paymentBadge(pago) { return `<span class="badge ${pago === 'Confirmado' ? 'ok' : pago === 'Rechazado' ? 'danger' : 'warn'}">${esc(pago)}</span>`; }
  function labelBadges(label) { return String(label).split(',').map(t => `<span class="tag ${slug(t.trim())}">${esc(t.trim())}</span>`).join(''); }
  function slug(text) { return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-'); }
  function formatNow() { return { fecha: '09-05-2026', hora: new Date().toLocaleTimeString('es-CL', { hour12: false }) }; }

  function initLogin() {
    AUTH.clearExpired();
    const app = qs('#app');
    app.innerHTML = `
      <main class="login-page">
        <section class="login-card">
          <div class="brand-block">
            <div class="brand-mark">IT</div>
            <div>
              <h1>Sistema ITECSA</h1>
              <p>M01 · Login, recuperación y primer acceso</p>
            </div>
          </div>
          <form id="loginForm" class="stack" novalidate>
            <label>Correo electrónico
              <input id="loginEmail" type="email" autocomplete="username" placeholder="admin@itecsa.example" required>
            </label>
            <label>Contraseña
              <input id="loginPassword" type="password" autocomplete="current-password" placeholder="Demo123!" required>
            </label>
            <div id="loginMessage" class="notice hidden"></div>
            <button class="btn primary" type="submit">Iniciar sesión</button>
            <button class="link-button" type="button" id="recoverLink">¿Olvidaste tu contraseña?</button>
          </form>
          <div id="recoverPanel" class="panel soft hidden">
            <h2>Recuperación de contraseña</h2>
            <p>Ingresa el correo registrado. El enlace único y temporal se simula en pantalla.</p>
            <div class="inline-form">
              <input id="recoverEmail" type="email" placeholder="ventas@itecsa.example">
              <button class="btn" id="sendRecover">Enviar enlace</button>
            </div>
            <div id="recoverMessage" class="notice small"></div>
          </div>
          <div id="firstAccessPanel" class="panel soft hidden">
            <h2>Primer acceso obligatorio</h2>
            <p>Antes de entrar al sistema se debe cambiar la contraseña.</p>
            <label>Nueva contraseña <input id="newPass" type="password" placeholder="NuevaDemo123!"></label>
            <button class="btn primary" id="changePass">Cambiar contraseña y continuar</button>
            <div id="firstAccessMessage" class="notice small"></div>
          </div>
        </section>
        <aside class="login-aside">
          <h2>Accesos de demostración</h2>
          <p>Contraseña válida para todos: <strong>Demo123!</strong></p>
          <div class="demo-users">
            ${DATA.users.map(u => `<button class="demo-user" data-role="${esc(u.rol)}"><strong>${esc(u.nombre)}</strong><span>${esc(u.rol)}</span><small>${esc(u.email)}</small></button>`).join('')}
          </div>
          <div class="panel alt-state">
            <h3>Estados alternativos visibles</h3>
            <button class="btn ghost" id="badCredentials">Simular credenciales incorrectas</button>
            <button class="btn ghost" id="disabledAccount">Simular cuenta desactivada</button>
            <button class="btn ghost" id="firstAccess">Simular primer acceso</button>
          </div>
        </aside>
      </main>`;

    qsa('.demo-user').forEach(btn => btn.addEventListener('click', () => {
      AUTH.setSessionByRole(btn.dataset.role);
      location.href = 'm02-layout.html';
    }));
    qs('#loginForm').addEventListener('submit', e => {
      e.preventDefault();
      const email = qs('#loginEmail').value.trim();
      const pass = qs('#loginPassword').value;
      const msg = qs('#loginMessage');
      if (!email || !pass) return showNotice(msg, 'Completa correo electrónico y contraseña.', 'danger');
      const user = DATA.users.find(u => u.email === email);
      if (!user || pass !== 'Demo123!') return showNotice(msg, 'Correo o contraseña incorrectos', 'danger');
      if (user.estado !== 'Vinculado') return showNotice(msg, 'Cuenta desactivada', 'danger');
      localStorage.setItem('itecsaUser', JSON.stringify(user));
      location.href = 'm02-layout.html';
    });
    qs('#recoverLink').addEventListener('click', () => qs('#recoverPanel').classList.toggle('hidden'));
    qs('#sendRecover').addEventListener('click', () => {
      const email = qs('#recoverEmail').value.trim();
      const exists = DATA.users.some(u => u.email === email);
      showNotice(qs('#recoverMessage'), exists ? 'Enlace temporal simulado generado. Estado alternativo: enlace vencido disponible para validación visual.' : 'No se encontró una cuenta asociada.', exists ? 'ok' : 'danger');
    });
    qs('#badCredentials').addEventListener('click', () => showNotice(qs('#loginMessage'), 'Correo o contraseña incorrectos', 'danger'));
    qs('#disabledAccount').addEventListener('click', () => showNotice(qs('#loginMessage'), 'Cuenta desactivada', 'danger'));
    qs('#firstAccess').addEventListener('click', () => qs('#firstAccessPanel').classList.remove('hidden'));
    qs('#changePass').addEventListener('click', () => {
      const pass = qs('#newPass').value;
      const ok = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(pass);
      if (!ok) return showNotice(qs('#firstAccessMessage'), 'La contraseña debe cumplir la política mínima: 8 caracteres, mayúscula, minúscula, número y símbolo.', 'danger');
      AUTH.setSessionByRole('Ventas');
      location.href = 'm02-layout.html';
    });
  }

  function initInternal(pageId) {
    const meta = PAGE_META[pageId];
    const user = AUTH.getSession(meta.defaultRole);
    document.title = `${meta.title} | ITECSA`;
    if (AUTH.isExpired()) {
      qs('#app').innerHTML = `
        <main class="login-page compact">
          <section class="login-card">
            <h1>Sesión expirada</h1>
            <p>La sesión fue cerrada por inactividad simulada. Vuelve al login para continuar.</p>
            <a class="btn primary" href="../index.html">Ir al login</a>
          </section>
        </main>`;
      return;
    }

    const isAllowed = AUTH.canAccess(user.rol, pageId);
    const content = isAllowed ? renderPage(pageId, user) : renderDenied(pageId, user);
    qs('#app').innerHTML = shell(pageId, user, content, meta);
    bindGlobal(pageId, user);
    if (isAllowed) bindPage(pageId, user);
  }

  function shell(pageId, user, content, meta) {
    const menu = AUTH.menuFor(user.rol);
    return `
      <div class="app-shell">
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-brand"><div class="brand-mark small">IT</div><div><strong>ITECSA</strong><span>Mockups MVP</span></div></div>
          <nav class="nav-list">
            ${menu.map(p => `<a class="nav-item ${p.id === pageId ? 'active' : ''}" href="${pageUrl(p.file)}">${esc(p.label)}</a>`).join('')}
          </nav>
          <div class="sidebar-footer">
            <span>Vista estática</span>
            <button class="btn tiny" id="resetDemo">Resetear demo</button>
          </div>
        </aside>
        <main class="content-area">
          <header class="topbar">
            <button class="icon-button mobile-only" id="toggleMenu">☰</button>
            <div>
              <h1>${esc(meta.title)}</h1>
              <p>${esc(meta.subtitle)}</p>
            </div>
            <div class="userbox">
              <div class="user-meta"><strong>${esc(user.nombre)}</strong><span>${esc(user.rol)}</span></div>
              <select id="roleSwitch" aria-label="Cambiar rol simulado">
                ${DATA.users.map(u => `<option value="${esc(u.rol)}" ${u.rol === user.rol ? 'selected' : ''}>${esc(u.rol)}</option>`).join('')}
              </select>
              <button class="btn secondary" id="expireBtn">Expirar sesión</button>
              <button class="btn danger-light" id="logoutBtn">Cerrar sesión</button>
            </div>
          </header>
          ${content}
        </main>
      </div>
      <div id="toast" class="toast hidden"></div>`;
  }

  function bindGlobal(pageId, user) {
    qs('#logoutBtn')?.addEventListener('click', AUTH.logout);
    qs('#expireBtn')?.addEventListener('click', () => { AUTH.expireSession(); location.reload(); });
    qs('#roleSwitch')?.addEventListener('change', e => { AUTH.setSessionByRole(e.target.value); location.reload(); });
    qs('#toggleMenu')?.addEventListener('click', () => qs('#sidebar').classList.toggle('open'));
    qs('#resetDemo')?.addEventListener('click', () => { resetOrders(); toast('Datos simulados reiniciados.'); setTimeout(() => location.reload(), 700); });
  }

  function renderDenied(pageId, user) {
    return `
      <section class="page-grid one">
        <article class="card denied">
          <div class="status-icon">⛔</div>
          <h2>${DATA.messages.noPermission}</h2>
          <p>Rol actual: <strong>${esc(user.rol)}</strong>. Esta pantalla queda bloqueada para validar la restricción de acceso por rol.</p>
          <a class="btn primary" href="m02-layout.html">Volver al layout</a>
        </article>
      </section>`;
  }

  function renderPage(pageId, user) {
    const map = { m02, m03, m04, m05, m06, m07, m08, m09, m10, m11, m12, m13 };
    return map[pageId](user);
  }

  function bindPage(pageId, user) {
    const map = { bindM02, bindM03, bindM04, bindM05, bindM06, bindM07, bindM08, bindM09, bindM10, bindM11, bindM12, bindM13 };
    map[`bind${pageId.toUpperCase()}`]?.(user);
  }

  function bindM02(user) {
    qs('#tryDenied')?.addEventListener('click', () => showNotice(qs('#permissionDemo'), DATA.messages.noPermission, 'danger'));
    qs('#emptyRecords')?.addEventListener('click', () => { qs('#recentRecords').innerHTML = `<li class="empty">Sin resultados</li>`; });
  }

  function m02(user) {
    const visible = AUTH.menuFor(user.rol);
    const hidden = AUTH.pages.filter(p => !visible.some(v => v.id === p.id));
    const records = DATA.orders.slice(0, 5).map(o => `<li><strong>${esc(o.nv)}</strong><span>${esc(o.fecha)}</span><em>${esc(o.estado)}</em></li>`).join('');
    return `
      <section class="page-grid two">
        <article class="card">
          <h2>Navegación disponible para ${esc(user.rol)}</h2>
          <p>El menú lateral muestra únicamente módulos permitidos para el rol actual. Administrador ve todo.</p>
          <div class="module-grid">
            ${visible.map(p => `<a class="module-tile" href="${pageUrl(p.file)}"><strong>${esc(p.label)}</strong><span>Acceso permitido</span></a>`).join('')}
          </div>
        </article>
        <article class="card">
          <h2>Perfil y últimos registros</h2>
          <dl class="detail-list"><dt>Nombre</dt><dd>${esc(user.nombre)}</dd><dt>Rol</dt><dd>${esc(user.rol)}</dd><dt>Email</dt><dd>${esc(user.email)}</dd><dt>Estado</dt><dd>${esc(user.estado)}</dd></dl>
          <ul id="recentRecords" class="timeline compact">${records}</ul>
          <button class="btn" id="emptyRecords">Simular perfil sin registros recientes</button>
        </article>
        <article class="card">
          <h2>Módulos ocultos o bloqueados</h2>
          ${hidden.length ? `<div class="blocked-list">${hidden.map(p => `<span>${esc(p.label)}</span>`).join('')}</div>` : '<p>El rol Administrador no tiene módulos ocultos.</p>'}
          <button class="btn ghost" id="tryDenied">Simular acceso restringido</button>
          <div id="permissionDemo" class="notice small hidden"></div>
        </article>
        <article class="card">
          <h2>Notificaciones</h2>
          ${notificationList(user)}
        </article>
      </section>`;
  }

  function bindM03(user) {
    const nvInput = qs('#nvInput');
    qs('#searchNV')?.addEventListener('click', () => {
      const nv = nvInput.value.trim();
      const target = getOrders().find(o => o.nv === nv) || getOrders().find(o => o.nv === 'NV-2026-0164');
      const msg = qs('#m03Message');
      if (!nv) return showNotice(msg, 'El número de NV es obligatorio.', 'danger');
      // Estado alternativo: duplicidad de Nota de Venta.
      if (nv === 'NV-2026-0148') return showNotice(msg, DATA.messages.duplicateNV, 'danger');
      showNotice(msg, nv === 'NV-2026-0164' ? DATA.messages.capacityAlert : 'Datos importados desde Manager.', nv === 'NV-2026-0164' ? 'warn' : 'ok');
      renderImported(target);
    });
    qs('#simulateUpload')?.addEventListener('click', () => { qs('#pdfStatus').textContent = 'PDF de NV adjunto de forma simulada'; });
    qs('#designUpload')?.addEventListener('click', () => { qs('#designStatus').textContent = 'Archivo de diseño adjunto de forma simulada'; });
    qs('#confirmOrder')?.addEventListener('click', () => showNotice(qs('#m03Confirm'), 'Pedido ingresado al Kanban en Confirmación de pago. Historial registra fecha 09-05-2026 y hora 08:30:00.', 'ok'));
    renderImported(getOrders().find(o => o.nv === 'NV-2026-0164'));
  }

  function renderImported(order) {
    const capacity = DATA.capacity.find(c => c.dia === order.fecha) || DATA.capacity[1];
    const percent = Math.round((capacity.usada / capacity.max) * 100);
    qs('#importedData').innerHTML = `
      <h3>Datos importados desde Manager</h3>
      <dl class="detail-list two-col">
        <dt>Cliente</dt><dd>${esc(order.cliente)}</dd><dt>RUT</dt><dd>${esc(order.rut)}</dd>
        <dt>Producto</dt><dd>${esc(order.producto)}</dd><dt>Cantidad</dt><dd>${esc(order.cantidad)}</dd>
        <dt>Datos de fabricación</dt><dd>${esc(order.fabricacion)}</dd><dt>Fecha estimada</dt><dd>${esc(order.fechaEstimada)}</dd>
      </dl>
      <div class="capacity-strip ${percent >= 90 ? 'over' : ''}"><strong>Capacidad ${percent}%</strong><span>Disponible: ${capacity.disponible} unidades · Fecha alternativa sugerida: 29-05-2026</span></div>`;
  }

  function m03(user) {
    return `
      <section class="page-grid two wide-left">
        <article class="card">
          <h2>Formulario de ingreso</h2>
          <label>Número de Nota de Venta
            <input id="nvInput" value="NV-2026-0164" placeholder="NV-YYYY-NNNN">
          </label>
          <div class="button-row"><button class="btn primary" id="searchNV">Consultar NV</button><button class="btn" id="simulateUpload">Adjuntar PDF</button><button class="btn" id="designUpload">Adjuntar diseño</button></div>
          <div id="m03Message" class="notice hidden"></div>
          <p id="pdfStatus" class="muted">PDF de NV pendiente.</p>
          <p id="designStatus" class="muted">Archivos de diseño pendientes.</p>
          <label>Comentarios
            <textarea placeholder="Observaciones comerciales o de diseño"></textarea>
          </label>
          <button class="btn primary" id="confirmOrder">Confirmar pedido</button>
          <div id="m03Confirm" class="notice small hidden"></div>
        </article>
        <article class="card" id="importedData"></article>
        <article class="card full">
          <h2>Estados alternativos de validación</h2>
          <div class="state-grid">
            <div class="state danger">Campos obligatorios vacíos</div>
            <div class="state danger">${DATA.messages.duplicateNV}</div>
            <div class="state warn">${DATA.messages.capacityAlert}</div>
            <div class="state warn">Pedido ingresado bajo sobrecarga operativa</div>
          </div>
        </article>
      </section>`;
  }

  function bindM04(user) {
    ['kanbanSearch', 'filterColumn', 'filterLabel', 'filterResponsible'].forEach(id => qs(`#${id}`)?.addEventListener('input', renderKanban));
    renderKanban();
  }

  function m04(user) {
    const responsibles = ['Todos', ...new Set(getOrders().map(o => o.responsable))];
    return `
      <section class="card">
        <div class="filters">
          <label>Búsqueda cliente/NV <input id="kanbanSearch" placeholder="Municipalidad Norte o NV-2026-0148"></label>
          <label>Columna <select id="filterColumn">${['Todas', ...columns].map(c => `<option>${esc(c)}</option>`).join('')}</select></label>
          <label>Etiqueta <select id="filterLabel">${labels.map(l => `<option>${esc(l)}</option>`).join('')}</select></label>
          <label>Responsable <select id="filterResponsible">${responsibles.map(r => `<option>${esc(r)}</option>`).join('')}</select></label>
        </div>
        <p class="muted">El movimiento de tarjetas está simulado mediante botones. Las tarjetas con pago pendiente o rechazado muestran bloqueo visual.</p>
        <div id="kanbanBoard" class="kanban-board"></div>
      </section>`;
  }

  function renderKanban() {
    const board = qs('#kanbanBoard');
    if (!board) return;
    const search = qs('#kanbanSearch')?.value.trim().toLowerCase() || '';
    const col = qs('#filterColumn')?.value || 'Todas';
    const label = qs('#filterLabel')?.value || 'Todas';
    const resp = qs('#filterResponsible')?.value || 'Todos';
    const orders = getOrders().filter(o =>
      (col === 'Todas' || o.estado === col) &&
      (label === 'Todas' || o.etiqueta.includes(label)) &&
      (resp === 'Todos' || o.responsable === resp) &&
      (!search || o.cliente.toLowerCase().includes(search) || o.nv.toLowerCase().includes(search))
    );
    board.innerHTML = columns.map(c => {
      const items = orders.filter(o => o.estado === c);
      return `<section class="kanban-col"><h2>${esc(c)} <span>${items.length}</span></h2>${items.length ? items.map(kanbanCard).join('') : '<div class="empty">Sin resultados</div>'}</section>`;
    }).join('');
    qsa('.open-detail').forEach(btn => btn.addEventListener('click', () => { selectOrder(btn.dataset.nv); location.href = `m05-detalle-pedido.html?nv=${encodeURIComponent(btn.dataset.nv)}`; }));
    qsa('.move-card').forEach(btn => btn.addEventListener('click', () => moveCard(btn.dataset.nv)));
  }

  function kanbanCard(o) {
    const blocked = o.pago !== 'Confirmado';
    return `<article class="kanban-card ${blocked ? 'blocked' : ''} ${o.atraso === 'Crítico' ? 'late' : ''}">
      <div class="card-head"><strong>${esc(o.cliente)}</strong><span class="delay ${slug(o.atraso)}">${esc(o.atraso)}</span></div>
      <dl><dt>NV</dt><dd>${esc(o.nv)}</dd><dt>OP</dt><dd>${esc(o.op)}</dd><dt>Producto</dt><dd>${esc(o.producto)}</dd><dt>Cantidad</dt><dd>${esc(o.cantidad)}</dd><dt>Fecha</dt><dd>${esc(o.fecha)}</dd><dt>Responsable</dt><dd>${esc(o.responsable)}</dd></dl>
      <div class="tag-row">${labelBadges(o.etiqueta)}</div>
      <div class="payment-line">${paymentBadge(o.pago)}</div>
      ${blocked ? `<div class="lock-msg">${DATA.messages.paymentWait}</div>` : ''}
      <div class="button-row"><button class="btn tiny open-detail" data-nv="${esc(o.nv)}">Detalle</button><button class="btn tiny move-card" data-nv="${esc(o.nv)}" ${blocked ? 'disabled' : ''}>Mover →</button></div>
    </article>`;
  }

  function moveCard(nv) {
    const orders = getOrders();
    const order = orders.find(o => o.nv === nv);
    if (!order) return;
    if (order.pago !== 'Confirmado') return toast(DATA.messages.paymentWait, 'danger');
    const idx = columns.indexOf(order.estado);
    order.estado = columns[Math.min(idx + 1, columns.length - 1)];
    if (order.estado === 'Listo para entrega') toast(DATA.messages.readyDelivery, 'ok');
    else toast(`Movimiento simulado: ${order.nv} → ${order.estado}`, 'ok');
    saveOrders(orders);
    renderKanban();
  }

  function bindM05(user) {
    qsa('.choose-order').forEach(btn => btn.addEventListener('click', () => { selectOrder(btn.dataset.nv); location.href = `m05-detalle-pedido.html?nv=${encodeURIComponent(btn.dataset.nv)}`; }));
    qs('#addComment')?.addEventListener('click', () => showNotice(qs('#commentMsg'), 'Comentario registrado con fecha 09-05-2026, hora 12:30:00 y autor del registro.', 'ok'));
  }

  function m05(user) {
    const o = currentOrder();
    const readonly = !['Administrador', 'Cobranzas', 'Operario', 'Ventas'].includes(user.rol);
    const stages = o.tipo === 'Lanyard' ? ['Impresión', 'Sublimación', 'Corte', 'Costura'] : ['Revisar información', 'Ordenar información', 'Cargar datos'];
    return `
      <section class="page-grid two wide-left">
        <article class="card">
          <div class="split-title"><h2>${esc(o.cliente)}</h2>${paymentBadge(o.pago)}</div>
          <dl class="detail-list two-col">
            <dt>NV</dt><dd>${esc(o.nv)}</dd><dt>OP</dt><dd>${esc(o.op)}</dd><dt>Producto</dt><dd>${esc(o.producto)}</dd><dt>Cantidad</dt><dd>${esc(o.cantidad)}</dd><dt>Fecha</dt><dd>${esc(o.fecha)}</dd><dt>Responsable</dt><dd>${esc(o.responsable)}</dd>
          </dl>
          <h3>Estado de pago y documento de cobro</h3>
          <p>${paymentBadge(o.pago)} <span class="muted">${esc(o.documentos.cobro)}</span></p>
          ${o.pago !== 'Confirmado' ? `<div class="notice warn">${DATA.messages.paymentWait}</div>` : ''}
        </article>
        <article class="card">
          <h2>Seleccionar pedido</h2>
          <div class="compact-buttons">${getOrders().map(x => `<button class="btn tiny choose-order" data-nv="${esc(x.nv)}">${esc(x.nv)}</button>`).join('')}</div>
          <h3>Documentos adjuntos</h3>
          <ul class="doc-list">
            <li class="${o.documentos.op ? 'ok' : 'missing'}">OP: ${o.documentos.op ? esc(o.op) : 'Documento faltante'}</li>
            <li class="${o.documentos.ficha ? 'ok' : 'missing'}">Ficha cliente: ${o.documentos.ficha ? 'Adjunta' : 'Documento faltante'}</li>
            <li class="ok">PDF de NV: adjunto</li>
          </ul>
        </article>
        <article class="card">
          <h2>Producción y avance</h2>
          ${stepper(stages, o, true)}
        </article>
        <article class="card">
          <h2>Comentarios y adjuntos</h2>
          <textarea ${readonly ? 'readonly' : ''} placeholder="Registrar comentario, observación o alerta"></textarea>
          <button class="btn primary" id="addComment" ${readonly ? 'disabled' : ''}>Agregar comentario</button>
          <div id="commentMsg" class="notice small hidden"></div>
          <p class="muted">Algunos campos quedan en solo lectura según el rol actual: ${esc(user.rol)}.</p>
        </article>
        <article class="card full">
          <h2>Historial cronológico de trazabilidad</h2>
          ${historyTimeline(o.nv)}
        </article>
      </section>`;
  }

  function bindM06(user) {
    qsa('.payment-action').forEach(btn => btn.addEventListener('click', () => {
      const status = btn.dataset.status;
      const nv = btn.dataset.nv;
      const orders = getOrders();
      const order = orders.find(o => o.nv === nv);
      if (!order) return;
      order.pago = status;
      if (status === 'Confirmado') order.estado = 'Listo para producción';
      saveOrders(orders);
      showNotice(qs(`#pay-msg-${nv}`), status === 'Confirmado' ? 'Firmado digitalmente por Carlos Cobranzas. Fecha 09-05-2026, hora 12:00:00.' : DATA.messages.paymentWait, status === 'Confirmado' ? 'ok' : 'warn');
    }));
  }

  function m06(user) {
    const list = getOrders().filter(o => o.estado === 'Confirmación de pago' || o.pago !== 'Confirmado');
    return `
      <section class="card">
        <h2>Pedidos en Confirmación de pago</h2>
        <div class="table-wrap"><table><thead><tr><th>NV</th><th>Cliente</th><th>Producto</th><th>Estado de pago</th><th>Observación</th><th>Acciones</th></tr></thead><tbody>
          ${list.map(o => `<tr><td>${esc(o.nv)}</td><td>${esc(o.cliente)}</td><td>${esc(o.producto)}</td><td>${paymentBadge(o.pago)}</td><td><input placeholder="Observación opcional"></td><td><div class="button-row"><button class="btn tiny payment-action" data-nv="${esc(o.nv)}" data-status="Pendiente">Pendiente</button><button class="btn tiny danger-light payment-action" data-nv="${esc(o.nv)}" data-status="Rechazado">Rechazado</button><button class="btn tiny primary payment-action" data-nv="${esc(o.nv)}" data-status="Confirmado">Confirmado</button></div><div id="pay-msg-${esc(o.nv)}" class="notice small hidden"></div></td></tr>`).join('')}
        </tbody></table></div>
        <div class="state-grid top-space">
          <div class="state warn">Pago pendiente: ${DATA.messages.paymentWait}</div>
          <div class="state danger">Pago rechazado: avance bloqueado</div>
          <div class="state ok">Pago confirmado: pedido pasa a Listo para producción</div>
        </div>
      </section>`;
  }

  function bindM07(user) {
    qsa('.doc-action').forEach(btn => btn.addEventListener('click', () => showNotice(qs(`#doc-msg-${btn.dataset.nv}`), btn.dataset.type === 'invalid' ? 'Archivo inválido. Formato simulado no aceptado.' : 'Documento adjunto de forma simulada y registrado en trazabilidad.', btn.dataset.type === 'invalid' ? 'danger' : 'ok')));
  }

  function m07(user) {
    return `
      <section class="card">
        <h2>Asociación documental</h2>
        <p class="muted">Solo se puede asociar OP y ficha cliente cuando el pago está confirmado.</p>
        <div class="table-wrap"><table><thead><tr><th>NV</th><th>Cliente</th><th>Pago</th><th>OP</th><th>Ficha cliente</th><th>Estado documental</th><th>Acciones</th></tr></thead><tbody>
          ${getOrders().map(o => {
            const blocked = o.pago !== 'Confirmado';
            const missing = !o.documentos.op || !o.documentos.ficha;
            return `<tr class="${blocked ? 'blocked-row' : ''}"><td>${esc(o.nv)}</td><td>${esc(o.cliente)}</td><td>${paymentBadge(o.pago)}</td><td>${o.documentos.op ? esc(o.op) : 'Falta OP'}</td><td>${o.documentos.ficha ? 'Adjunta' : 'Falta ficha'}</td><td>${blocked ? DATA.messages.paymentWait : missing ? 'Advertencia: documentos faltantes' : 'Completo'}</td><td><div class="button-row"><button class="btn tiny doc-action" data-nv="${esc(o.nv)}" ${blocked ? 'disabled' : ''}>Adjuntar OP</button><button class="btn tiny doc-action" data-nv="${esc(o.nv)}" ${blocked ? 'disabled' : ''}>Adjuntar ficha</button><button class="btn tiny danger-light doc-action" data-nv="${esc(o.nv)}" data-type="invalid" ${blocked ? 'disabled' : ''}>Simular inválido</button></div><div id="doc-msg-${esc(o.nv)}" class="notice small hidden"></div></td></tr>`;
          }).join('')}
        </tbody></table></div>
        <div class="state-grid top-space"><div class="state warn">Documento faltante en M07</div><div class="state danger">Archivo inválido en M07</div><div class="state warn">Bloqueo si el pago no está confirmado</div></div>
      </section>`;
  }

  function bindM08(user) { bindStepperPage('lanyard'); }
  function bindM09(user) { bindStepperPage('tarjeta'); }
  function bindStepperPage(kind) {
    qsa('.step-action').forEach(btn => btn.addEventListener('click', () => {
      const comment = qs(`#comment-${btn.dataset.step}`)?.value.trim();
      const msg = qs(`#step-msg-${btn.dataset.step}`);
      // Estado alternativo: comentario obligatorio al cambiar de etapa.
      if (!comment) return showNotice(msg, 'Comentario obligatorio para cambiar de etapa.', 'danger');
      showNotice(msg, 'Etapa actualizada con firma electrónica y hora 12:10:00.', 'ok');
    }));
  }

  function m08(user) {
    const o = getOrders().find(x => x.nv === 'NV-2026-0148');
    return productionPage(o, ['Impresión', 'Sublimación', 'Corte', 'Costura'], 'Lanyard', 'Estado de atraso visible: Universidad Pacífico se mantiene como caso crítico en Kanban.');
  }
  function m09(user) {
    const o = getOrders().find(x => x.nv === 'NV-2026-0152');
    return productionPage(o, ['Revisar información', 'Ordenar información', 'Cargar datos'], 'Tarjeta', 'Alerta: archivo faltante o datos inconsistentes antes de cargar datos.');
  }

  function productionPage(o, stages, typeName, alertText) {
    return `
      <section class="page-grid two wide-left">
        <article class="card">
          <h2>Pedido ${esc(typeName)}</h2>
          <dl class="detail-list two-col"><dt>Cliente</dt><dd>${esc(o.cliente)}</dd><dt>NV</dt><dd>${esc(o.nv)}</dd><dt>OP</dt><dd>${esc(o.op)}</dd><dt>Producto</dt><dd>${esc(o.producto)}</dd><dt>Cantidad</dt><dd>${esc(o.cantidad)}</dd><dt>Responsable</dt><dd>${esc(o.responsable)}</dd></dl>
          <div class="notice warn">${esc(alertText)}</div>
        </article>
        <article class="card">
          <h2>Estados alternativos</h2>
          <div class="state-grid"><div class="state danger">Comentario obligatorio</div><div class="state warn">Atraso en producción</div><div class="state danger">Usuario sin firma</div><div class="state warn">Etapa incompleta</div></div>
        </article>
        <article class="card full">
          <h2>Stepper de subprocesos</h2>
          ${interactiveStepper(stages, o)}
        </article>
      </section>`;
  }

  function bindM10(user) {
    qs('#capacityInput')?.addEventListener('input', e => { qs('#capacityPreview').textContent = `Capacidad máxima simulada actualizada a ${e.target.value} unidades/día. Requiere motivo registrado.`; });
  }

  function m10(user) {
    const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
    return `
      <section class="page-grid two wide-left">
        <article class="card">
          <h2>Calendario mayo 2026</h2>
          <div class="calendar-grid">${days.map(d => {
            const date = `${d}-05-2026`;
            const c = DATA.capacity.find(x => x.dia === date);
            const pct = c ? Math.round((c.usada / c.max) * 100) : 0;
            return `<div class="day ${pct >= 90 ? 'over' : ''}"><strong>${d}</strong><span>${pct ? pct + '%' : 'Sin carga'}</span><small>${c ? `${c.producto}: ${c.disponible} disp.` : 'Disponible'}</small></div>`;
          }).join('')}</div>
        </article>
        <article class="card">
          <h2>Ajuste de capacidad</h2>
          <label>Capacidad máxima diaria <input id="capacityInput" type="number" value="1000"></label>
          <p id="capacityPreview" class="notice small">Capacidad máxima simulada actual: 1000 unidades/día.</p>
          <h3>Parámetros de estimación</h3>
          <ul class="clean-list"><li>Lanyards 0 a 100: 5 días hábiles</li><li>Lanyards 100 a 500: 10 días hábiles</li><li>Lanyards 500 a 1000: 15 días hábiles</li><li>Tarjetas: 7 días hábiles</li></ul>
          <div class="notice warn">Sobrecarga resaltada con criterio >= 90%.</div>
        </article>
      </section>`;
  }

  function bindM11(user) {
    qsa('.mark-read').forEach(btn => btn.addEventListener('click', () => { btn.closest('.notification').classList.add('read'); btn.textContent = 'Leída'; btn.disabled = true; }));
    qs('#publishAnnouncement')?.addEventListener('click', () => showNotice(qs('#announceMsg'), 'Anuncio publicado de forma simulada por Administrador.', 'ok'));
  }

  function m11(user) {
    const canCreate = user.rol === 'Administrador';
    const notifications = DATA.notifications.filter(n => n.destinatario === user.rol || user.rol === 'Administrador');
    return `
      <section class="page-grid two">
        <article class="card">
          <div class="split-title"><h2>Anuncios</h2>${canCreate ? '<span class="badge ok">Puede publicar</span>' : '<span class="badge warn">Solo lectura</span>'}</div>
          ${DATA.announcements.map(a => `<article class="announcement"><h3>${esc(a.titulo)}</h3><p>${esc(a.texto)}</p><small>${esc(a.autor)} · ${esc(a.fecha)} ${esc(a.hora)}</small></article>`).join('')}
          ${canCreate ? `<div class="panel soft"><h3>Nuevo anuncio</h3><input placeholder="Título"><textarea placeholder="Texto del anuncio"></textarea><button class="btn primary" id="publishAnnouncement">Publicar anuncio</button><div id="announceMsg" class="notice small hidden"></div></div>` : '<div class="notice warn">Publicación bloqueada para roles distintos de Administrador.</div>'}
        </article>
        <article class="card">
          <h2>Notificaciones</h2>
          ${notifications.length ? notifications.map(n => `<article class="notification ${n.leida ? 'read' : ''}"><strong>${esc(n.mensaje)}</strong><span>${esc(n.nv)} · destinatario ${esc(n.destinatario)}</span><small>${esc(n.fecha)} ${esc(n.hora)}</small><button class="btn tiny mark-read" ${n.leida ? 'disabled' : ''}>${n.leida ? 'Leída' : 'Marcar como leída'}</button></article>`).join('') : '<div class="empty">Sin resultados</div>'}
          <div class="notice small">Los avisos productivos se muestran para usuarios con rol Operario.</div>
        </article>
      </section>`;
  }

  function bindM12(user) {
    qs('#exportCsv')?.addEventListener('click', () => {
      const csv = 'indicador,valor\nEntregas a tiempo,8\nFuera de plazo,2\nTiempo ciclo promedio,36 horas\n';
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'reporte-gerencial-itecsa.csv';
      link.click();
      URL.revokeObjectURL(link.href);
      toast('Exportación CSV simulada generada.', 'ok');
    });
    qs('#dateStart')?.addEventListener('change', validateDates);
    qs('#dateEnd')?.addEventListener('change', validateDates);
  }

  function validateDates() {
    const start = qs('#dateStart').value;
    const end = qs('#dateEnd').value;
    if (start && end && start > end) showNotice(qs('#dateMsg'), 'Rango inválido: la fecha inicial no puede ser posterior a la final.', 'danger');
  }

  function m12(user) {
    return `
      <section class="page-grid two wide-left">
        <article class="card full">
          <div class="filters"><label>Desde <input id="dateStart" value="01-05-2026"></label><label>Hasta <input id="dateEnd" value="31-05-2026"></label><button class="btn primary" id="exportCsv">Exportar Excel/CSV</button></div>
          <div id="dateMsg" class="notice small hidden"></div>
        </article>
        <article class="card metrics"><h2>Indicadores simulados</h2><div class="metric-grid"><div><strong>82%</strong><span>Entregas a tiempo</span></div><div><strong>18%</strong><span>Fuera de plazo</span></div><div><strong>36 h</strong><span>Tiempo de ciclo promedio</span></div><div><strong>91%</strong><span>Carga máxima diaria</span></div></div></article>
        <article class="card"><h2>Órdenes por estado</h2>${barSvg([1,1,2,1], columns)}</article>
        <article class="card"><h2>Ranking de productos más producidos</h2>${barSvg([3,2], ['Lanyard', 'Tarjeta'])}</article>
        <article class="card"><h2>Cumplimiento por vendedor</h2><div class="table-wrap"><table><thead><tr><th>Vendedor</th><th>NV registradas</th><th>A tiempo</th><th>Sobrecarga</th><th>Fuera de plazo</th></tr></thead><tbody><tr><td>Valentina Ventas</td><td>5</td><td>4</td><td>1</td><td>1</td></tr></tbody></table></div></article>
        <article class="card"><h2>Carga por día</h2>${barSvg([88,93,62,91,30,95,89,98], ['18','19','20','21','22','23','24','27'], '%')}</article>
      </section>`;
  }

  function bindM13(user) {
    qs('#openUserModal')?.addEventListener('click', () => qs('#userModal').classList.remove('hidden'));
    qs('#closeUserModal')?.addEventListener('click', () => qs('#userModal').classList.add('hidden'));
    qs('#saveUser')?.addEventListener('click', () => showNotice(qs('#userFormMsg'), 'Validación simulada: El correo ingresado ya está asociado a una cuenta.', 'danger'));
    qsa('.toggle-user').forEach(btn => btn.addEventListener('click', () => toast(btn.dataset.action === 'reactivar' ? 'Usuario reactivado de forma simulada.' : 'Usuario desvinculado. Los datos históricos se conservan.', 'ok')));
  }

  function m13(user) {
    return `
      <section class="card">
        <div class="split-title"><h2>Usuarios del sistema</h2><button class="btn primary" id="openUserModal">Crear nuevo usuario</button></div>
        <p class="muted">Los datos históricos se conservan aunque un usuario pase a estado Desvinculado.</p>
        <div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Firma electrónica</th><th>Acciones</th></tr></thead><tbody>
          ${DATA.users.map(u => `<tr><td>${esc(u.nombre)}</td><td>${esc(u.email)}</td><td>${esc(u.rol)}</td><td><span class="badge ${u.estado === 'Vinculado' ? 'ok' : 'danger'}">${esc(u.estado)}</span></td><td><input value="${esc(u.firma)}"></td><td><div class="button-row"><button class="btn tiny">Editar</button><button class="btn tiny danger-light toggle-user" data-action="desvincular">Desvincular</button><button class="btn tiny toggle-user" data-action="reactivar">Reactivar</button></div></td></tr>`).join('')}
        </tbody></table></div>
        <div class="state-grid top-space"><div class="state danger">Correo duplicado</div><div class="state danger">RUT inválido</div><div class="state warn">Firma faltante</div><div class="state ok">Historial conservado</div></div>
        <article class="card nested"><h3>Historial de cambios del usuario</h3><ul class="timeline compact"><li><strong>Dana Administradora</strong><span>09-05-2026</span><em>Actualizó firma electrónica</em></li><li><strong>Carlos Cobranzas</strong><span>08-05-2026</span><em>Cambio de estado registrado</em></li></ul></article>
      </section>
      <div id="userModal" class="modal-backdrop hidden"><div class="modal"><h2>Crear nuevo usuario</h2><label>Nombre <input></label><label>RUT <input placeholder="XX.XXX.XXX-X"></label><label>Email <input placeholder="correo@itecsa.example"></label><label>Rol <select>${DATA.roles.map(r => `<option>${esc(r)}</option>`).join('')}</select></label><label>Firma electrónica <input placeholder="Texto de firma"></label><div id="userFormMsg" class="notice small hidden"></div><div class="button-row"><button class="btn primary" id="saveUser">Guardar</button><button class="btn" id="closeUserModal">Cerrar</button></div></div></div>`;
  }

  function stepper(stages, order, compact = false) {
    return `<ol class="stepper ${compact ? 'compact' : ''}">${stages.map((s, i) => `<li class="${i < 2 ? 'done' : i === 2 ? 'active' : ''}"><strong>${esc(s)}</strong><span>${i < 2 ? 'Completado' : i === 2 ? 'En curso' : 'Pendiente'}</span></li>`).join('')}</ol>`;
  }
  function interactiveStepper(stages, order) {
    return `<div class="step-card-list">${stages.map((s, i) => `<article class="step-card ${i < 2 ? 'done' : i === 2 ? 'active' : ''}"><div><h3>${esc(s)}</h3><p>Responsable: ${esc(order.responsable)} · Tiempo transcurrido: ${i + 2} h · Firma: ${esc(order.responsable)}</p><span class="badge ${i === 2 ? 'warn' : 'ok'}">${i === 2 ? 'Atraso leve' : 'Sin atraso'}</span></div><label>Comentario obligatorio<textarea id="comment-${i}" placeholder="Describe el avance de la etapa"></textarea></label><button class="btn primary step-action" data-step="${i}">Actualizar etapa</button><div id="step-msg-${i}" class="notice small hidden"></div></article>`).join('')}</div>`;
  }
  function historyTimeline(nv) {
    const items = DATA.histories[nv] || [];
    if (!items.length) return '<div class="empty">Sin resultados</div>';
    return `<ul class="timeline">${items.map(h => `<li><strong>${esc(h.estado)}</strong><span>${esc(h.fecha)} · ${esc(h.hora)} · ${esc(h.usuario)}</span><em>${esc(h.accion)}</em><p>${esc(h.comentario)}</p></li>`).join('')}</ul>`;
  }
  function notificationList(user) {
    const items = DATA.notifications.filter(n => n.destinatario === user.rol || user.rol === 'Administrador');
    if (!items.length) return '<div class="empty">Sin resultados</div>';
    return `<div class="mini-notifications">${items.map(n => `<div><strong>${esc(n.mensaje)}</strong><span>${esc(n.nv)} · ${esc(n.fecha)} ${esc(n.hora)}</span></div>`).join('')}</div>`;
  }
  function barSvg(values, names, suffix = '') {
    const max = Math.max(...values, 1);
    const rows = values.map((v, i) => {
      const width = 40 + Math.round((v / max) * 260);
      const y = 25 + i * 42;
      return `<text x="10" y="${y + 14}" font-size="12">${esc(names[i])}</text><rect x="145" y="${y}" width="${width}" height="24" rx="5"></rect><text x="${155 + width}" y="${y + 16}" font-size="12">${v}${suffix}</text>`;
    }).join('');
    return `<svg class="chart" viewBox="0 0 520 ${values.length * 42 + 40}" role="img" aria-label="Gráfico estático">${rows}</svg>`;
  }
  function showNotice(el, message, type = 'ok') {
    if (!el) return;
    el.className = `notice ${type}`;
    el.textContent = message;
  }
  function toast(message, type = 'ok') {
    const t = qs('#toast');
    if (!t) return;
    t.className = `toast ${type}`;
    t.textContent = message;
    setTimeout(() => t.classList.add('hidden'), 2500);
  }
})();
