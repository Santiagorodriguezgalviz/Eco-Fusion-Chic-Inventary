-- Verificar y añadir columnas faltantes a la tabla de notificaciones
DO $$
BEGIN
    -- Verificar si la tabla existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        -- Añadir columna related_entity_type si no existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'notifications' 
                      AND column_name = 'related_entity_type') THEN
            ALTER TABLE public.notifications ADD COLUMN related_entity_type TEXT;
        END IF;

        -- Añadir columna related_entity_id si no existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'notifications' 
                      AND column_name = 'related_entity_id') THEN
            ALTER TABLE public.notifications ADD COLUMN related_entity_id UUID;
        END IF;

        -- Añadir columna priority si no existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'notifications' 
                      AND column_name = 'priority') THEN
            ALTER TABLE public.notifications ADD COLUMN priority TEXT DEFAULT 'medium';
        END IF;

        -- Añadir columna action_url si no existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'notifications' 
                      AND column_name = 'action_url') THEN
            ALTER TABLE public.notifications ADD COLUMN action_url TEXT;
        END IF;
    ELSE
        -- Crear la tabla si no existe
        CREATE TABLE public.notifications (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT NOT NULL,
            related_entity_type TEXT,
            related_entity_id UUID,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            user_id UUID,
            priority TEXT DEFAULT 'medium',
            action_url TEXT
        );
    END IF;
END $$;

-- Crear índices para mejorar el rendimiento si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_is_read') THEN
        CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_type') THEN
        CREATE INDEX idx_notifications_type ON public.notifications(type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_created_at') THEN
        CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);
    END IF;
END $$;

-- Configurar permisos RLS para la tabla de notificaciones
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para evitar duplicados
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver todas las notificaciones" ON public.notifications;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar notificaciones" ON public.notifications;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar notificaciones" ON public.notifications;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar notificaciones" ON public.notifications;

-- Crear nuevas políticas
CREATE POLICY "Usuarios autenticados pueden ver todas las notificaciones" 
ON public.notifications FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar notificaciones" 
ON public.notifications FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar notificaciones" 
ON public.notifications FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar notificaciones" 
ON public.notifications FOR DELETE 
TO authenticated 
USING (true);
