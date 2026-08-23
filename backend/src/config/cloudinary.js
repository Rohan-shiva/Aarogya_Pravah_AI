const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

/**
 * Check if Cloudinary credentials are fully and correctly provided in environment variables
 * and configure the Cloudinary SDK. Supports both individual keys and CLOUDINARY_URL.
 */
const checkAndConfigureCloudinary = () => {
  const cloudinaryUrl = process.env.CLOUDINARY_URL?.trim();
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const folder = process.env.CLOUDINARY_FOLDER?.trim() || 'aarogya-pravah-ai/xrays';

  // Support direct CLOUDINARY_URL (e.g., cloudinary://api_key:api_secret@cloud_name)
  if (cloudinaryUrl && cloudinaryUrl.startsWith('cloudinary://') && !cloudinaryUrl.includes('*')) {
    cloudinary.config({
      cloudinary_url: cloudinaryUrl,
      secure: true,
    });
    return {
      isConfigured: true,
      cloudinaryFolder: folder,
      cloudName: cloudinary.config().cloud_name || 'env_url',
      isMaskedSecret: false,
    };
  }

  const isMaskedSecret = Boolean(apiSecret && (apiSecret.includes('*') || apiSecret === 'your_cloudinary_api_secret_here'));
  const isDummyName = Boolean(!cloudName || cloudName === 'your_cloudinary_cloud_name_here');
  const isDummyKey = Boolean(!apiKey || apiKey === 'your_cloudinary_api_key_here');

  const isConfigured = Boolean(
    cloudName &&
    apiKey &&
    apiSecret &&
    !isMaskedSecret &&
    !isDummyName &&
    !isDummyKey
  );

  if (isMaskedSecret) {
    logger.warn(
      `[Cloudinary Config] WARNING: CLOUDINARY_API_SECRET in backend/.env contains masked asterisks (**********). Please copy the actual unmasked API secret from Cloudinary Console (click the eye icon or copy button).`
    );
  }

  if (isConfigured) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  return {
    isConfigured,
    cloudinaryFolder: folder,
    cloudName: cloudName || cloudinary.config().cloud_name,
    isMaskedSecret,
  };
};

// Initial setup on module load
const { isConfigured, cloudinaryFolder, isMaskedSecret } = checkAndConfigureCloudinary();

if (isConfigured) {
  logger.info(`[Cloudinary Config] Live credentials initialized for cloud: ${process.env.CLOUDINARY_CLOUD_NAME || 'active'}, target folder: ${cloudinaryFolder}`);
} else if (isMaskedSecret) {
  logger.warn(`[Cloudinary Config] Running in safe fallback mode because API secret contains masked asterisks.`);
} else {
  logger.warn(
    `[Cloudinary Config] CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET is not configured in backend/.env. Using simulated local fallback mode.`
  );
}

module.exports = {
  cloudinary,
  checkAndConfigureCloudinary,
  isConfigured,
  cloudinaryFolder,
};
