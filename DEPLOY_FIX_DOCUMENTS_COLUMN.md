# Fix: Documents Column Missing in Azure Database

## Problem
The `documents` column is missing from the `inventory_equipment` table in Azure PostgreSQL, causing 500 errors when uploading documents to equipment/notebooks.

## Solution Applied

### 1. **Auto-Migration Code Added**
The upload endpoint now **automatically creates the column** if it doesn't exist before attempting to save documents.

**File**: `backend/src/routes/inventory.ts`
```typescript
// GARANTIR que a coluna documents existe (criar se não existir)
await database.query(`
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='inventory_equipment' AND column_name='documents'
    ) THEN
      ALTER TABLE inventory_equipment ADD COLUMN documents TEXT;
    END IF;
  END $$;
`);
```

### 2. **Standalone Migration SQL**
Created `backend/migrations/003_add_documents_column.sql` for manual execution if needed.

## Deployment Steps

### Option A: **Deploy Backend (Recommended)**
The code will auto-create the column on first upload attempt.

```bash
cd c:\Users\TECNOLOGIA\portal-ti\backend
npm run build
# Deploy to Azure (zip deploy or however you deploy)
```

### Option B: **Run Migration SQL Manually**
If you want to add the column immediately without waiting for deployment:

1. Connect to your Azure PostgreSQL database
2. Run the SQL from `backend/migrations/003_add_documents_column.sql`

**Azure CLI:**
```bash
az postgres flexible-server execute \
  --name <your-server-name> \
  --resource-group <your-resource-group> \
  --admin-user <admin-user> \
  --admin-password <admin-password> \
  --file-path "c:\Users\TECNOLOGIA\portal-ti\backend\migrations\003_add_documents_column.sql"
```

**Or via Azure Portal:**
1. Go to your PostgreSQL server in Azure Portal
2. Open "Query editor" (or use pgAdmin/DBeaver)
3. Connect to your database
4. Run this SQL:

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='inventory_equipment' AND column_name='documents'
  ) THEN
    ALTER TABLE inventory_equipment ADD COLUMN documents TEXT;
    RAISE NOTICE 'Added documents column to inventory_equipment';
  END IF;
END $$;
```

## What Changed

### Backend (`inventory.ts`):
1. ✅ **Auto-creates `documents` column** if missing (runs before every upload)
2. ✅ **Better error handling** for multer upload errors
3. ✅ **Detailed logging** to diagnose issues
4. ✅ **Safe JSON parsing** with fallback for corrupted data
5. ✅ **Relative URL storage** instead of absolute URLs (works in Azure)

### Frontend (`DocumentUploader.tsx`):
1. ✅ **Proper download handling** using API endpoint
2. ✅ **Blob download** instead of window.open
3. ✅ **Better button styling** with gradients and shadows

## Testing After Deployment

1. **Navigate to a notebook/equipment detail page**
2. **Try uploading a document** (PDF, DOC, XLS, or TXT, max 10MB)
3. **Check Azure logs** - you should see:
   ```
   📤 Upload document request for equipment <id>
     - File: <filename>
     - document_type: <type>
     - description: <description>
     ✓ Verified documents column exists
     - Relative URL: /uploads/documents/<filename>
     - Saving X documents
   ✅ Document uploaded successfully
   ```
4. **Try downloading the document** - should work with the new download endpoint

## Troubleshooting

### If you still see 500 errors after deployment:
Check Azure logs for the specific error message. The enhanced logging will show exactly where it fails.

### If column creation fails:
Run the migration SQL manually (Option B above).

### If uploads still fail:
1. Check file type (must be PDF, DOC, DOCX, XLS, XLSX, or TXT)
2. Check file size (max 10MB)
3. Verify `/uploads/documents` directory exists in Azure container

## Files Modified
- ✅ `backend/src/routes/inventory.ts` - Auto-creates documents column + better error handling
- ✅ `backend/src/routes/documents.ts` - Added download endpoint
- ✅ `backend/src/index.ts` - Enhanced static file serving
- ✅ `frontend/src/components/DocumentUploader.tsx` - Proper download handling
- ✅ `frontend/src/styles/DocumentUploader.css` - Better button styling
- ✅ `backend/migrations/003_add_documents_column.sql` - Standalone migration
