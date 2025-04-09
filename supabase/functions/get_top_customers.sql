CREATE OR REPLACE FUNCTION get_top_customers(limit_count INTEGER)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  purchase_count INTEGER,
  total_spent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as customer_id,
    c.name as customer_name,
    COUNT(s.id)::INTEGER as purchase_count,
    SUM(s.total_amount) as total_spent
  FROM 
    customers c
    JOIN sales s ON c.id = s.customer_id
  GROUP BY 
    c.id, c.name
  ORDER BY 
    total_spent DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
