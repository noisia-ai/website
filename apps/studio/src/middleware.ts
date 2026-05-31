import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";

// Middleware de Kinde: refresca el access/id token de forma proactiva en cada
// navegación a una zona protegida. Sin esto, la sesión se "cae" entre pantallas
// (el bug de re-login del super admin) porque el refresh sólo ocurría de forma
// perezosa y con carreras entre los server components.
//
// La AUTORIZACIÓN por rol la siguen resolviendo los guards de cada página contra
// nuestra DB (ver lib/auth/guards.ts). Aquí sólo garantizamos que haya sesión y,
// si no la hay, mandamos a nuestra pantalla /login (no a la hospedada por Kinde).
export default withAuth({
  loginPage: "/login",
  isReturnToCurrentPage: false
});

export const config = {
  matcher: [
    "/studio",
    "/studio/:path*",
    "/portal",
    "/portal/:path*",
    "/signal",
    "/signal/:path*"
  ]
};
