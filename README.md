# Estética Study Online — Supabase + Netlify

Esta versión guarda en servidor:

- Usuarios y contraseñas mediante Supabase Auth.
- Perfil y rol de cada usuario.
- Intentos completos.
- Respuestas correctas e incorrectas.
- Preguntas marcadas con duda.
- Tiempo y confianza.
- Dominio por concepto.
- Configuración administrativa.
- Ediciones del banco de preguntas.
- Solicitudes de restablecimiento.

El progreso no se guarda en `localStorage`. Supabase puede conservar localmente el token de sesión, pero los datos académicos viven en PostgreSQL.

## 1. Crear Supabase

1. Crea un proyecto en Supabase.
2. Entra en **SQL Editor**.
3. Ejecuta íntegramente `supabase/schema.sql`.
4. En **Authentication → URL Configuration**, añade la dirección de Netlify como Site URL y Redirect URL.
5. Mantén activo Email/Password.

## 2. Variables de Netlify

En Netlify → Project configuration → Environment variables agrega:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `APP_URL`

La `service_role` solo se utiliza en Netlify Functions y nunca se incorpora al navegador.

## 3. Administrador

La función `bootstrap-admin` crea o promueve automáticamente la cuenta indicada por:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Después del primer despliegue, ingresa desde **Acceso administrador** con esas credenciales.

## 4. Restablecimiento de contraseña

1. El estudiante envía una solicitud desde la página.
2. La solicitud se guarda en `password_reset_requests`.
3. El administrador la ve en su panel.
4. Al autorizarla, una función de servidor solicita a Supabase el envío del correo de recuperación.
5. El estudiante abre el enlace y crea la nueva contraseña en la misma página.

## 5. Publicación

Conecta este proyecto a Netlify desde GitHub o usa Netlify CLI. No uses únicamente el ZIP de `dist`, porque las funciones de restablecimiento y creación del administrador también deben desplegarse.

Build command:

```text
npm run build
```

Publish directory:

```text
dist
```

Functions directory:

```text
netlify/functions
```

## Seguridad

- RLS está activo en todas las tablas expuestas.
- Cada estudiante solo puede leer y modificar su propio progreso.
- El administrador puede leer todos los progresos y modificar configuración.
- La clave `service_role` nunca debe usar el prefijo `VITE_`.
- No publiques `.env`.
