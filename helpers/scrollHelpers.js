export const scrollToItem = (itemRefs, scrollRef, itemId, onScrollComplete) => {
  const ref = itemRefs.current[itemId];
  if (!ref) {
    onScrollComplete?.();
    return;
  }

  ref.measureLayout(
    scrollRef.current.getInnerViewNode(),
    (x, y, width, height) => {
      if (scrollRef.current) {
        const scrollViewHeight = 400;
        const targetScrollY = Math.max(0, y - (scrollViewHeight / 2) + (height / 2));
        
        // Try using getScrollResponder() for better compatibility
        const scrollResponder = scrollRef.current.getScrollResponder();
        if (scrollResponder && scrollResponder.scrollTo) {
          scrollResponder.scrollTo({
            y: targetScrollY,
            animated: true,
          });
        } else {
          // Fallback to regular scrollTo
          scrollRef.current.scrollTo({
            y: targetScrollY,
            animated: true,
          });
        }
        
        onScrollComplete?.();
      }
    },
    (err) => {
      console.warn("measureLayout error:", err);
      onScrollComplete?.();
    }
  );
};