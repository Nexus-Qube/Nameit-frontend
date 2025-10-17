// Remove these named requires at the top and use inline requires instead:

// Single source of truth - all config in one place
const spriteSheets = {
  1: {
    src: require('../assets/images/NBA120.png'),
    width: 606,
    height: 727,
    fileName: 'NBA120.png',
  },
  3: {
    src: require('../assets/images/spritesheet_pokemon21.png'),
    width: 3871,
    height: 2904,
    fileName: 'spritesheet_pokemon21.png',
  },
  4: {
    src: require('../assets/images/spritesheet_lol.png'),
    width: 1211,
    height: 2179,
    fileName: 'spritesheet_lol.png',
  },
  5: {
    src: require('../assets/images/Overwatch75.png'),
    width: 761,
    height: 381,
    fileName: 'Overwatch75.png',
  },
};

// Only need one fallback config for topics without sprite sheets
const NO_SPRITESHEET_CONFIG = {
  noSpriteSheet: true,
  src: null,
  width: 100,
  height: 100,
  fileName: 'no_spritesheet',
};

export const getSpriteSheetConfig = (topicId) => {
  const config = spriteSheets[topicId];
  
  if (config) {
    return {
      ...config,
      hasSpriteSheet: true,
    };
  }
  
  console.warn(`No sprite sheet configuration found for topic ID: ${topicId}, showing gray square with checkmark`);
  return NO_SPRITESHEET_CONFIG;
};

export const getAvailableTopicIds = () => {
  return Object.keys(spriteSheets).map(id => parseInt(id));
};

export const hasSpriteSheet = (topicId) => {
  return !!spriteSheets[topicId];
};

export const getConfiguredTopics = () => {
  return Object.keys(spriteSheets).map(id => ({
    id: parseInt(id),
    hasConfig: true,
    hasImage: true,
  }));
};