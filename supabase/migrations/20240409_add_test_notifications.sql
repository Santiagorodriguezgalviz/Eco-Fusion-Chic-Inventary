-- Insertar algunas notificaciones de prueba
INSERT INTO public.notifications (title, message, type, is_read, link)
VALUES 
('⚠️ Stock bajo', 'El producto "Camiseta básica" (talla M) tiene un stock bajo de 3 unidades.', 'stock_low', false, '/inventory/123'),
('💰 Venta importante', 'Se ha registrado una venta importante: Factura INV-2024-001 por $750.000.', 'important_sale', false, '/sales/456'),
('⏰ Pedido retrasado', 'El pedido REF-2024-001 lleva 5 días de retraso. Fecha esperada: 01/04/2024.', 'order_delayed', false, '/orders/789'),
('✅ Sistema actualizado', 'El sistema ha sido actualizado a la versión 2.0. Nuevas funcionalidades disponibles.', 'system', false, null);
