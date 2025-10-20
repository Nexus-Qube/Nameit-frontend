// frontend/hooks/useGameData.js - UPDATED VERSION
import { useState, useEffect } from 'react';
import { fetchTopicById, fetchItemsByTopic } from '../services/api';
import { getSpriteSheetConfig } from '../config/spriteSheetConfigs';
import { initializeGameItems } from '../helpers/gameLogicHelpers';

export const useGameData = (topicId) => {
  const [spriteInfo, setSpriteInfo] = useState({
    spriteSize: 0,
    margin: 1,
    spritesPerRow: 0,
    sheetWidth: 0,
    sheetHeight: 0,
    sheetUrl: null,
    noSpriteSheet: false,
  });
  const [items, setItems] = useState([]); // ADD ITEMS STATE
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!topicId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const topicData = await fetchTopicById(topicId);
        if (!topicData) {
          setError('Topic not found');
          return;
        }

        const spriteConfig = getSpriteSheetConfig(topicId);
        setSpriteInfo({
          spriteSize: topicData.sprite_size,
          margin: 1,
          spritesPerRow: topicData.sprites_per_row,
          sheetWidth: spriteConfig.width,
          sheetHeight: spriteConfig.height,
          sheetUrl: spriteConfig.src,
          noSpriteSheet: spriteConfig.noSpriteSheet || false,
        });

        const itemsData = await fetchItemsByTopic(topicId);
        const initializedItems = initializeGameItems(itemsData, topicData);
        setItems(initializedItems); // SET ITEMS HERE
        
        setLoading(false);
        
        if (spriteConfig.noSpriteSheet) {
          console.log(`ℹ️ No sprite sheet for topic ${topicId}, using gray squares with checkmarks`);
        } else {
          console.log(`✅ Loaded sprite sheet for topic ${topicId}: ${spriteConfig.fileName}`);
        }
      } catch (err) {
        console.error("Error fetching topic/items:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [topicId]);

  return { spriteInfo, items, setItems, loading, error }; // RETURN ITEMS AND SETITEMS
};