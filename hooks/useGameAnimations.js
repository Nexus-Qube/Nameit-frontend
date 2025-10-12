import { useRef } from 'react';
import { Animated, Easing } from 'react-native';

const createFlipAnimation = () => {
  return new Animated.Value(0);
};

const startFlipAnimation = (flipAnim, duration = 800) => {
  return Animated.timing(flipAnim, {
    toValue: 1,
    duration,
    useNativeDriver: true,
    easing: Easing.out(Easing.cubic),
  });
};

const getBackTransform = (flipAnim) => {
  const rotateY = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '90deg'],
  });

  const opacity = flipAnim.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });

  return {
    transform: [
      { rotateY: rotateY },
      { perspective: 1000 },
    ],
    opacity: opacity,
  };
};

const getFrontTransform = (flipAnim) => {
  const rotateY = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-90deg', '0deg', '0deg'],
  });

  const opacity = flipAnim.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  return {
    transform: [
      { rotateY: rotateY },
      { perspective: 1000 },
    ],
    opacity: opacity,
  };
};

export const useGameAnimations = () => {
  const flipAnimations = useRef({});

  const getFlipAnimation = (itemId) => {
    if (!flipAnimations.current[itemId]) {
      flipAnimations.current[itemId] = createFlipAnimation();
    }
    return flipAnimations.current[itemId];
  };

  const flipItem = (itemId) => {
    const flipAnim = getFlipAnimation(itemId);
    const animation = startFlipAnimation(flipAnim);
    animation.start();
  };

  return {
    flipItem,
    getBackTransform: (itemId) => getBackTransform(getFlipAnimation(itemId)),
    getFrontTransform: (itemId) => getFrontTransform(getFlipAnimation(itemId)),
  };
};