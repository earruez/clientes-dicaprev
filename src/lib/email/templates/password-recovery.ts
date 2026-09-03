function envolverCorreo(titulo: string, contenido: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;background:#f1f5f9;color:#172033;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f1f5f9;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #dbe3ee;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:28px 32px;background:#0f2747;">
          <div style="color:#ffffff;font-size:22px;font-weight:800;">NEXTPREV</div>
          <div style="margin-top:5px;color:#bfdbfe;font-size:12px;font-weight:600;">SEGURIDAD Y CUMPLIMIENTO</div>
        </td></tr>
        <tr><td style="padding:32px;"><h1 style="margin:0 0 16px;color:#172033;font-size:22px;line-height:1.3;">${titulo}</h1>${contenido}</td></tr>
        <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;text-align:center;">Generado por NextPrev</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

export function generarEmailRecuperacionContraseña(nombre: string, link: string): string {
  return envolverCorreo(
    "Restablece tu contraseña",
    `<p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">Hola ${nombre}, recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
     <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">Usa el siguiente enlace para definir una nueva contraseña. Es válido por 24 horas y solo puede utilizarse una vez.</p>
     <p style="margin:0 0 24px;"><a href="${link}" style="display:inline-block;padding:12px 20px;background:#0f766e;border-radius:6px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">Restablecer contraseña</a></p>
     <p style="margin:0;padding:14px;background:#fff7ed;border-left:4px solid #f97316;color:#7c2d12;font-size:13px;line-height:1.6;">Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña actual no se modificará.</p>`,
  );
}

export function generarEmailContraseñaActualizada(nombre: string): string {
  return envolverCorreo(
    "Tu contraseña fue actualizada",
    `<p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">Hola ${nombre}, la contraseña de tu cuenta fue actualizada correctamente.</p>
     <p style="margin:0;padding:14px;background:#ecfdf5;border-left:4px solid #059669;color:#065f46;font-size:13px;line-height:1.6;">Ya puedes iniciar sesión con tu nueva contraseña.</p>
     <p style="margin:20px 0 0;color:#475569;font-size:13px;line-height:1.6;">Si no realizaste este cambio, contacta de inmediato al administrador de tu empresa.</p>`,
  );
}
