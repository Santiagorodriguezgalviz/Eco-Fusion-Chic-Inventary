-- Desactivar temporalmente RLS para la tabla de notificaciones
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para evitar duplicados
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver todas las notificaciones" ON public.notifications;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar notificaciones" ON public.notifications;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar notificaciones" ON public.notifications;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar notificaciones" ON public.notifications;

-- Crear nuevas políticas más permisivas
CREATE POLICY "Permitir acceso completo a notificaciones" 
ON public.notifications
USING (true) 
WITH CHECK (true);

-- Volver a activar RLS con la nueva política
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Asegurarse de que el rol anónimo tenga permisos para la tabla
GRANT ALL ON public.notifications TO anon;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
