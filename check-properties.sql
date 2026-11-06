-- Check available properties by city
SELECT city, COUNT(*) as count
FROM properties
WHERE available = true
GROUP BY city
ORDER BY count DESC;

-- Check total properties (including unavailable)
SELECT 
  COUNT(*) as total_properties,
  COUNT(*) FILTER (WHERE available = true) as available_properties,
  COUNT(*) FILTER (WHERE available = false) as unavailable_properties
FROM properties;

-- Check properties by city and type
SELECT 
  city, 
  property_type, 
  COUNT(*) as count
FROM properties
WHERE available = true
GROUP BY city, property_type
ORDER BY city, count DESC;

-- Check most recent properties
SELECT 
  title,
  city,
  suburb,
  property_type,
  price,
  bedrooms,
  available,
  created_at
FROM properties
ORDER BY created_at DESC
LIMIT 10;

-- Check for any Harare properties specifically
SELECT 
  id,
  title,
  city,
  suburb,
  price,
  bedrooms,
  available
FROM properties
WHERE city ILIKE '%harare%'
ORDER BY created_at DESC;
