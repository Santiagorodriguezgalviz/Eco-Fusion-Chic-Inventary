CREATE OR REPLACE FUNCTION get_customer_metrics()
RETURNS TABLE (
  new_customers INTEGER,
  returning_customers INTEGER,
  average_ticket NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH customer_stats AS (
    SELECT
      c.id,
      COUNT(s.id) as purchase_count,
      CASE WHEN COUNT(s.id) = 1 THEN 1 ELSE 0 END as is_new,
      CASE WHEN COUNT(s.id) > 1 THEN 1 ELSE 0 END as is_returning
    FROM
      customers c
      LEFT JOIN sales s ON c.id = s.customer_id
    GROUP BY
      c.id
  ),
  sales_stats AS (
    SELECT
      AVG(total_amount) as avg_ticket
    FROM
      sales
  )
  SELECT
    SUM(is_new)::INTEGER as new_customers,
    SUM(is_returning)::INTEGER as returning_customers,
    (SELECT avg_ticket FROM sales_stats) as average_ticket
  FROM
    customer_stats;
END;
$$ LANGUAGE plpgsql;
