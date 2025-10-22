-- Convert existing leads marked as "converted" to clients
-- Run this with: heroku pg:psql --app marketingby-wetechforu < convert-leads.sql

DO $$
DECLARE
    lead_record RECORD;
    new_client_id INTEGER;
BEGIN
    -- Loop through all converted leads without client_id
    FOR lead_record IN 
        SELECT id, company, email, phone, website_url, address, city, state, zip_code,
               contact_first_name, contact_last_name
        FROM leads 
        WHERE status = 'converted' AND converted_to_client_id IS NULL
    LOOP
        RAISE NOTICE '🔄 Converting Lead %: %', lead_record.id, lead_record.company;
        
        -- Create client from lead
        INSERT INTO clients (
            client_name, email, phone, contact_name,
            practice_address, practice_city, practice_state, practice_zip,
            is_active, created_at
        ) VALUES (
            COALESCE(lead_record.company, 'New Client'),
            lead_record.email,
            lead_record.phone,
            NULLIF(TRIM(CONCAT(COALESCE(lead_record.contact_first_name, ''), ' ', COALESCE(lead_record.contact_last_name, ''))), ''),
            lead_record.address,
            lead_record.city,
            lead_record.state,
            lead_record.zip_code,
            true,
            NOW()
        ) RETURNING id INTO new_client_id;
        
        RAISE NOTICE '   ✅ Created Client ID: %', new_client_id;
        
        -- Update lead with client_id
        UPDATE leads 
        SET converted_to_client_id = new_client_id 
        WHERE id = lead_record.id;
        
        RAISE NOTICE '   ✅ Linked Lead % → Client %', lead_record.id, new_client_id;
        
        -- Log activity
        INSERT INTO lead_activity (lead_id, activity_type, activity_data, created_at)
        VALUES (
            lead_record.id, 
            'converted_to_client', 
            json_build_object(
                'client_id', new_client_id,
                'client_name', COALESCE(lead_record.company, 'New Client'),
                'converted_by', 'system',
                'automated', true
            ),
            NOW()
        );
        
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Conversion complete!';
END $$;

-- Show results
SELECT 
    l.id as lead_id,
    l.company as lead_company,
    l.status,
    l.converted_to_client_id,
    c.client_name,
    c.is_active as client_active
FROM leads l
LEFT JOIN clients c ON l.converted_to_client_id = c.id
WHERE l.status = 'converted'
ORDER BY l.id;

