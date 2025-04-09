CREATE OR REPLACE FUNCTION get_sales_by_category()
RETURNS TABLE (
  category TEXT,
  total_amount NUMERIC,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH total AS (
    SELECT SUM(s.total_amount) as grand_total
    FROM sales s
  )
  SELECT 
    p.category,
    SUM(si.subtotal) as total_amount,
    (SUM(si.subtotal) / (SELECT grand_total FROM total)) * 100 as percentage
  FROM 
    sale_items si
    JOIN products p ON si.product_id = p.id
  GROUP BY 
    p.category
  ORDER BY 
    total_amount DESC;
END;
$$ LANGUAGE plpgsql;
