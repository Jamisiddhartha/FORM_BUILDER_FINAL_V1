-- Check if service with service_id 577.1 exists
SELECT id, service_id, service_name, service_level FROM m_service WHERE service_id = '577.1';

-- Check if service details exist
SELECT 
  sd.*,
  s.service_id,
  s.service_name
FROM m_service_details sd
JOIN m_service s ON sd.m_service_id = s.id
WHERE s.service_id = '577.1';
