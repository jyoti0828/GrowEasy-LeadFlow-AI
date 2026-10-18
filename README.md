# GrowEasy LeadFlow AI

> Turn any CSV into CRM-ready leads with intelligent AI mapping.

## Overview

GrowEasy LeadFlow AI is a full-stack, AI-powered B2B SaaS application that intelligently converts unstructured CSV files into a strict, validated GrowEasy CRM format. The system solves the complex problem of mapping varied marketing and sales data exports (Facebook Ads, Google Ads, real-estate CRMs, arbitrary Excel sheets) without relying on rigid, hard-coded column mappings.

## Workflow

```
Upload → Preview → Confirm Import → AI Mapping → Validation → Results → GrowEasy CRM CSV Download
```

No AI processing occurs until the user explicitly clicks **Confirm Import**.

## Key Features

- **Local Browser Preview:** Parses CSV entirely in-browser using Papa Parse — no data sent to the server before confirmation.
- **Hybrid AI Extraction:** Combines deterministic header normalization/alias detection with Gemini semantic mapping.
- **Dynamic AI Batching & Retry:** Processes rows in concurrent batches with exponential backoff and jitter, respecting rate limits.
- **Strict Zod Validation:** Validates AI output against the exact CRM schema at runtime — prevents hallucinated values.
- **Safe Error Handling:** Gemini errors are mapped to safe user-facing messages. No stack traces, keys, or prompts leak to the client.
- **CSV Export:** Strict 15-field order, formula injection protection, UTF-8 output.
- **Duplicate Detection:** Flags possible duplicates by normalized email or mobile — does not silently remove records.
- **Data Quality Score:** Formula-based score (0–100) based on extraction success rate and field completeness.

## Supported CSV Sources

- Facebook Lead Ads exports
- Google Ads lead exports
- Real-estate CRM exports
- Excel-generated CSV files
- Sales reports
- Marketing agency CSV files
- Manually created spreadsheets
- CSV files with unusual or ambiguous headers

## Architecture

**Frontend** (Next.js / React):
- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui components
- Papa Parse (local CSV preview)
- Lucide React icons

**Backend** (Node.js / Express):
- Express 5 + TypeScript
- `@google/genai` v2 (Gemini AI SDK)
- Zod v4 (runtime validation)
- Multer (memory storage — no files written to disk)
- `libphonenumber-js` (international phone parsing)
- Pino (structured logging)
- Express Rate Limit

## Exact GrowEasy CRM Schema (15 Fields)

| Field | Type | Notes |
|---|---|---|
| `created_at` | string | ISO date or empty |
| `name` | string | Full lead name |
| `email` | string | First valid lead email |
| `country_code` | string | e.g. `+91`, `+1`, `+44` |
| `mobile_without_country_code` | string | Digits only |
| `company` | string | |
| `city` | string | |
| `state` | string | |
| `country` | string | |
| `lead_owner` | string | Agent name |
| `crm_status` | enum | `GOOD_LEAD_FOLLOW_UP` \| `DID_NOT_CONNECT` \| `BAD_LEAD` \| `SALE_DONE` \| `""` |
| `crm_note` | string | Notes + additional contacts |
| `data_source` | enum | `leads_on_demand` \| `meridian_tower` \| `eden_park` \| `varah_swamy` \| `sarjapur_plots` \| `""` |
| `possession_time` | string | |
| `description` | string | |

Internal fields (`source_row_index`, etc.) are never included in the final CRM records or CSV export.

## Hybrid AI Extraction Strategy

1. **CSV Parser:** Backend parses the uploaded CSV independently using Papa Parse.
2. **Alias Detector:** Deterministically maps common header aliases to CRM fields (e.g. `Mail ID` → `email`, `Phone No.` → `mobile_without_country_code`).
3. **Gemini Semantic Mapper:** Sends batches to Gemini with mapping hints. AI resolves ambiguous headers and extracts complex fields (e.g. separating `country_code` from `mobile_without_country_code`).
4. **Zod Validator:** Validates every AI record against the strict CRM schema. Invalid enums become `""`. Extra fields are stripped.
5. **CRM Normalizer:** Re-validates email, re-parses phone with libphonenumber-js, normalizes dates, and strips internal metadata.

## Record Validity & Skip Rules

A record is **valid** when it contains **either** a valid email **or** a valid mobile number.

A record is **skipped** when:
- It has neither a valid email nor a valid mobile number (validation failure)
- The AI completely failed to process it after retries (AI-processing failure)

These two failure categories are reported separately. A valid-contact record is never mislabeled as missing contact information due to an AI provider error.

## Data Quality Score

Score (0–100) is calculated as:

```
Score = (imported / total) × 40          [success rate, max 40]
      + (hasEmail / imported) × 15       [email completeness, max 15]
      + (hasMobile / imported) × 15      [mobile completeness, max 15]
      + (hasName / imported) × 15        [name completeness, max 15]
      + (hasExtra / imported) × 15       [note/city/company completeness, max 15]
```

Labels: Excellent (≥90), Good (≥75), Needs Review (≥50), Poor (<50).

## Local Setup

### Prerequisites
- Node.js 18+
- npm
- A Google Gemini API key

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=your_actual_key
npm install
npm run dev   # Development server on :5000
```

### Frontend Setup

```bash
cd frontend
cp .env.example .env  # or create .env with NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
npm install
npm run dev   # Development server on :3000
```

Access the app at: **http://localhost:3000**

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Server port |
| `NODE_ENV` | `development` | Runtime environment |
| `AI_PROVIDER` | `gemini` | AI provider (only `gemini` supported) |
| `GEMINI_API_KEY` | *(required)* | Your Google Gemini API key |
| `AI_MODEL` | `gemini-3.5-flash` | Gemini model name |
| `AI_BATCH_SIZE` | `25` | Records per AI batch |
| `AI_BATCH_CONCURRENCY` | `1` | Concurrent batch requests |
| `AI_MAX_RETRIES` | `2` | Max retry attempts per batch |
| `MAX_FILE_SIZE_MB` | `10` | Maximum upload size |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed CORS origin |

### Obtaining a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a new API key
3. Set it as `GEMINI_API_KEY` in `backend/.env`

### Configuring the Model

Set `AI_MODEL` to any available Gemini model for your account. The system does **not** silently fall back to another model. If a 404 (model not found) or 429 (quota) error occurs, a safe error is returned to the UI.

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:5000/api` | Backend API base URL |

## Commands

```bash
# Backend
cd backend
npm run dev        # Development server
npm run build      # TypeScript compile
npm start          # Production server (after build)
npm test           # Run test suite (vitest)
npm run lint       # ESLint

# Frontend
cd frontend
npm run dev        # Development server
npm run build      # Next.js production build
npm run lint       # ESLint
```

## Docker

```bash
# From project root
docker-compose up --build
```

The Docker Compose network routes frontend → backend using the `backend` service hostname. The backend API key is loaded from `./backend/.env` via `env_file`.

> **Note:** Docker Compose requires `backend/.env` to exist with a valid `GEMINI_API_KEY`.

## Sample CSVs

Sample CSV files are in the `samples/` directory:

| File | Description |
|---|---|
| `real_estate_leads.csv` | Real-estate CRM export with international phones |
| `facebook_ads_leads.csv` | Facebook Lead Ads format |
| `google_ads_style.csv` | Google Ads style export |
| `sales_crm_export.csv` | Sales CRM export |
| `unusual_columns.csv` | Ambiguous, non-standard headers |
| `multiple_emails.csv` | Multiple emails per record |
| `multiple_phones.csv` | Multiple phones per record |

## API Documentation

### GET /api/health

Returns server health status.

```json
{ "status": "ok" }
```

### POST /api/import

Accepts a CSV file via `multipart/form-data`, field name `file`.

Rate limited: 20 requests per 15 minutes per IP.

**Success Response:**
```json
{
  "success": true,
  "summary": {
    "totalRows": 10,
    "totalImported": 8,
    "totalSkipped": 2,
    "successRate": 80,
    "sourceColumnsDetected": 6,
    "crmFieldsMapped": 5
  },
  "dataQuality": { "score": 78, "label": "Good", "observations": [] },
  "records": [ /* CrmRecord[] */ ],
  "skippedRecords": [ { "rowNumber": 4, "reason": "...", "originalRecord": {} } ],
  "mappingInsights": [ { "sourceColumn": "Mail ID", "targetField": "email", "confidence": "high" } ],
  "duplicateInsights": { "possibleDuplicateCount": 0, "groups": [] },
  "processing": { "totalBatches": 1, "successfulBatches": 1, "failedBatches": 0 }
}
```

## Error Handling

| Gemini Error | User Message |
|---|---|
| 429 Quota | "The AI service usage limit has been reached. Please try again later..." |
| 404 Model Not Found | "The configured AI model is unavailable for this API project..." |
| 401/403 Auth | "The AI service is not configured correctly. Please contact the administrator." |
| 500/503 Transient | "The AI service is temporarily unavailable. Please try again shortly." |

429 and 5xx errors are retried with exponential backoff + jitter (up to `AI_MAX_RETRIES` times). 401, 403, 404 are not retried.

## Security Considerations

- **API Key**: Stored server-side only. Never exposed to frontend. No `NEXT_PUBLIC_GEMINI_*` variables.
- **File Handling**: Multer uses memory storage. No CSV is written to disk.
- **Log Safety**: Logs never include full CSV records, AI prompts, or API keys.
- **Formula Injection**: CSV export prefixes dangerous characters (`=`, `+`, `-`, `@`) with `'`.
- **Error Sanitization**: Stack traces are hidden in production. Only safe user messages are returned.
- **Rate Limiting**: Import endpoint limited to 20 requests/15min per IP.
- **CORS**: Restricted to `FRONTEND_URL` origin only.

## Known Limitations

- **Gemini Quota**: Free-tier Gemini API has low rate limits. Large CSVs may trigger 429 errors. Set `AI_BATCH_CONCURRENCY=1` and `AI_MAX_RETRIES=2` to minimize issues.
- **Model Availability**: `gemini-3.5-flash` must be available in your Google Cloud project and region. Check [AI Studio](https://aistudio.google.com) for available models.
- **Local Phone Numbers**: Numbers without an international prefix (`+`) cannot have a country code auto-detected. The system does not default to +91 or any country.
- **Manual Browser Verification**: Responsive UI, dark mode, and Gemini extraction accuracy require manual browser testing to fully verify.

## Test Coverage

```bash
cd backend && npm test
```

Test files:
- `health.test.ts` — Health endpoint
- `alias-detector.test.ts` — Header alias detection
- `schema.test.ts` — CRM schema, enum sanitization, field stripping
- `utils.test.ts` — Phone normalization, email validation
- `crm-normalizer.test.ts` — Record normalization, valid contact rules
- `duplicate-detection.test.ts` — Duplicate detection by email/mobile
- `data-quality.test.ts` — Quality score calculation
- `csv-export.test.ts` — CSV export, injection protection, field ordering
- `ai-provider.test.ts` — Mock isolation, error mapping, startup protection
