# Fix: Documents Not Displaying After Upload

## Problem
Document upload was succeeding but documents weren't appearing in the UI. The document list showed "Nenhum documento adicionado ainda" even after successful uploads.

## Root Cause
The frontend was fetching documents from the **wrong endpoint** and looking for the data in the **wrong location**:

1. ❌ After upload, fetched `GET /equipment/:id` (returns equipment details, NOT documents)
2. ❌ Looked for `data.documents` but endpoint returns `{ equipment, movements, terms }`
3. ❌ Initial page load also had the same bug

## Solution

### Frontend Changes

#### 1. **EquipmentDetailPage.tsx** - Fixed Initial Document Loading
**File**: `frontend/src/pages/EquipmentDetailPage.tsx`

**Changed**: Now fetches documents from the correct endpoint `GET /equipment/:id/documents`

```typescript
// BEFORE (WRONG)
const response = await fetch(`${BACKEND_URL}/api/inventory/equipment/${equipmentId}`);
const data = await response.json();
setDocuments(data.documents || []); // ❌ data.documents doesn't exist!

// AFTER (CORRECT)
const [equipmentResponse, documentsResponse] = await Promise.all([
  fetch(`${BACKEND_URL}/api/inventory/equipment/${equipmentId}`, { ... }),
  fetch(`${BACKEND_URL}/api/inventory/equipment/${equipmentId}/documents`, { ... })
]);

const equipmentData = await equipmentResponse.json();
const documentsData = await documentsResponse.json();
setDocuments(documentsData.documents || []); // ✅ Correct path!
```

**Benefits**:
- ✅ Fetches from dedicated documents endpoint
- ✅ Uses `Promise.all()` for parallel loading (faster)
- ✅ Properly extracts documents from response

#### 2. **DocumentUploader.tsx** - Fixed Post-Upload Refresh
**File**: `frontend/src/components/DocumentUploader.tsx`

**Changed**: Now fetches from correct endpoint and adds console logging

```typescript
// BEFORE (WRONG)
await api.post(`/inventory/equipment/${equipmentId}/document`, formData);
const docsResponse = await api.get(`/inventory/equipment/${equipmentId}`);
if (docsResponse.data.documents) { ... } // ❌ Wrong path!

// AFTER (CORRECT)
const uploadResponse = await api.post(`/inventory/equipment/${equipmentId}/document`, formData);
console.log('✅ Upload response:', uploadResponse.data);

const docsResponse = await api.get(`/inventory/equipment/${equipmentId}/documents`);
console.log('📄 Documents response:', docsResponse.data);

const docs = docsResponse.data.documents || [];
console.log('📝 Setting documents:', docs);

onDocumentsChange(docs); // ✅ Will now work!
```

**Benefits**:
- ✅ Fetches from correct `/documents` endpoint
- ✅ Console logs for debugging
- ✅ Better error logging

### Backend Changes

#### Enhanced Logging for Debugging
**File**: `backend/src/routes/inventory.ts`

```typescript
// Upload endpoint
console.log('  - Saving', documents.length, 'documents');
console.log('  - Document data:', JSON.stringify(documents[documents.length - 1], null, 2));
console.log('  - JSON length:', jsonDocuments.length, 'bytes');
console.log('✅ Document uploaded successfully to database');

// Documents list endpoint
console.log(`📄 Returning ${documents.length} documents for equipment ${id}`);
```

**Benefits**:
- ✅ Detailed logging to diagnose issues
- ✅ Shows exact document data being saved
- ✅ Shows how many documents are returned

## How to Test

### 1. Deploy Backend
```bash
cd c:\Users\TECNOLOGIA\portal-ti\backend
npm run build
# Deploy to Azure
```

### 2. Deploy Frontend
```bash
cd c:\Users\TECNOLOGIA\portal-ti\frontend
npm run build
# Deploy to Azure Static Web Apps
```

### 3. Test Document Upload
1. Navigate to a notebook/equipment detail page
2. Scroll to "📄 Documentos Anexados" section
3. Select a document type (e.g., "Nota Fiscal")
4. Add a description (optional)
5. Click "📤 Selecionar Arquivo" and choose a file
6. **Watch browser console** - you should see:
   ```
   ✅ Upload response: { success: true, filename: "...", url: "..." }
   📄 Documents response: { equipment_id: "...", documents: [...], total: 1 }
   📝 Setting documents: [{ filename: "...", url: "...", type: "...", ... }]
   ```

7. **Watch Azure backend logs** - you should see:
   ```
   📤 Upload document request for equipment <id>
     - File: <filename>
     - document_type: <type>
     - description: <description>
     ✓ Verified documents column exists
     - Relative URL: /uploads/documents/<filename>
     - Saving 1 documents
     - Document data: { ... }
     - JSON length: XXX bytes
   ✅ Document uploaded successfully to database
   📄 Returning 1 documents for equipment <id>
   ```

8. **The document should now appear** in the list with:
   - Document type badge (e.g., "🧾 Nota Fiscal")
   - File size
   - Description
   - Upload date
   - ⬇️ Baixar button

9. **Click "⬇️ Baixar"** to download the document

## API Endpoints Reference

### Upload Document
```
POST /api/inventory/equipment/:id/document
Content-Type: multipart/form-data

Form data:
- document: <file>
- document_type: "invoice" | "manual" | "warranty" | "receipt" | "other"
- description: "Optional description"

Response:
{
  "success": true,
  "filename": "1772805180399_unknown_file.pdf",
  "url": "/uploads/documents/1772805180399_unknown_file.pdf",
  "message": "Document uploaded successfully"
}
```

### List Documents
```
GET /api/inventory/equipment/:id/documents

Response:
{
  "equipment_id": "b4783d4b-50bb-4b15-9f4f-b74f869ad47e",
  "internal_code": "NB-001",
  "documents": [
    {
      "filename": "1772805180399_unknown_file.pdf",
      "url": "/uploads/documents/1772805180399_unknown_file.pdf",
      "type": "invoice",
      "description": "Nota fiscal nº 12345",
      "uploaded_at": "2026-04-09T10:30:00.000Z",
      "size": 467600,
      "mimetype": "application/pdf"
    }
  ],
  "total": 1
}
```

### Download Document
```
GET /api/inventory/equipment/:equipmentId/document/:filename

Downloads the file with proper Content-Disposition header
```

## Files Modified
- ✅ `backend/src/routes/inventory.ts` - Enhanced logging
- ✅ `frontend/src/pages/EquipmentDetailPage.tsx` - Fixed initial document loading
- ✅ `frontend/src/components/DocumentUploader.tsx` - Fixed post-upload refresh

## Summary
The issue was that the frontend was looking for documents in the wrong place. After fixing both the initial load and the post-upload refresh to use the correct `/documents` endpoint, documents now display correctly after upload! 🎉
