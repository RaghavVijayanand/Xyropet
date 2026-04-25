const cloudinary = require('cloudinary').v2;
const logger = require('../lib/logger');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadPetPhoto(buffer, petName) {
  return new Promise((resolve, reject) => {
    const sanitized = (petName || 'pet').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'xyropet/pets',
        public_id: `${sanitized}_${Date.now()}`,
        transformation: [{ width: 800, height: 800, crop: 'limit' }],
      },
      (err, result) => {
        if (err) {
          logger.warn({ err }, 'Cloudinary upload failed');
          reject(err);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    uploadStream.end(buffer);
  });
}

module.exports = { uploadPetPhoto };
