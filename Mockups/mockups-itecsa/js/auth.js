/* Control de sesión simulado para mockups estáticos. */
window.ITECSA_AUTH = (() => {
  const DATA = window.ITECSA_DATA;
  const permissions = {
    m02: ['Administrador', 'Ventas', 'Cobranzas', 'Operario', 'Gerencia'],
    m03: ['Ventas'],
    m14: ['Administrador', 'Ventas', 'Cobranzas', 'Operario', 'Gerencia'],
    m04: ['Ventas', 'Cobranzas', 'Operario'],
    m05: ['Administrador', 'Ventas', 'Cobranzas', 'Operario', 'Gerencia'],
    m06: ['Cobranzas'],
    m07: ['Administrador'],
    m08: ['Operario'],
    m09: ['Operario'],
    m10: ['Administrador'],
    m11: ['Administrador', 'Ventas', 'Cobranzas', 'Operario', 'Gerencia'],
    m12: ['Gerencia'],
    m13: ['Administrador']
  };

  const pages = [
    { id: 'm02', label: 'M02 Layout base', file: 'm02-layout.html' },
    { id: 'm03', label: 'M03 Registro NV', file: 'm03-registro-pedido.html' },
    { id: 'm14', label: 'M14 Seguimiento pedidos', file: 'm14-seguimiento-pedidos.html' },
    { id: 'm04', label: 'M04 Kanban', file: 'm04-kanban.html' },
    { id: 'm05', label: 'M05 Detalle pedido', file: 'm05-detalle-pedido.html' },
    { id: 'm06', label: 'M06 Confirmación de pago', file: 'm06-confirmacion-pago.html' },
    { id: 'm07', label: 'M07 OP y ficha cliente', file: 'm07-asociacion-op.html' },
    { id: 'm08', label: 'M08 Lanyards', file: 'm08-produccion-lanyards.html' },
    { id: 'm09', label: 'M09 Tarjetas', file: 'm09-produccion-tarjetas.html' },
    { id: 'm10', label: 'M10 Capacidad', file: 'm10-capacidad.html' },
    { id: 'm11', label: 'M11 Anuncios', file: 'm11-anuncios.html' },
    { id: 'm12', label: 'M12 Reportes', file: 'm12-reportes.html' },
    { id: 'm13', label: 'M13 Usuarios', file: 'm13-gestion-usuarios.html' }
  ];

  function setSessionByRole(role) {
    const user = DATA.users.find(u => u.rol === role) || DATA.users[0];
    localStorage.setItem('itecsaUser', JSON.stringify(user));
    return user;
  }

  function getSession(defaultRole = 'Administrador') {
    const raw = localStorage.getItem('itecsaUser');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { localStorage.removeItem('itecsaUser'); }
    }
    return setSessionByRole(defaultRole);
  }

  function logout() {
    localStorage.removeItem('itecsaUser');
    localStorage.removeItem('itecsaExpired');
    window.location.href = '../index.html';
  }

  function expireSession() {
    localStorage.setItem('itecsaExpired', '1');
  }

  function isExpired() {
    return localStorage.getItem('itecsaExpired') === '1';
  }

  function clearExpired() {
    localStorage.removeItem('itecsaExpired');
  }

  function canAccess(role, pageId) {
    if (role === 'Administrador') return true;
    return (permissions[pageId] || []).includes(role);
  }

  function menuFor(role) {
    if (role === 'Administrador') return pages;
    return pages.filter(p => canAccess(role, p.id));
  }

  return { permissions, pages, setSessionByRole, getSession, logout, expireSession, isExpired, clearExpired, canAccess, menuFor };
})();
