# La Maison Homes — Legal Document Register Schema

## Purpose
A single source of truth for all legal, quasi-legal, and policy documents. Use as a spreadsheet, Supabase table, or internal document register.

---

## Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| document_id | text | Unique internal ID (e.g., LM-LEGAL-2024-001) |
| document_name | text | Name of document |
| category | text | Website / guest / owner / supplier / HR / dispute / policy |
| subcategory | text | More specific classification |
| status | text | Draft / Under Review / Approved / Executed / Archived |
| version | text | e.g. 0.1, 1.0, 1.1 |
| public_facing | boolean | Yes/No |
| related_entity | text | La Maison Homes / counterparty |
| counterparty_name | text | Other party name if applicable |
| related_property | text | Property or booking reference |
| related_page_or_system | text | Website page / checkout / CRM / Hostaway / etc |
| owner_department | text | Legal / Ops / Web / HR / Finance |
| document_owner | text | Responsible internal owner |
| reviewer | text | Reviewer |
| approver | text | Final approver |
| effective_date | date | Start date |
| expiry_date | date | End date if applicable |
| renewal_date | date | Renewal reminder |
| termination_notice_period | text | e.g. 30 days |
| governing_law | text | Usually Victoria / Australia |
| risk_level | text | Low / Medium / High |
| privacy_sensitive | boolean | Yes/No |
| payment_sensitive | boolean | Yes/No |
| dispute_related | boolean | Yes/No |
| template_source | text | Master template used |
| storage_link | text | File path / URL / repository location |
| execution_link | text | Signed copy link |
| notes | text | Comments / flags |
| last_reviewed_at | datetime | Last review |
| next_review_due | date | Next review date |
| created_at | datetime | Record creation |
| updated_at | datetime | Last updated |

---

## Category Values

| Category | Examples |
|----------|----------|
| Website | Terms of Use, Privacy Policy, Cookie Policy, FAQ |
| Guest | Booking Terms, Cancellation Policy, House Rules, Guest Communications |
| Owner | Property Management Agreement, Owner Onboarding Pack, Owner Handbook |
| Supplier | Supplier Agreement, Vendor Terms, Service Level Agreement |
| HR | Employment Agreement, Contractor Agreement, NDA, Staff Handbook |
| Dispute | Complaint Response, Breach Notice, Termination Notice, Letter of Demand |
| Policy | Internal Policy, SOP, Approval Matrix, Risk Register |

---

## Status Workflow

```
Draft → Under Review → Approved → Executed → Archived
   ↑         ↓            ↓
   └────  Revisions  ─────┘
```

---

## Supabase Table SQL

```sql
CREATE TABLE legal_document_register (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id TEXT NOT NULL UNIQUE,
    document_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Website', 'Guest', 'Owner', 'Supplier', 'HR', 'Dispute', 'Policy')),
    subcategory TEXT,
    status TEXT NOT NULL CHECK (status IN ('Draft', 'Under Review', 'Approved', 'Executed', 'Archived')),
    version TEXT NOT NULL DEFAULT '0.1',
    public_facing BOOLEAN NOT NULL DEFAULT FALSE,
    related_entity TEXT,
    counterparty_name TEXT,
    related_property TEXT,
    related_page_or_system TEXT,
    owner_department TEXT,
    document_owner TEXT,
    reviewer TEXT,
    approver TEXT,
    effective_date DATE,
    expiry_date DATE,
    renewal_date DATE,
    termination_notice_period TEXT,
    governing_law TEXT DEFAULT 'Victoria, Australia',
    risk_level TEXT CHECK (risk_level IN ('Low', 'Medium', 'High')),
    privacy_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
    payment_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
    dispute_related BOOLEAN NOT NULL DEFAULT FALSE,
    template_source TEXT,
    storage_link TEXT,
    execution_link TEXT,
    notes TEXT,
    last_reviewed_at TIMESTAMPTZ,
    next_review_due DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_legal_docs_category ON legal_document_register(category);
CREATE INDEX idx_legal_docs_status ON legal_document_register(status);
CREATE INDEX idx_legal_docs_risk ON legal_document_register(risk_level);
CREATE INDEX idx_legal_docs_review_due ON legal_document_register(next_review_due);
CREATE INDEX idx_legal_docs_public ON legal_document_register(public_facing);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_legal_docs_updated_at
    BEFORE UPDATE ON legal_document_register
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## JSON Schema (for API validation)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "LegalDocumentRegister",
  "type": "object",
  "required": ["document_id", "document_name", "category", "status", "version"],
  "properties": {
    "document_id": { "type": "string", "pattern": "^LM-LEGAL-[0-9]{4}-[0-9]{3}$" },
    "document_name": { "type": "string", "minLength": 1 },
    "category": { "type": "string", "enum": ["Website", "Guest", "Owner", "Supplier", "HR", "Dispute", "Policy"] },
    "subcategory": { "type": "string" },
    "status": { "type": "string", "enum": ["Draft", "Under Review", "Approved", "Executed", "Archived"] },
    "version": { "type": "string", "pattern": "^[0-9]+\\.[0-9]+$" },
    "public_facing": { "type": "boolean", "default": false },
    "related_entity": { "type": "string" },
    "counterparty_name": { "type": "string" },
    "related_property": { "type": "string" },
    "related_page_or_system": { "type": "string" },
    "owner_department": { "type": "string" },
    "document_owner": { "type": "string" },
    "reviewer": { "type": "string" },
    "approver": { "type": "string" },
    "effective_date": { "type": "string", "format": "date" },
    "expiry_date": { "type": "string", "format": "date" },
    "renewal_date": { "type": "string", "format": "date" },
    "termination_notice_period": { "type": "string" },
    "governing_law": { "type": "string", "default": "Victoria, Australia" },
    "risk_level": { "type": "string", "enum": ["Low", "Medium", "High"] },
    "privacy_sensitive": { "type": "boolean", "default": false },
    "payment_sensitive": { "type": "boolean", "default": false },
    "dispute_related": { "type": "boolean", "default": false },
    "template_source": { "type": "string" },
    "storage_link": { "type": "string", "format": "uri" },
    "execution_link": { "type": "string", "format": "uri" },
    "notes": { "type": "string" },
    "last_reviewed_at": { "type": "string", "format": "date-time" },
    "next_review_due": { "type": "string", "format": "date" },
    "created_at": { "type": "string", "format": "date-time" },
    "updated_at": { "type": "string", "format": "date-time" }
  }
}
```

---

## Document Control

| Element | Detail |
|---------|--------|
| Owner | Legal Adviser |
| Review cycle | Quarterly |
| Last reviewed | [Date] |
| Approved by | [Name] |
| Version | 1.0 |

---

## Related Documents
- Legal Adviser Agent Identity
- Legal Adviser Agent Soul
- Legal Adviser Workflow
- Template Library Index
- Clause Library
- Risk Register
