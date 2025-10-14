import spriteSheetsData from '../assets/data/spriteSheets.json';

// Static mapping of topic IDs to image sources
const topicImageSources = {
  1: require('../assets/images/NBA120.png'),
  3: require('../assets/images/spritesheet_pokemon21.png'),
  4: require('../assets/images/spritesheet_lol.png'),
  // Add new topics here:
  // 5: require('../assets/images/spritesheet_new_topic.png'),
};

const FALLBACK_CONFIG = {
  src: require('../assets/images/spritesheet_pokemon21.png'), // Use Pokemon as fallback
  width: 3871,
  height: 2904,
};

export const getSpriteSheetConfig = (topicId) => {
  const topicKey = topicId.toString();
  const config = spriteSheetsData.spriteSheets[topicKey];
  const imageSource = topicImageSources[topicId];
  
  // If we have both config and image source, return complete config
  if (config && imageSource) {
    return {
      src: imageSource,
      width: config.width,
      height: config.height,
      fileName: config.fileName,
    };
  }
  
  // If we have image source but no config, use image source with default dimensions
  if (imageSource) {
    console.warn(`No sprite sheet configuration found for topic ID: ${topicId}, using default dimensions`);
    return {
      src: imageSource,
      width: 1200,
      height: 1200,
      fileName: `spritesheet_topic${topicId}.png`,
    };
  }
  
  // If no image source, return fallback
  console.warn(`No sprite sheet image found for topic ID: ${topicId}, using fallback`);
  return FALLBACK_CONFIG;
};

export const getAvailableTopicIds = () => {
  return Object.keys(spriteSheetsData.spriteSheets).map(id => parseInt(id));
};

export const hasSpriteSheet = (topicId) => {
  return !!topicImageSources[topicId];
};

// Helper to see which topics are configured
export const getConfiguredTopics = () => {
  return Object.keys(topicImageSources).map(id => ({
    id: parseInt(id),
    hasConfig: !!spriteSheetsData.spriteSheets[id],
    hasImage: true,
  }));
};