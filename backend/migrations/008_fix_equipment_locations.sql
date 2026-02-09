-- Fix equipment with 'add' as location
-- This updates any equipment that has 'add' as current_location to NULL

UPDATE inventory_equipment 
SET current_location = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE current_location = 'add';

-- Also fix any weird location values
UPDATE inventory_equipment 
SET current_location = CASE 
    WHEN current_unit IS NOT NULL THEN 'Estoque TI - ' || current_unit
    ELSE 'Estoque TI'
END,
    updated_at = CURRENT_TIMESTAMP
WHERE current_status = 'in_stock' 
  AND (current_location IS NULL OR current_location = 'add' OR LENGTH(current_location) < 5);

-- Fix equipment in_use without proper location
UPDATE inventory_equipment 
SET current_location = CASE 
    WHEN current_responsible_name IS NOT NULL AND current_unit IS NOT NULL 
        THEN current_unit
    WHEN current_unit IS NOT NULL 
        THEN current_unit
    ELSE 'Localização não informada'
END,
    updated_at = CURRENT_TIMESTAMP
WHERE current_status = 'in_use' 
  AND (current_location IS NULL OR current_location = 'add');

SELECT 'Fixed equipment locations' AS message;
