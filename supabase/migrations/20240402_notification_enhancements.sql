-- Asegurarse de que la tabla de notificaciones existe
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  related_id UUID,
  related_table TEXT
);

-- Agregar nuevas columnas si no existen
DO $$
BEGIN
  -- Agregar columna de prioridad
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'notifications' AND column_name = 'priority') THEN
    ALTER TABLE notifications ADD COLUMN priority TEXT DEFAULT 'medium';
  END IF;

  -- Agregar columna de URL de acción
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'notifications' AND column_name = 'action_url') THEN
    ALTER TABLE notifications ADD COLUMN action_url TEXT;
  END IF;

  -- Agregar columna de datos adicionales (JSON)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'notifications' AND column_name = 'additional_data') THEN
    ALTER TABLE notifications ADD COLUMN additional_data JSONB;
  END IF;
END $$;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Crear función para limpiar notificaciones antiguas (más de 30 días)
CREATE OR REPLACE FUNCTION clean_old_notifications() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM notifications 
  WHERE created_at < NOW() - INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para limpiar notificaciones antiguas
DROP TRIGGER IF EXISTS trigger_clean_old_notifications ON notifications;
CREATE TRIGGER trigger_clean_old_notifications
AFTER INSERT ON notifications
EXECUTE PROCEDURE clean_old_notifications();

-- Crear función para notificar automáticamente cuando el stock es bajo
CREATE OR REPLACE FUNCTION notify_low_stock() RETURNS TRIGGER AS $$
DECLARE
  product_name TEXT;
  size_name TEXT;
BEGIN
  -- Solo notificar si el stock es bajo (menos de 5)
  IF NEW.stock < 5 THEN
    -- Obtener nombre del producto
    SELECT name INTO product_name FROM products WHERE id = NEW.product_id;
    
    -- Obtener nombre de la talla
    SELECT name INTO size_name FROM sizes WHERE id = NEW.size_id;
    
    -- Insertar notificación
    INSERT INTO notifications (
      title, 
      message, 
      type, 
      related_id, 
      related_table,
      priority,
      action_url
    ) VALUES (
      'Stock bajo',
      'El producto ' || product_name || ' (talla ' || size_name || ') tiene solo ' || NEW.stock || ' unidades disponibles.',
      'stock_low',
      NEW.product_id,
      'products',
      'high',
      '/inventory?product=' || NEW.product_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para notificar stock bajo
DROP TRIGGER IF EXISTS trigger_notify_low_stock ON inventory;
CREATE TRIGGER trigger_notify_low_stock
AFTER UPDATE OF stock ON inventory
FOR EACH ROW
EXECUTE PROCEDURE notify_low_stock();

-- Crear función para notificar ventas importantes
CREATE OR REPLACE FUNCTION notify_important_sale() RETURNS TRIGGER AS $$
DECLARE
  customer_name TEXT;
BEGIN
  -- Solo notificar si el monto es importante (más de 5000)
  IF NEW.total_amount > 5000 THEN
    -- Obtener nombre del cliente
    SELECT name INTO customer_name FROM customers WHERE id = NEW.customer_id;
    
    -- Si no hay cliente, usar un nombre genérico
    IF customer_name IS NULL THEN
      customer_name := 'Cliente sin nombre';
    END IF;
    
    -- Insertar notificación
    INSERT INTO notifications (
      title, 
      message, 
      type, 
      related_id, 
      related_table,
      priority,
      action_url
    ) VALUES (
      'Venta importante',
      'Se ha realizado una venta por $' || NEW.total_amount || ' a ' || customer_name || ' (Factura: ' || NEW.invoice_number || ').',
      'important_sale',
      NEW.id,
      'sales',
      'medium',
      '/sales/' || NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para notificar ventas importantes
DROP TRIGGER IF EXISTS trigger_notify_important_sale ON sales;
CREATE TRIGGER trigger_notify_important_sale
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE PROCEDURE notify_important_sale();

-- Crear función para notificar pedidos retrasados
CREATE OR REPLACE FUNCTION notify_delayed_orders() RETURNS TRIGGER AS $$
BEGIN
  -- Solo notificar si el pedido está pendiente y la fecha de llegada ya pasó
  IF NEW.status = 'pending' AND NEW.arrival_date < CURRENT_DATE THEN
    -- Insertar notificación
    INSERT INTO notifications (
      title, 
      message, 
      type, 
      related_id, 
      related_table,
      priority,
      action_url
    ) VALUES (
      'Pedido retrasado',
      'El pedido ' || COALESCE(NEW.reference, NEW.id::text) || ' está retrasado. Fecha estimada de llegada: ' || 
      to_char(NEW.arrival_date, 'DD/MM/YYYY') || '.',
      'order_update',
      NEW.id,
      'orders',
      'high',
      '/orders/' || NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para notificar pedidos retrasados
DROP TRIGGER IF EXISTS trigger_notify_delayed_orders ON orders;
CREATE TRIGGER trigger_notify_delayed_orders
AFTER UPDATE OF status, arrival_date ON orders
FOR EACH ROW
EXECUTE PROCEDURE notify_delayed_orders();
