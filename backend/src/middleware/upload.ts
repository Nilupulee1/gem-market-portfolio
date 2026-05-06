import multer from 'multer';
import cloudinary from '../config/cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype.startsWith('image/');
    const isPdf = file.mimetype === 'application/pdf';

    const params: any = {
      folder: 'gem_marketplace',
      resource_type: isPdf ? 'raw' : 'image',
      allowed_formats: isPdf ? ['pdf'] : ['jpg', 'jpeg', 'png'],
    };

    // Only add transformation for images
    if (isImage) {
      params.transformation = [{ width: 1000, height: 1000, crop: 'limit' }];
    }

    return params;
  },
});

const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (
    file.mimetype.startsWith('image/') ||
    file.mimetype === 'application/pdf'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter,
});
