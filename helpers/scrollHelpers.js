// helpers/scrollHelpers.js
import { Platform, Dimensions } from "react-native";

export const scrollToItem = (itemRefs, scrollRef, itemId, allItems = [], itemsPerRow, itemWidth, inputRef = null) => {
  console.log(`🎯 Scroll called for item: ${itemId}`);
  
  if (!scrollRef.current) {
    console.log('❌ Scroll ref not available');
    return;
  }

  // Store current scroll position to detect when scroll completes
  let scrollStartY = scrollRef.current.contentOffset?.y || 0;
  
  setTimeout(() => {
    try {
      const itemIndex = allItems.findIndex(item => item.id == itemId);
      
      if (itemIndex === -1) {
        console.log('❌ Item not found in allItems array');
        return;
      }

      const calculatedItemsPerRow = itemsPerRow || calculateItemsPerRow();
      
      const itemContainerHeight = 150;
      const verticalMargin = 12;
      const rowHeight = itemContainerHeight + verticalMargin;
      const headerOffset = 190;
      
      const rowIndex = Math.floor(itemIndex / calculatedItemsPerRow);
      const scrollY = (rowIndex * rowHeight) - headerOffset;
      const finalScrollY = Math.max(0, scrollY);
      
      console.log(`📊 Scroll - RowHeight: ${rowHeight}, ItemIndex: ${itemIndex}, Row: ${rowIndex}, ScrollY: ${finalScrollY}`);
      
      // KEEP SMOOTH SCROLLING but use a shorter duration
      scrollRef.current.scrollTo({
        y: finalScrollY,
        animated: true,
        duration: 200 // Shorter animation
      });
      
      console.log(`⌨️ Scroll started with animation`);
      
      // Use scroll end detection instead of fixed timeout
      detectScrollEnd(scrollRef, scrollStartY, finalScrollY, () => {
        console.log(`⌨️ Scroll animation completed`);
        // Focus is now handled at component level - no aggressive refocus needed
      });
      
    } catch (error) {
      console.log('Index scroll error:', error);
      useMeasurementFallback(itemRefs, scrollRef, itemId);
    }
  }, 100);
};

// Detect when scroll animation completes
const detectScrollEnd = (scrollRef, startY, targetY, onComplete, attempts = 0) => {
  const maxAttempts = 20; // 2 seconds max
  const checkInterval = 100;
  
  if (attempts >= maxAttempts) {
    console.log(`⌨️ Scroll detection timeout`);
    onComplete();
    return;
  }
  
  setTimeout(() => {
    const currentY = scrollRef.current.contentOffset?.y || 0;
    const distanceToTarget = Math.abs(currentY - targetY);
    const isAtTarget = distanceToTarget < 10; // Within 10 pixels
    
    console.log(`⌨️ Scroll check ${attempts + 1}: currentY=${currentY}, targetY=${targetY}, distance=${distanceToTarget}, atTarget=${isAtTarget}`);
    
    if (isAtTarget || attempts >= 5) {
      // Either reached target or waited long enough
      onComplete();
    } else {
      // Continue checking
      detectScrollEnd(scrollRef, startY, targetY, onComplete, attempts + 1);
    }
  }, checkInterval);
};

const useMeasurementFallback = (itemRefs, scrollRef, itemId) => {
  const itemRef = itemRefs.current[itemId];
  
  if (!itemRef || !scrollRef.current) return;

  const scrollStartY = scrollRef.current.contentOffset?.y || 0;

  if (Platform.OS === 'web') {
    itemRef.measure((x, y, width, height, pageX, pageY) => {
      const scrollY = pageY - 300;
      console.log(`🌐 Web measurement fallback: ${scrollY}`);
      scrollRef.current.scrollTo({ y: Math.max(0, scrollY), animated: true, duration: 200 });
      
      detectScrollEnd(scrollRef, scrollStartY, scrollY, () => {
        console.log(`⌨️ Web fallback scroll completed`);
      });
    });
  } else {
    itemRef.measureLayout(
      scrollRef.current,
      (x, y, width, height) => {
        const scrollY = y - 100;
        console.log(`📱 Mobile measurement fallback: ${scrollY}`);
        scrollRef.current.scrollTo({ y: Math.max(0, scrollY), animated: true, duration: 200 });
        
        detectScrollEnd(scrollRef, scrollStartY, scrollY, () => {
          console.log(`⌨️ Mobile fallback scroll completed`);
        });
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