import { Platform } from 'react-native';

// Map require results to web paths
export const getImageSource = (localRequire, webFilename) => {
  if (Platform.OS === 'web') {
    return { uri: `/assets/images/${webFilename}` };
  }
  return localRequire;
};