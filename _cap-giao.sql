UPDATE "Role"
SET capabilities = array_append(capabilities, 'orders.confirm')
WHERE id IN ('vai-tro-quan-tri', 'vai-tro-ky-thuat')
  AND NOT ('orders.confirm' = ANY(capabilities));
