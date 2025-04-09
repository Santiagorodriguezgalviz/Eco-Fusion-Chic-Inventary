-- Verificar si la tabla notifications existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        -- Crear la tabla notifications si no existe
        CREATE TABLE public.notifications (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT NOT NULL,
            related_entity_type TEXT,
            related_entity_id TEXT,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            user_id UUID,
            priority TEXT DEFAULT 'medium',
            action_url TEXT
        );

        -- Añadir comentario a la tabla
        COMMENT ON TABLE public.notifications IS 'Tabla para almacenar notificaciones del sistema';
    ELSE
        -- Si la tabla ya existe, verificar y añadir columnas que puedan faltar
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'priority') THEN
            ALTER TABLE public.notifications ADD COLUMN priority TEXT DEFAULT 'medium';
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'action_url') THEN
            ALTER TABLE public.notifications ADD COLUMN action_url TEXT;
        END IF;
    END IF;
END
$$;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Añadir algunas notificaciones de prueba para verificar que todo funciona
INSERT INTO public.notifications (title, message, type, is_read, priority)
VALUES 
('Prueba de notificación', 'Esta es una notificación de prueba para verificar que el sistema funciona correctamente', 'system', false, 'medium'),
('Stock bajo', 'El producto "Camiseta básica" tiene stock bajo', 'stock_low', false, 'high'),
('Venta importante', 'Se ha registrado una venta importante por $150,000', 'important_sale', false, 'high'),
('Pedido retrasado', 'El pedido #1234 lleva 5 días de retraso', 'order_delayed', false, 'medium');

-- Configurar permisos RLS para la tabla de notificaciones
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Política para permitir a todos los usuarios autenticados ver todas las notificaciones
CREATE POLICY "Usuarios autenticados pueden ver todas las notificaciones" 
ON public.notifications FOR SELECT 
TO authenticated 
USING (true);

-- Política para permitir a todos los usuarios autenticados insertar notificaciones
CREATE POLICY "Usuarios autenticados pueden insertar notificaciones" 
ON public.notifications FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Política para permitir a todos los usuarios autenticados actualizar sus propias notificaciones
CREATE POLICY "Usuarios autenticados pueden actualizar notificaciones" 
ON public.notifications FOR UPDATE 
TO authenticated 
USING (true);

-- Política para permitir a todos los usuarios autenticados eliminar notificaciones
CREATE POLICY "Usuarios autenticados pueden eliminar notificaciones" 
ON public.notifications FOR DELETE 
TO authenticated 
USING (true);
