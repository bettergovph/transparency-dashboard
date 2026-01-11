COPY (
  SELECT 
    'P-' || COALESCE(reference_id, 'unknown') as id,
    COALESCE(notice_title, award_title) as title,
    award_title as purpose,
    'infrastructureProject' as type,
    award_title as description,
    ['construction'] as sector,
    [{'description': area_of_delivery}] as locations,
    [
        {
            'id': reference_id,
            'summary': {
                'tender': {
                    'title': notice_title,
                    'procuringEntity': {'name': organization_name}
                },
                'awards': [
                    {
                        'id': 'AW-' || COALESCE(reference_id, 'unknown'),
                        'status': 'active',
                        'date': award_date,
                        'value': {
                            'amount': contract_amount,
                            'currency': 'PHP'
                        },
                        'suppliers': [{'name': awardee_name}]
                    }
                ]
            }
        }
    ] as contractingProcesses
  FROM 'philgeps/philgeps.parquet'
  WHERE 
       business_category ILIKE '%Construction%' 
    OR business_category ILIKE '%Civil Works%' 
    OR business_category ILIKE '%Infrastructure%'
) TO 'philgeps/oc4ids.json' (FORMAT JSON, ARRAY TRUE);
