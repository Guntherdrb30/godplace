export const DB_MISSING_MESSAGE =
  "Base de datos no configurada. Define DATABASE_URL en .env (local) o como variable de entorno (Vercel).";

export function dbDisponible(): boolean {
  return !!process.env.DATABASE_URL;
}
