CREATE OR REPLACE FUNCTION get_top_selling_products(limit_count INTEGER)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  category TEXT,
  quantity INTEGER,
  total_sales NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    p.category,
    SUM(si.quantity)::INTEGER as quantity,
    SUM(si.subtotal) as total_sales
  FROM 
    sale_items si
    JOIN products p ON si.product_id = p.id
  GROUP BY 
    p.id, p.name, p.category
  ORDER BY 
    quantity DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
