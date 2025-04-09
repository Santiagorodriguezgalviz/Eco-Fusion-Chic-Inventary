-- Desactivar completamente RLS para la tabla de notificaciones
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver todas las notificaciones" ON public.notifications;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar notificaciones" ON public.notifications;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar notificaciones" ON public.notifications;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar notificaciones" ON public.notifications;
DROP POLICY IF EXISTS "Permitir acceso completo a notificaciones" ON public.notifications;

-- Asegurarse de que todos los roles tienen permisos completos
GRANT ALL ON public.notifications TO anon;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- Asegurarse de que la secuencia de IDs también tiene permisos
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
