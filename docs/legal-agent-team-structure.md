# La Maison Homes — Legal Agent Team Structure

## Overview
Five specialised legal agents that handle the full legal lifecycle from intake through to register maintenance. Each agent has a narrow scope, clear outputs, and defined handoffs.

---

## Agent 1 — legal-intake

### Role
Receive and classify all legal requests.

### Responsibilities
- Log requests
- Classify matter type
- Assign risk level
- Identify deadlines
- Route to correct template family
- Determine approval path

### Input
- Raw legal request (email, form, verbal, system trigger)
- Business context
- Related documents

### Output
- Intake summary
- Risk rating (Low / Medium / High)
- Recommended next agent
- Suggested template family
- Approval path prediction

### Handoff
→ legal-drafting (for new documents)
→ website-compliance (for public-facing changes)
→ dispute-response (for active disputes)
→ legal-register (for register updates only)

---

## Agent 2 — legal-drafting

### Role
Draft and revise agreements, notices, and policies.

### Responsibilities
- Prepare first drafts (Draft 0.1)
- Insert approved clauses from clause library
- Align language with company style guide
- Prepare redline summaries for revisions
- Maintain clean template logic
- Flag unresolved commercial points

### Input
- Intake summary from legal-intake
- Template family or precedent document
- Clause library access
- Business requirements

### Output
- Draft document (versioned)
- Change summary (what changed, why)
- Unresolved points list (needs business decision)
- Assumptions log

### Handoff
→ legal-intake (if commercial questions need clarification)
→ website-compliance (if public-facing)
→ legal-register (on execution)

---

## Agent 3 — website-compliance

### Role
Review website content, booking flow, and public legal pages.

### Responsibilities
- Review terms pages for accuracy and enforceability
- Review privacy wording against data practices
- Review checkout assent flow (checkbox, timing, visibility)
- Review cancellation/refund wording against actual policy
- Check for misleading claims under consumer law
- Map public claims against actual operational capability
- Flag overpromises or unsupported guarantees

### Input
- Website page content (Terms, Privacy, Booking, FAQ, etc.)
- Operational SOPs and actual practices
- Booking flow screenshots or descriptions
- Marketing claims inventory

### Output
- Compliance review report
- Issue list (severity ranked)
- Revised wording suggestions
- Risk flags (consumer law, privacy, payment)
- Gap analysis (claim vs. reality)

### Handoff
→ legal-drafting (for revised legal wording)
→ legal-intake (if new compliance matter arises)
→ legal-register (for published version tracking)

---

## Agent 4 — dispute-response

### Role
Handle complaints, notices, breaches, payment disputes, and escalation drafts.

### Responsibilities
- Prepare response letters and notices
- Preserve evidence logic and chain of custody
- Identify contractual basis for position
- Structure breach and demand notices
- Propose escalation path and settlement range
- Maintain dispute register entries

### Input
- Complaint or dispute details
- Relevant agreement terms
- Evidence (photos, messages, payment records)
- Guest/owner history

### Output
- Issue summary (facts, timeline, parties)
- Recommended position (accept, reject, negotiate, escalate)
- Draft response (letter, email, notice)
- Escalation level (Low / Medium / High / Critical)
- Evidence preservation log

### Handoff
→ legal-intake (if new legal matter arises)
→ legal-register (for dispute tracking)
→ legal-drafting (if formal legal document needed)

---

## Agent 5 — legal-register

### Role
Maintain registers, versions, reminders, and control records.

### Responsibilities
- Record document metadata in legal register
- Track status and version history
- Log approvals and reviewers
- Track expiry and renewal dates
- Manage review cycles (monthly/quarterly/annual)
- Identify missing documents from master index
- Generate compliance status reports

### Input
- Executed documents
- Draft status updates
- Review cycle triggers
- Dispute outcomes
- Template changes

### Output
- Updated register entry (with all 30 fields)
- Review reminders (calendar entries)
- Missing document alerts
- Version history log
- Compliance status dashboard

### Handoff
→ legal-intake (if missing documents trigger new requests)
→ legal-drafting (if template updates needed)
→ website-compliance (if public document versions change)

---

## Cross-Agent Coordination

### Shared Resources
- Legal Document Register (Supabase table)
- Clause Library (shared markdown files)
- Template Library (version-controlled documents)
- Risk Register (shared tracking)
- Sync Hub (`/lamaison-sync/`)

### Communication Protocol
1. All handoffs logged in SYNC_LOG.md
2. Agent state tracked in AGENT_STATE.json
3. Document versions use shared numbering (Draft 0.1 → 1.0)
4. Approval matrix respected across all agents
5. Escalation to Director for High-risk matters

### Conflict Resolution
- If agents disagree on risk level: escalate to Director
- If commercial point unresolved: legal-intake re-opens with business
- If compliance vs. marketing conflict: website-compliance wins, marketing adjusts

---

## Document Control

| Element | Detail |
|---------|--------|
| Owner | Legal Adviser (human oversight) |
| Review cycle | Quarterly |
| Last reviewed | [Date] |
| Approved by | [Name] |
| Version | 1.0 |

---

## Related Documents
- Legal Adviser Agent Identity
- Legal Adviser Agent Soul
- Legal Adviser Workflow
- Legal Document Register Schema
- Website Compliance Checklist
- Legal System Master Index
