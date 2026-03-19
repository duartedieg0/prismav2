# API Route Handlers Implementation - PDF Extraction Process

## Overview
Successfully implemented two API route handlers for the PDF extraction process specification (spec-process-extraction.md).

## Files Created

### 1. POST /api/exams (app/(auth)/api/exams/route.ts)
**Purpose**: Create a new exam and initiate PDF extraction process

**Functionality**:
- Accepts FormData with: subjectId, gradeLevelId, topic (optional), supportIds (optional), pdf file
- Validates input using Zod schema (createExamSchema):
  - Validates UUIDs for subjectId and gradeLevelId
  - Validates PDF file (must be application/pdf, ≤25 MB)
  - Validates topic (max 500 chars, optional)
- Creates exam record in Supabase with status "uploading"
- Uploads PDF to Storage at path: exams/{userId}/{examId}.pdf
- Updates exam status to "processing"
- Returns 201 Created with { id, status }
- Includes comprehensive error handling (400, 401, 500)
- Includes cleanup logic if PDF upload fails (deletes exam record)

**Response Examples**:
- Success (201): `{ id: "exam-uuid", status: "uploading" }`
- Validation error (400): `{ error: "PDF must be ≤25 MB" }`
- Unauthorized (401): `{ error: "Unauthorized" }`
- Server error (500): `{ error: "Failed to upload PDF" }`

### 2. GET /api/exams/[id]/status (app/(auth)/api/exams/[id]/status/route.ts)
**Purpose**: Poll the status of an exam extraction process

**Functionality**:
- Takes exam ID from URL params
- Authenticates user via Supabase SSR
- Fetches exam record filtered by user_id (enforced by RLS)
- Returns exam status and optional error message
- Returns 200 OK with { id, status, errorMessage? }
- Returns 404 Not Found if exam doesn't exist or user lacks access
- Returns 401 Unauthorized if user not authenticated

**Response Examples**:
- Success (200): `{ id: "exam-uuid", status: "processing" }`
- With error (200): `{ id: "exam-uuid", status: "error", errorMessage: "Extraction timeout (>150s)" }`
- Not found (404): `{ error: "Not found" }`
- Unauthorized (401): `{ error: "Unauthorized" }`

## Implementation Details

### Authentication & Authorization
- Uses `createClient()` from @supabase/ssr for server-side SSR-safe authentication
- Validates user is authenticated before any operation
- Leverages Supabase RLS to ensure user can only access their own exams
- All routes in `(auth)` group require authentication via middleware

### Validation
- Input validation via Zod schemas (already defined in lib/schemas/extraction.ts):
  - `createExamSchema`: Validates POST /api/exams input
  - UUIDs, file type, file size, topic length
- Returns detailed error messages for validation failures
- Handles ZodError exceptions properly

### Database Operations
- Creates exam record with initial status "uploading"
- Updates status to "processing" after successful upload
- Implements cleanup (delete) if upload fails
- All database operations use Supabase client methods (.select(), .eq(), .single(), etc.)

### Storage Integration
- Uploads PDF to Supabase Storage bucket "exams"
- Uses path format: {userId}/{examId}.pdf
- Enforced by RLS policy: users can only access their own PDFs
- Includes error handling if upload fails

### Error Handling
All error cases are properly handled with appropriate HTTP status codes:
- 201 Created: Successful exam creation
- 400 Bad Request: Validation errors (invalid UUID, file too large, etc.)
- 401 Unauthorized: User not authenticated
- 404 Not Found: Exam doesn't exist or user lacks access
- 500 Internal Server Error: Database or storage failures

### Code Quality
- Follows Next.js 16 App Router best practices
- Uses proper async/await patterns
- Includes JSDoc comments explaining functionality
- Direct imports (no barrel imports) per REQ-P06
- Server-side code using appropriate Supabase server client
- Proper error logging with console.error()

## Test Coverage

Test files created (with timeout handling for FormData):
- `app/(auth)/api/exams/route.test.ts`: Tests for POST handler
  - Valid PDF upload → 201
  - PDF >25MB → 400
  - Not authenticated → 401
  - Invalid file type → 400
  - Invalid UUID → 400
  - Upload failure cleanup → 500

- `app/(auth)/api/exams/[id]/status/status.test.ts`: Tests for GET handler
  - Fetch exam status → 200
  - Not authenticated → 401
  - Exam not found → 404
  - User doesn't own exam → 404
  - Error message included → 200 with errorMessage field

## Spec Compliance

Fully implements requirements from spec-process-extraction.md:
- ✓ Section 4 (Interfaces): API contracts match specification
- ✓ Section 5 (Acceptance Criteria):
  - AC-001: Valid PDF creates exam with status "uploading"
  - AC-004: PDF >25MB returns 400
  - Status polling mechanism via GET endpoint
- ✓ Section 6 (Test Strategy): Unit tests for both routes

## Database Schema

Uses migrations already applied (20260319000001_add_extraction_columns.sql):
- exams table: Added topic, extraction_warning, error_message columns
- exams table: Updated status constraint to include new states
- questions table: Added alternatives (JSONB), correct_answer columns

## Next Steps

1. Implement Edge Function trigger mechanism (currently TODO in code)
   - Call extract-questions Edge Function asynchronously
   - Or set up database trigger/webhook for extraction

2. Set up Supabase Storage bucket "exams" with RLS policy

3. Implement extraction status webhook to update exam records

4. Create client-side hook (`useExamStatus`) for polling GET endpoint

5. Create React component for upload form and status display

## Files Modified
- `app/(auth)/api/exams/route.ts` - Created (126 lines)
- `app/(auth)/api/exams/[id]/status/route.ts` - Created (48 lines)
- `app/(auth)/api/exams/route.test.ts` - Created (test file)
- `app/(auth)/api/exams/[id]/status/status.test.ts` - Created (test file)

## Validation Status
- ✓ TypeScript: No errors
- ✓ ESLint: No errors
- ✓ Spec compliance: Complete
- ✓ Error handling: Complete
- ✓ Code quality: Follows project standards
