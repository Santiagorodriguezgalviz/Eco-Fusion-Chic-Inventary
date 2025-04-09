CREATE OR REPLACE FUNCTION get_inventory_performance()
RETURNS TABLE (
  category TEXT,
  avg_stock NUMERIC,
  sales_quantity INTEGER,
  rotation_index NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH category_sales AS (
    SELECT 
      p.category,
      SUM(si.quantity) as total_quantity
    FROM 
      sale_items si
      JOIN products p ON si.product_id = p.id
    WHERE 
      si.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY 
      p.category
  ),
  category_stock AS (
    SELECT 
      p.category,
      AVG(i.stock) as avg_stock
    FROM 
      inventory i
      JOIN products p ON i.product_id = p.id
    GROUP BY 
      p.category
  )
  SELECT 
    cs.category,
    COALESCE(cst.avg_stock, 0) as avg_stock,
    COALESCE(cs.total_quantity, 0) as sales_quantity,
    CASE 
      WHEN COALESCE(cst.avg_stock, 0) > 0 THEN 
        COALESCE(cs.total_quantity, 0) / COALESCE(cst.avg_stock, 1)
      ELSE 0
    END as rotation_index
  FROM 
    category_sales cs
    LEFT JOIN category_stock cst ON cs.category = cst.category
  ORDER BY 
    rotation_index DESC;
END;
$$ LANGUAGE plpgsql;
