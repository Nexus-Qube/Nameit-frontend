const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname, {
  isCSSEnabled: true,
});

// Add asset extensions for all image types
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
];

// Simple approach - disable asset hashing by using basic transformer
config.transformer = {
  ...config.transformer,
  // Remove assetPlugins to prevent hashing
  assetPlugins: [],
};

module.exports = config;