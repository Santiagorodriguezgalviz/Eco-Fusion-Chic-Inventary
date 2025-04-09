-- Crear tabla para el historial de cambios de inventario
CREATE TABLE IF NOT EXISTS public.inventory_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES public.inventory(id),
    product_id UUID NOT NULL REFERENCES public.products(id),
    size_id UUID NOT NULL REFERENCES public.sizes(id),
    previous_stock INT,
    new_stock INT NOT NULL,
    change_amount INT NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('ajuste', 'venta', 'compra', 'devolución', 'inicial')),
    reference_id UUID,
    reference_type TEXT CHECK (reference_type IN ('sale', 'order', 'adjustment')),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_inventory_history_inventory_id ON public.inventory_history(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_product_id ON public.inventory_history(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_created_at ON public.inventory_history(created_at);

-- Configurar permisos RLS
ALTER TABLE public.inventory_history ENABLE ROW LEVEL SECURITY;

-- Política para permitir a todos los usuarios autenticados ver el historial
CREATE POLICY "Usuarios autenticados pueden ver el historial de inventario" 
ON public.inventory_history FOR SELECT 
TO authenticated 
USING (true);

-- Política para permitir a todos los usuarios autenticados insertar en el historial
CREATE POLICY "Usuarios autenticados pueden insertar en el historial de inventario" 
ON public.inventory_history FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Crear función para registrar cambios en el inventario
CREATE OR REPLACE FUNCTION log_inventory_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.inventory_history (
        inventory_id,
        product_id,
        size_id,
        previous_stock,
        new_stock,
        change_amount,
        change_type,
        notes
    )
    VALUES (
        NEW.id,
        NEW.product_id,
        NEW.size_id,
        OLD.stock,
        NEW.stock,
        NEW.stock - COALESCE(OLD.stock, 0),
        CASE 
            WHEN OLD.stock IS NULL THEN 'inicial'
            ELSE 'ajuste'
        END,
        'Cambio automático de stock'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para registrar cambios en el inventario
DROP TRIGGER IF EXISTS trigger_log_inventory_change ON public.inventory;
CREATE TRIGGER trigger_log_inventory_change
AFTER INSERT OR UPDATE OF stock ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION log_inventory_change();

-- Crear función para registrar cambios por ventas
CREATE OR REPLACE FUNCTION log_inventory_change_from_sale()
RETURNS TRIGGER AS $$
DECLARE
    inv_id UUID;
BEGIN
    -- Encontrar el registro de inventario correspondiente
    SELECT id INTO inv_id FROM public.inventory 
    WHERE product_id = NEW.product_id AND size_id = NEW.size_id;
    
    -- Si existe, registrar el cambio
    IF inv_id IS NOT NULL THEN
        INSERT INTO public.inventory_history (
            inventory_id,
            product_id,
            size_id,
            previous_stock,
            new_stock,
            change_amount,
            change_type,
            reference_id,
            reference_type,
            notes
        )
        SELECT 
            inv_id,
            NEW.product_id,
            NEW.size_id,
            i.stock + NEW.quantity, -- Stock anterior
            i.stock, -- Stock actual
            -NEW.quantity, -- Cantidad del cambio (negativo para ventas)
            'venta',
            NEW.sale_id,
            'sale',
            'Venta de producto'
        FROM 
            public.inventory i
        WHERE 
            i.id = inv_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para registrar cambios por ventas
DROP TRIGGER IF EXISTS trigger_log_inventory_change_from_sale ON public.sale_items;
CREATE TRIGGER trigger_log_inventory_change_from_sale
AFTER INSERT ON public.sale_items
FOR EACH ROW
EXECUTE FUNCTION log_inventory_change_from_sale();

-- Crear función para registrar cambios por compras
CREATE OR REPLACE FUNCTION log_inventory_change_from_order()
RETURNS TRIGGER AS $$
DECLARE
    inv_id UUID;
BEGIN
    -- Encontrar el registro de inventario correspondiente
    SELECT id INTO inv_id FROM public.inventory 
    WHERE product_id = NEW.product_id AND size_id = NEW.size_id;
    
    -- Si existe, registrar el cambio
    IF inv_id IS NOT NULL THEN
        INSERT INTO public.inventory_history (
            inventory_id,
            product_id,
            size_id,
            previous_stock,
            new_stock,
            change_amount,
            change_type,
            reference_id,
            reference_type,
            notes
        )
        SELECT 
            inv_id,
            NEW.product_id,
            NEW.size_id,
            i.stock - NEW.quantity, -- Stock anterior
            i.stock, -- Stock actual
            NEW.quantity, -- Cantidad del cambio (positivo para compras)
            'compra',
            NEW.order_id,
            'order',
            'Compra de producto'
        FROM 
            public.inventory i
        WHERE 
            i.id = inv_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para registrar cambios por compras
DROP TRIGGER IF EXISTS trigger_log_inventory_change_from_order ON public.order_items;
CREATE TRIGGER trigger_log_inventory_change_from_order
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION log_inventory_change_from_order();
