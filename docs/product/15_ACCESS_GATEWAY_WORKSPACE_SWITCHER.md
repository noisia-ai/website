# Access Gateway + Workspace Switcher

## Status

Backlog, post-prod stabilization.

## Problema

La pantalla publica de Studio hoy funciona como landing de login, pero no como una
experiencia SaaS de acceso. Kinde autentica bien, pero la seleccion de organizacion
vive fuera de Noisia. Si un usuario entra con la organizacion equivocada, debe cerrar
sesion y repetir el login.

Tambien falta una superficie propia para perfil, organizaciones, invitaciones,
roles y permisos por marca/output.

## Rol de Kinde

Kinde debe ser la capa de identidad:

- login
- MFA/passwordless
- email verification
- session
- organization membership como senal externa

Noisia debe ser la capa de producto:

- workspace activo
- rol canonico
- permisos por organizacion
- permisos por marca
- permisos por published output
- auditoria

## Roles Canonicos

- `noisia_admin`: administra Studio completo, organizaciones, usuarios, marcas,
  estudios, corpora, analisis y outputs.
- `analyst`: opera Studio, crea estudios, ingiere corpus, corre analisis y publica
  outputs.
- `client_admin`: accede a Signal para su organizacion, puede revisar/comentar
  cuando exista la capa de review cliente.
- `client_viewer`: accede a Signal en modo lectura.

## Experiencia Objetivo

### 1. Access Gateway

Reemplazar la landing actual por una puerta de entrada simple:

- Logo Noisia
- Mensaje corto segun destino: Studio o Signal
- Un solo CTA: `Entrar`
- Quitar `Crear cuenta` en produccion
- Si ya hay sesion, redirigir al workspace activo

### 2. Workspace Switcher

Despues de login:

- Si el usuario tiene una organizacion: entrar directo.
- Si tiene varias organizaciones: mostrar selector dentro de Noisia.
- Permitir cambiar organizacion sin cerrar sesion.
- Persistir workspace activo en DB o cookie segura.

### 3. Profile Menu

Agregar menu persistente:

- Mi perfil
- Rol actual
- Organizacion activa
- Cambiar workspace
- Salir

### 4. Admin de Accesos

Nueva seccion interna para `noisia_admin`:

- Organizaciones
- Usuarios
- Invitaciones
- Roles
- Acceso por marca
- Acceso por output publicado

## Modelo de Datos Propuesto

Agregar en futura migracion:

- `user_organization_memberships`
  - `user_id`
  - `organization_id`
  - `role`
  - `status`
  - `source` (`kinde`, `manual`, `invitation`)

- `invitations`
  - `email`
  - `organization_id`
  - `role`
  - `brand_ids`
  - `output_ids`
  - `status`
  - `expires_at`
  - `invited_by_user_id`

- `audit_log`
  - `actor_user_id`
  - `action`
  - `entity_type`
  - `entity_id`
  - `metadata`

## How To Actual Mientras No Existe El Feature

1. Crear organizacion en Noisia Studio.
2. Crear marca(s) dentro de esa organizacion.
3. Crear organizacion equivalente en Kinde.
4. Invitar usuarios en Kinde.
5. Asignar rol canonico en Kinde:
   - `noisia_admin`
   - `analyst`
   - `client_admin`
   - `client_viewer`
6. Confirmar que el nombre/slug de la organizacion Kinde matchee con la organizacion
   en Noisia.
7. Si no matchea, usar `NOISIA_KINDE_ORG_MAP` con formato:
   `org_code:organization_slug`

## Criterios de Aceptacion

- Un usuario no necesita cerrar sesion para cambiar de organizacion.
- Un cliente nunca ve Studio.
- Un usuario interno puede operar multiples organizaciones desde Studio.
- Un `client_viewer` solo ve outputs publicados autorizados.
- Un `client_admin` puede tener acciones de review/comentario sin tocar corpus crudo.
- Kinde no es necesario para administrar permisos finos dentro de Noisia.

