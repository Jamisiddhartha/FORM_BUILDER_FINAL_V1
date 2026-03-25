-- Check what service_ids exist in m_service
SELECT id, service_id, service_name FROM m_service WHERE service_id IN ('577.1', '3997');

-- Check what service details exist
SELECT * FROM m_service_details;
