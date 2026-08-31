/**
 * Plantilla de email de bienvenida para nuevos usuarios
 */
export function generarEmailBienvenidaUsuario(
  nombre: string,
  email: string,
  rol: string,
  empresaNombre: string,
  linkCambioContraseña: string,
): string {
  const rolLabel = {
    SUPERADMIN: "Superadministrador",
    ADMIN_EMPRESA: "Administrador de Empresa",
    PREVENCIONISTA: "Prevencionista",
    SUPERVISOR: "Supervisor",
    TRABAJADOR: "Trabajador",
    AUDITOR: "Auditor",
    LECTURA: "Usuario de Lectura",
  }[rol] || rol;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      background-color: #f8fafc;
      color: #1f2937;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .logo-subtitle {
      color: #cbd5e1;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .intro {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 24px;
      line-height: 1.8;
    }
    .info-card {
      background-color: #f1f5f9;
      border-left: 4px solid #3b82f6;
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 24px;
    }
    .info-card-title {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .info-card-value {
      font-size: 15px;
      font-weight: 600;
      color: #0f172a;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }
    .info-item {
      background-color: #f8fafc;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .info-item-label {
      font-size: 11px;
      color: #94a3b8;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .info-item-value {
      font-size: 13px;
      color: #1f2937;
      font-weight: 600;
    }
    .action-section {
      background: linear-gradient(135deg, #ecf0f1 0%, #f8fafc 100%);
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 24px;
      text-align: center;
    }
    .action-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .action-text {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 16px;
      line-height: 1.8;
    }
    .cta-button {
      display: inline-block;
      padding: 12px 32px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: #ffffff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
    }
    .security-note {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 24px;
      font-size: 12px;
      color: #92400e;
    }
    .security-note-title {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .divider {
      height: 1px;
      background-color: #e2e8f0;
      margin: 24px 0;
    }
    .features {
      margin: 24px 0;
    }
    .features-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .feature-list {
      list-style: none;
    }
    .feature-item {
      font-size: 13px;
      color: #475569;
      margin-bottom: 8px;
      padding-left: 24px;
      position: relative;
    }
    .feature-item:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #10b981;
      font-weight: 700;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 30px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
    }
    .footer-text {
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 12px;
      line-height: 1.6;
    }
    .footer-link {
      color: #3b82f6;
      text-decoration: none;
    }
    .footer-link:hover {
      text-decoration: underline;
    }
    .company-info {
      font-size: 11px;
      color: #cbd5e1;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo">NextPrev</div>
      <div class="logo-subtitle">Next Level Safety & Compliance</div>
    </div>

    <!-- Content -->
    <div class="content">
      <div class="greeting">¡Bienvenido, ${nombre}!</div>

      <div class="intro">
        Se ha creado una nueva cuenta de usuario en <strong>NextPrev</strong> para que accedas a la plataforma de seguridad y cumplimiento normativo de tu empresa.
      </div>

      <!-- Información de Cuenta -->
      <div class="info-card">
        <div class="info-card-title">Información de tu cuenta</div>
        <div class="info-card-value">${email}</div>
      </div>

      <!-- Grid de detalles -->
      <div class="info-grid">
        <div class="info-item">
          <div class="info-item-label">Rol Asignado</div>
          <div class="info-item-value">${rolLabel}</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">Empresa</div>
          <div class="info-item-value">${empresaNombre}</div>
        </div>
      </div>

      <!-- Seguridad -->
      <div class="security-note">
        <div class="security-note-title">🔒 Importante: Cambio de contraseña requerido</div>
        <div>Se ha generado una contraseña temporal para acceder. Te recomendamos cambiarla la primera vez que inicies sesión.</div>
      </div>

      <!-- Acción Principal -->
      <div class="action-section">
        <div class="action-title">¿Listo para comenzar?</div>
        <div class="action-text">
          Usa el enlace a continuación para establecer tu contraseña definitiva. Este enlace es válido por 24 horas.
        </div>
        <a href="${linkCambioContraseña}" class="cta-button">Establecer mi contraseña</a>
      </div>

      <!-- Características -->
      <div class="features">
        <div class="features-title">Con NextPrev podrás:</div>
        <ul class="feature-list">
          <li class="feature-item">Gestionar documentación de seguridad y cumplimiento</li>
          <li class="feature-item">Registrar y monitorear permisos de instalación</li>
          <li class="feature-item">Acceder a reportes personalizados</li>
          <li class="feature-item">Colaborar con tu equipo en tiempo real</li>
          <li class="feature-item">Mantenerte actualizado con notificaciones</li>
        </ul>
      </div>

      <!-- Divider -->
      <div class="divider"></div>

      <!-- Soporte -->
      <div class="intro" style="margin-bottom: 0;">
        <strong>¿Necesitas ayuda?</strong><br>
        Si tienes problemas para acceder o tienes preguntas, no dudes en contactar al equipo de soporte.
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-text">
        Este es un correo de notificación automático de NextPrev. No respondas a este mensaje.
      </div>
      <div class="footer-text">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://app.nextprev.cl"}" class="footer-link">Acceder a NextPrev</a>
      </div>
      <div class="company-info">
        © ${new Date().getFullYear()} NextPrev. Todos los derechos reservados.<br>
        Plataforma de Seguridad y Cumplimiento Normativo
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
