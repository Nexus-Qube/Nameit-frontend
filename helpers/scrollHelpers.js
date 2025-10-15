// helpers/scrollHelpers.js
import { Platform, Dimensions } from "react-native";

export const scrollToItem = (itemRefs, scrollRef, itemId, allItems = [], itemsPerRow, itemWidth) => {
  console.log(`🎯 Scroll called for item: ${itemId}`);
  
  if (!scrollRef.current) {
    console.log('❌ Scroll ref not available');
    return;
  }

  setTimeout(() => {
    try {
      const itemIndex = allItems.findIndex(item => item.id == itemId);
      
      if (itemIndex === -1) {
        console.log('❌ Item not found in allItems array');
        return;
      }

      const calculatedItemsPerRow = itemsPerRow || calculateItemsPerRow();
      
      // More precise calculations based on your actual styles
      const itemContainerHeight = 150; // From your styles.itemContainer height
      const verticalMargin = 12; // From your styles.itemContainer marginBottom
      const rowHeight = itemContainerHeight + verticalMargin;
      
      // Calculate header height more precisely
      // Top row (~50px) + Bottom row (~50px) + Input field (~50px) + Padding (40px) = ~190px
      const headerOffset = 190;
      
      const rowIndex = Math.floor(itemIndex / calculatedItemsPerRow);
      const scrollY = (rowIndex * rowHeight) - headerOffset;
      
      const finalScrollY = Math.max(0, scrollY);
      
      console.log(`📊 Scroll - RowHeight: ${rowHeight}, ItemIndex: ${itemIndex}, Row: ${rowIndex}, ScrollY: ${finalScrollY}`);
      
      scrollRef.current.scrollTo({
        y: finalScrollY,
        animated: true
      });
      
    } catch (error) {
      console.log('Index scroll error:', error);
      useMeasurementFallback(itemRefs, scrollRef, itemId);
    }
  }, 100);
};

const useMeasurementFallback = (itemRefs, scrollRef, itemId) => {
  const itemRef = itemRefs.current[itemId];
  
  if (!itemRef || !scrollRef.current) return;

  // Use the old measurement method that was working
  if (Platform.OS === 'web') {
    itemRef.measure((x, y, width, height, pageX, pageY) => {
      const scrollY = pageY - 300; // Web offset
      console.log(`🌐 Web measurement fallback: ${scrollY}`);
      scrollRef.current.scrollTo({ y: Math.max(0, scrollY), animated: true });
    });
  } else {
    itemRef.measureLayout(
      scrollRef.current,
      (x, y, width, height) => {
        const scrollY = y - 100; // Mobile offset that was working
        console.log(`📱 Mobile measurement fallback: ${scrollY}`);
        scrollRef.current.scrollTo({ y: Math.max(0, scrollY), animated: true });
      },
      (error) => {
        console.log('Measurement fallback failed:', error);
      }
    );
  }
};

const calculateItemsPerRow = () => {
  try {
    let width;
    
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      width = window.innerWidth;
    } else {
      const { width: screenWidth } = Dimensions.get('window');
      width = screenWidth;
    }
    
    const containerPadding = 40;
    const itemMargin = 8;
    const maxItemWidth = 120;
    
    const maxPossibleItems = Math.floor((width - containerPadding) / (maxItemWidth + itemMargin));
    return Math.max(3, maxPossibleItems);
    
  } catch (error) {
    return 3;
  }
};