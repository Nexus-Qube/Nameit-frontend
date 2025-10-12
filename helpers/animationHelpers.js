import { Animated, Easing } from "react-native";

export const createFlipAnimation = () => {
  return new Animated.Value(0);
};

export const startFlipAnimation = (flipAnim, duration = 800) => {
  return Animated.timing(flipAnim, {
    toValue: 1,
    duration,
    useNativeDriver: true,
    easing: Easing.out(Easing.cubic),
  });
};

export const getBackTransform = (flipAnim) => {
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

export const getFrontTransform = (flipAnim) => {
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