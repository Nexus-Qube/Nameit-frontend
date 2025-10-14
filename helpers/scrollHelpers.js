// helpers/scrollHelpers.js
import { Platform, Dimensions } from "react-native";

export const scrollToItem = (itemRefs, scrollRef, itemId, allItems = []) => {
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

      // Use more accurate calculations based on your actual layout
      const itemsPerRow = calculateItemsPerRow();
      
      // Adjusted values based on your working mobile scroll (8037px)
      const rowHeight = 164; // Reduced from 180 to match actual item height
      const headerOffset = 100; // Reduced from 250 to match previous working offset
      
      const rowIndex = Math.floor(itemIndex / itemsPerRow);
      const scrollY = (rowIndex * rowHeight) - headerOffset;
      
      const finalScrollY = Math.max(0, scrollY);
      
      console.log(`📊 Index-based scroll - Item: ${itemId}, Index: ${itemIndex}, Row: ${rowIndex}, ScrollY: ${finalScrollY}`);
      
      scrollRef.current.scrollTo({
        y: finalScrollY,
        animated: true
      });
      
    } catch (error) {
      console.log('Index scroll error:', error);
      // Fallback to the old measurement method for mobile
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