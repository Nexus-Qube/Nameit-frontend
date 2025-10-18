// helpers/scrollHelpers.js
import { Platform, Dimensions } from "react-native";

export const scrollToItem = (itemRefs, scrollRef, itemId, allItems = [], itemsPerRow, itemWidth, inputRef = null) => {
  console.log(`🎯 Scroll called for item: ${itemId}`);
  console.log(`⌨️ Focus before scroll:`, inputRef?.current ? document.activeElement === inputRef.current : 'No input ref');
  
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
        console.log(`⌨️ Scroll animation completed, restoring focus`);
        restoreFocusAggressively(inputRef);
      });
      
    } catch (error) {
      console.log('Index scroll error:', error);
      useMeasurementFallback(itemRefs, scrollRef, itemId, inputRef);
    }
  }, 100);
};

// Detect when scroll animation completes
const detectScrollEnd = (scrollRef, startY, targetY, onComplete, attempts = 0) => {
  const maxAttempts = 20; // 2 seconds max
  const checkInterval = 100;
  
  if (attempts >= maxAttempts) {
    console.log(`⌨️ Scroll detection timeout, forcing focus`);
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

// More aggressive focus restoration
const restoreFocusAggressively = (inputRef, attempt = 0) => {
  const maxAttempts = 10;
  
  if (attempt >= maxAttempts) {
    console.log(`⌨️ Max aggressive focus attempts reached`);
    return;
  }
  
  setTimeout(() => {
    console.log(`⌨️ Aggressive focus attempt ${attempt + 1}/${maxAttempts}`);
    
    if (inputRef?.current) {
      // Force focus and prevent any default behaviors
      inputRef.current.focus();
      
      // Additional web-specific focus enforcement
      if (Platform.OS === 'web' && inputRef.current) {
        const inputElement = inputRef.current;
        inputElement.focus({ preventScroll: true });
        
        // Blur any other potentially focused elements
        if (document.activeElement && document.activeElement !== inputElement) {
          document.activeElement.blur();
        }
      }
      
      const isFocused = document.activeElement === inputRef.current;
      console.log(`⌨️ Aggressive focus attempt ${attempt + 1} result:`, isFocused);
      
      if (!isFocused) {
        restoreFocusAggressively(inputRef, attempt + 1);
      }
    }
  }, attempt * 50); // 0ms, 50ms, 100ms, etc.
};

const useMeasurementFallback = (itemRefs, scrollRef, itemId, inputRef = null) => {
  const itemRef = itemRefs.current[itemId];
  
  if (!itemRef || !scrollRef.current) return;

  console.log(`⌨️ Using measurement fallback, focus before:`, inputRef?.current ? document.activeElement === inputRef.current : 'No input ref');

  const scrollStartY = scrollRef.current.contentOffset?.y || 0;

  if (Platform.OS === 'web') {
    itemRef.measure((x, y, width, height, pageX, pageY) => {
      const scrollY = pageY - 300;
      console.log(`🌐 Web measurement fallback: ${scrollY}`);
      scrollRef.current.scrollTo({ y: Math.max(0, scrollY), animated: true, duration: 200 });
      
      detectScrollEnd(scrollRef, scrollStartY, scrollY, () => {
        console.log(`⌨️ Web fallback scroll completed, restoring focus`);
        restoreFocusAggressively(inputRef);
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
          console.log(`⌨️ Mobile fallback scroll completed, restoring focus`);
          restoreFocusAggressively(inputRef);
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