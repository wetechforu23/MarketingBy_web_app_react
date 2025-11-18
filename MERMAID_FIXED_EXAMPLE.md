# Fixed Mermaid Diagram - Call Forwarding

## ❌ Wrong (causes parse error):
```mermaid
graph TB
    Patient[👤 Patient]
    ClinicNum[📱 Clinic's Number<br/>+14698880705<br/>RingCentral]
    TwilioCall[☁️ Twilio Receiving Number<br/>+18176016812<br/>CAREpitome]
    PracticeDB[(🗄️ practices<br/>id: 123<br/>practice_name: "ABC Clinic")]
```

## ✅ Correct (fixed syntax):

```mermaid
graph TB
    Patient[👤 Patient]
    ClinicNum["📱 Clinic Number\n+14698880705\nRingCentral"]
    TwilioCall["☁️ Twilio Receiving\n+18176016812\nCAREpitome"]
    TwilioSMS["☁️ Twilio SMS\n+19722964778\nExisting"]
    
    ForwardingDB[("🗄️ call_forwarding_configs\nclinic_phone: +14698880705\ntext_number: +19722964778\ntwilio_receiving: +18176016812")]
    
    PracticeDB[("🗄️ practices\nid: 123\npractice_name: ABC Clinic")]
    
    Patient --> ClinicNum
    ClinicNum --> TwilioCall
    TwilioCall --> ForwardingDB
    ForwardingDB --> PracticeDB
    ClinicNum --> TwilioSMS
    TwilioSMS --> ForwardingDB
```

## 📝 Mermaid Syntax Rules:

1. **Line Breaks**: Use `\n` instead of `<br/>`
2. **Quotes**: Use double quotes `"..."` around labels with special characters
3. **Database Nodes**: Use `[("...")]` for database/cylinder shape
4. **Special Characters**: Escape or quote labels with colons, quotes, etc.
5. **No HTML**: Mermaid doesn't support HTML tags

## ✅ Alternative (Cleaner Version):

```mermaid
graph TB
    Patient[👤 Patient]
    ClinicNum["📱 Clinic Number<br/>+14698880705<br/>RingCentral"]
    TwilioCall["☁️ Twilio Receiving<br/>+18176016812<br/>CAREpitome"]
    TwilioSMS["☁️ Twilio SMS<br/>+19722964778<br/>Existing"]
    
    ForwardingDB[("🗄️ call_forwarding_configs<br/>clinic_phone: +14698880705<br/>text_number: +19722964778<br/>twilio_receiving: +18176016812")]
    
    PracticeDB[("🗄️ practices<br/>id: 123<br/>practice_name: ABC Clinic")]
    
    Patient --> ClinicNum
    ClinicNum --> TwilioCall
    TwilioCall --> ForwardingDB
    ForwardingDB --> PracticeDB
    ClinicNum --> TwilioSMS
    TwilioSMS --> ForwardingDB
```

**Note**: Actually, Mermaid doesn't support `<br/>` at all. You MUST use `\n` for line breaks.

## ✅ Final Working Version:

```mermaid
graph TB
    Patient[👤 Patient]
    ClinicNum["📱 Clinic Number\n+14698880705\nRingCentral"]
    TwilioCall["☁️ Twilio Receiving\n+18176016812\nCAREpitome"]
    TwilioSMS["☁️ Twilio SMS\n+19722964778\nExisting"]
    
    ForwardingDB[("🗄️ call_forwarding_configs\nclinic_phone: +14698880705\ntext_number: +19722964778\ntwilio_receiving: +18176016812")]
    
    PracticeDB[("🗄️ practices\nid: 123\npractice_name: ABC Clinic")]
    
    Patient --> ClinicNum
    ClinicNum --> TwilioCall
    TwilioCall --> ForwardingDB
    ForwardingDB --> PracticeDB
    ClinicNum --> TwilioSMS
    TwilioSMS --> ForwardingDB
```

