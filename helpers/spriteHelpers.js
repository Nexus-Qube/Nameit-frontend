export const getSpritePosition = (order, spriteInfo) => {
  const { spritesPerRow, spriteSize, margin } = spriteInfo;
  const index = order - 1;
  const row = Math.floor(index / spritesPerRow);
  const col = index % spritesPerRow;
  const left = 1 + col * (spriteSize + margin);
  const top = 1 + row * (spriteSize + margin);
  return { left, top };
};

export const calculateSpriteScale = (spriteSize, containerSize = 100) => {
  return containerSize / spriteSize;
};