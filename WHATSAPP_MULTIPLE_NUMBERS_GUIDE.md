# WhatsApp Multiple Numbers Setup Guide

## Overview

You can now configure **multiple WhatsApp numbers** per widget to create **separate WhatsApp threads** for each user conversation. This eliminates the need for conversation ID prefixes when you have multiple numbers available.

## How It Works

1. **Single Number**: Uses the prefix system (`#282: message`) - all conversations go to one number
2. **Multiple Numbers**: Automatically assigns different numbers to different conversations - creates separate WhatsApp threads naturally

## Setup Instructions

### Option 1: Via Database (Recommended for Multiple Numbers)

```sql
-- Add multiple WhatsApp numbers to a widget
UPDATE widget_configs
SET whatsapp_number_pool = '[
  {
    "number": "+15558986359",
    "display_name": "Support Team 1",
    "is_active": true
  },
  {
    "number": "+15558986360",
    "display_name": "Support Team 2",
    "is_active": true
  },
  {
    "number": "+15558986361",
    "display_name": "Sales Team",
    "is_active": true
  }
]'::JSONB
WHERE id = 7; -- Your widget ID
```

### Option 2: Via UI (Coming Soon)

The widget editor will allow you to:
- Add multiple WhatsApp numbers
- Set display names for each
- Enable/disable numbers
- See usage statistics per number

## Benefits

✅ **Separate WhatsApp Threads**: Each user gets their own WhatsApp conversation thread  
✅ **No Prefixes Needed**: When using multiple numbers, agents don't need to use `#282:` format  
✅ **Load Balancing**: System automatically assigns least-used number  
✅ **Easy Identification**: Each number can have a display name (e.g., "Support Team 1")

## Requirements

1. **Multiple Twilio WhatsApp Numbers**: Each number must be:
   - Approved by WhatsApp/Twilio
   - Configured in your Twilio account
   - Added to the `whatsapp_number_pool` JSONB array

2. **Same Twilio Account**: All numbers should use the same Twilio Account SID and Auth Token (stored in `encrypted_credentials`)

## How Messages Are Assigned

When a user requests agent handover:

1. System checks if widget has `whatsapp_number_pool` configured
2. Filters to active numbers only
3. Finds the least-used active number (load balancing)
4. Assigns that number to the conversation
5. Stores `assigned_whatsapp_number` in `widget_conversations` table
6. All future messages for that conversation use the assigned number

## Fallback Behavior

- If `whatsapp_number_pool` is empty or has no active numbers → Uses `handover_whatsapp_number` (default)
- If `handover_whatsapp_number` is not set → Uses number from `encrypted_credentials`
- If no numbers available → Handover request fails with error

## Example JSON Structure

```json
[
  {
    "number": "+15558986359",
    "display_name": "Primary Support",
    "is_active": true,
    "notes": "Main support line"
  },
  {
    "number": "+15558986360",
    "display_name": "Sales Team",
    "is_active": true
  },
  {
    "number": "+15558986361",
    "display_name": "Emergency Line",
    "is_active": false,
    "notes": "Disabled temporarily"
  }
]
```

## Monitoring

Check which number is assigned to each conversation:

```sql
SELECT 
  wc.id as conversation_id,
  wc.visitor_name,
  wc.assigned_whatsapp_number,
  wc.status,
  wc.created_at
FROM widget_conversations wc
WHERE wc.widget_id = 7
  AND wc.assigned_whatsapp_number IS NOT NULL
ORDER BY wc.created_at DESC;
```

## Troubleshooting

### Numbers Not Assigning
- Check `whatsapp_number_pool` is valid JSON
- Verify `is_active: true` for numbers you want to use
- Ensure numbers are in E.164 format (e.g., `+15558986359`)

### Messages Going to Wrong Number
- Check `assigned_whatsapp_number` in `widget_conversations` table
- Verify Twilio webhook is configured correctly for all numbers
- Ensure all numbers are in the same Twilio account

### Want to Use Prefix System Instead
- Set `whatsapp_number_pool = '[]'::JSONB` or leave it NULL
- System will use `handover_whatsapp_number` and require prefixes

## Migration from Single Number

If you currently use one number with prefixes:

1. Keep your current setup working (no changes needed)
2. Add multiple numbers to `whatsapp_number_pool` when ready
3. System will automatically start assigning numbers
4. Old conversations continue using default number
5. New conversations get assigned from pool

## Cost Considerations

- Each WhatsApp number costs money (Twilio pricing)
- Numbers must be approved by WhatsApp (can take time)
- Recommended: Start with 2-3 numbers, add more as needed

