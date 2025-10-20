import { useMemo } from 'react';
import { Dimensions } from 'react-native';

export const useGameLayout = () => {
  const { width } = Dimensions.get('window');
  
  return useMemo(() => {
    const minItemsPerRow = 3;
    const maxItemWidth = 120;
    const containerPadding = 40;
    const itemMargin = 8;

    const maxPossibleItems = Math.floor((width - containerPadding) / (maxItemWidth + itemMargin));
    const calculatedItemsPerRow = Math.max(minItemsPerRow, maxPossibleItems);
    const availableWidth = width - containerPadding - (calculatedItemsPerRow * itemMargin);
    const itemWidth = Math.min(maxItemWidth, Math.floor(availableWidth / calculatedItemsPerRow));

    console.log('Screen width:', width, 'Items per row:', calculatedItemsPerRow, 'Item width:', itemWidth);

    return { itemWidth, calculatedItemsPerRow };
  }, [width]);
};