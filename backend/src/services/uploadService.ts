import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Criar diretório de uploads se não existir
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Subdiretórios para diferentes tipos
const equipmentPhotosDir = path.join(uploadDir, 'equipment-photos');
const documentsDir = path.join(uploadDir, 'documents');
const termsDir = path.join(uploadDir, 'terms');

[equipmentPhotosDir, documentsDir, termsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuração de armazenamento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determinar pasta baseado no campo do upload
    let uploadPath = uploadDir;
    
    if (file.fieldname === 'equipmentPhoto') {
      uploadPath = equipmentPhotosDir;
    } else if (file.fieldname === 'document') {
      uploadPath = documentsDir;
    } else if (file.fieldname === 'term') {
      uploadPath = termsDir;
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Gerar nome único: timestamp_equipmentId_originalname
    const timestamp = Date.now();
    const equipmentId = req.params.id || req.body.equipment_id || 'unknown';
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
    
    cb(null, `${timestamp}_${equipmentId}_${sanitizedName}${ext}`);
  }
});

// Filtro de tipos de arquivo
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Tipos permitidos
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedDocTypes = /pdf|doc|docx|xls|xlsx|txt/;
  
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mimetype = file.mimetype;
  
  // Verificar se é imagem ou documento válido
  const isImage = allowedImageTypes.test(ext) && mimetype.startsWith('image/');
  const isDocument = allowedDocTypes.test(ext);
  
  if (isImage || isDocument) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Use: imagens (jpg, png, gif, webp) ou documentos (pdf, doc, xls, txt)'));
  }
};

// Configuração do multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  }
});

// Middleware para múltiplos arquivos (até 5 fotos)
export const uploadMultiplePhotos = upload.array('photos', 5);

// Middleware para foto única de equipamento
export const uploadEquipmentPhoto = upload.single('equipmentPhoto');

// Middleware para documento
export const uploadDocument = upload.single('document');

// Helper para deletar arquivo
export const deleteFile = (filePath: string): boolean => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Helper para obter URL pública do arquivo
export const getFileUrl = (filename: string, type: 'photo' | 'document' | 'term'): string => {
  const baseUrl = process.env.API_URL || 'http://localhost:3001';
  const typePath = type === 'photo' ? 'equipment-photos' : type === 'document' ? 'documents' : 'terms';
  return `${baseUrl}/uploads/${typePath}/${filename}`;
};

export default upload;
