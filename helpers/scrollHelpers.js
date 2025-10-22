// helpers/scrollHelpers.js
import { Platform, Dimensions } from "react-native";

export const scrollToItem = (itemRefs, scrollRef, itemId, allItems = [], itemsPerRow, itemWidth, inputRef = null) => {
  console.log(`🎯 Scroll called for item: ${itemId}`);
  
  if (!scrollRef.current) {
    console.log('❌ Scroll ref not available');
    return;
  }

  // Store current focus state
  const wasFocused = inputRef?.current && Platform.OS === 'web' 
    ? document.activeElement === inputRef.current 
    : false;

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
      
      scrollRef.current.scrollTo({
        y: finalScrollY,
        animated: true,
        duration: 200
      });
      
      console.log(`⌨️ Scroll started with animation`);
      
      // Restore focus after scroll animation completes
      if (wasFocused && inputRef?.current) {
        setTimeout(() => {
          if (inputRef.current) {
            console.log('⌨️ Restoring focus after scroll');
            inputRef.current.focus();
          }
        }, 400); // Wait for scroll animation to complete
      }
      
    } catch (error) {
      console.log('Index scroll error:', error);
      useMeasurementFallback(itemRefs, scrollRef, itemId, inputRef, wasFocused);
    }
  }, 100);
};

const useMeasurementFallback = (itemRefs, scrollRef, itemId, inputRef = null, wasFocused = false) => {
  const itemRef = itemRefs.current[itemId];
  
  if (!itemRef || !scrollRef.current) return;

  if (Platform.OS === 'web') {
    itemRef.measure((x, y, width, height, pageX, pageY) => {
      const scrollY = pageY - 300;
      console.log(`🌐 Web measurement fallback: ${scrollY}`);
      scrollRef.current.scrollTo({ 
        y: Math.max(0, scrollY), 
        animated: true, 
        duration: 200 
      });
      
      // Restore focus
      if (wasFocused && inputRef?.current) {
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 400);
      }
    });
  } else {
    itemRef.measureLayout(
      scrollRef.current,
      (x, y, width, height) => {
        const scrollY = y - 100;
        console.log(`📱 Mobile measurement fallback: ${scrollY}`);
        scrollRef.current.scrollTo({ 
          y: Math.max(0, scrollY), 
          animated: true, 
          duration: 200 
        });
        
        // Restore focus
        if (wasFocused && inputRef?.current) {
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus();
            }
          }, 400);
        }
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