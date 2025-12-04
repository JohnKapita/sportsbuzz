const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp'); // For image processing
const { auth, requireAdmin } = require('./auth');

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname).toLowerCase();
    cb(null, 'sportbuzz-' + uniqueSuffix + fileExtension);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Process and optimize uploaded image
async function processImage(imagePath, filename) {
  try {
    console.log(`🖼️ Processing image: ${filename}`);
    
    const metadata = await sharp(imagePath).metadata();
    console.log(`📐 Original dimensions: ${metadata.width}x${metadata.height}`);
    
    // Define optimal sizes for different uses
    const sizes = {
      original: imagePath,
      large: imagePath.replace(/(\.[\w\d]+)$/, '-large$1'),   // For article display
      medium: imagePath.replace(/(\.[\w\d]+)$/, '-medium$1'), // For thumbnails
      small: imagePath.replace(/(\.[\w\d]+)$/, '-small$1')    // For lists
    };
    
    // Create different sizes
    await Promise.all([
      // Large: Optimal for article display (16:9 aspect ratio)
      sharp(imagePath)
        .resize(1200, 675, {
          fit: 'cover',
          position: 'center',
          withoutEnlargement: true
        })
        .jpeg({ 
          quality: 85,
          progressive: true,
          mozjpeg: true
        })
        .toFile(sizes.large),
      
      // Medium: For thumbnails
      sharp(imagePath)
        .resize(600, 338, {
          fit: 'cover',
          position: 'center',
          withoutEnlargement: true
        })
        .jpeg({ 
          quality: 80,
          progressive: true
        })
        .toFile(sizes.medium),
      
      // Small: For lists and previews
      sharp(imagePath)
        .resize(300, 169, {
          fit: 'cover',
          position: 'center',
          withoutEnlargement: true
        })
        .jpeg({ 
          quality: 75,
          progressive: true
        })
        .toFile(sizes.small)
    ]);
    
    // Optimize the original too (keep as backup)
    await sharp(imagePath)
      .jpeg({ 
        quality: 90,
        progressive: true 
      })
      .toFile(imagePath);
    
    console.log(`✅ Image processed successfully: ${filename}`);
    
    return {
      original: `/uploads/images/${path.basename(sizes.original)}`,
      large: `/uploads/images/${path.basename(sizes.large)}`,
      medium: `/uploads/images/${path.basename(sizes.medium)}`,
      small: `/uploads/images/${path.basename(sizes.small)}`
    };
    
  } catch (error) {
    console.error('❌ Image processing error:', error);
    throw new Error('Failed to process image');
  }
}

// Upload image (admin only)
router.post('/image', auth, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No image file uploaded' 
      });
    }

    console.log(`📤 Received image: ${req.file.originalname} (${req.file.size} bytes)`);
    
    // Process the image for optimal display
    let imageUrls;
    try {
      imageUrls = await processImage(req.file.path, req.file.filename);
    } catch (processError) {
      console.warn('⚠️ Image processing failed, using original:', processError.message);
      // If processing fails, still use the uploaded file
      imageUrls = {
        original: `/uploads/images/${req.file.filename}`,
        large: `/uploads/images/${req.file.filename}`,
        medium: `/uploads/images/${req.file.filename}`,
        small: `/uploads/images/${req.file.filename}`
      };
    }

    res.json({
      success: true,
      imageUrl: imageUrls.large, // Use large version for articles
      thumbnailUrl: imageUrls.medium, // Medium for thumbnails
      previewUrl: imageUrls.small, // Small for previews
      originalUrl: imageUrls.original, // Original as backup
      filename: req.file.filename,
      message: 'Image uploaded and processed successfully for optimal display'
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    
    // Clean up uploaded file if something went wrong
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Failed to cleanup file:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      success: false,
      message: error.message || 'Image upload failed' 
    });
  }
});

// Delete image (admin only)
router.delete('/image/:filename', auth, requireAdmin, async (req, res) => {
  try {
    const filename = req.params.filename;
    const baseName = path.parse(filename).name;
    const extension = path.parse(filename).ext;
    
    // Delete all size variants
    const filesToDelete = [
      filename,                          // original
      `${baseName}-large${extension}`,  // large
      `${baseName}-medium${extension}`, // medium
      `${baseName}-small${extension}`   // small
    ];
    
    let deletedCount = 0;
    
    for (const file of filesToDelete) {
      const filePath = path.join(uploadDir, file);
      try {
        if (fs.existsSync(filePath)) {
          await fs.unlink(filePath);
          deletedCount++;
          console.log(`🗑️ Deleted: ${file}`);
        }
      } catch (err) {
        console.warn(`⚠️ Could not delete ${file}:`, err.message);
      }
    }
    
    res.json({
      success: true,
      message: `Deleted ${deletedCount} image file(s)`,
      deleted: deletedCount
    });

  } catch (error) {
    console.error('❌ Delete image error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete image' 
    });
  }
});

// Get uploaded images list (admin only)
router.get('/images', auth, requireAdmin, async (req, res) => {
  try {
    const files = await fs.readdir(uploadDir);
    
    const images = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      })
      .map(file => ({
        filename: file,
        url: `/uploads/images/${file}`,
        path: path.join(uploadDir, file),
        size: fs.statSync(path.join(uploadDir, file)).size
      }));

    res.json({
      success: true,
      images,
      total: images.length
    });

  } catch (error) {
    console.error('❌ Get images error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch images' 
    });
  }
});

module.exports = router;