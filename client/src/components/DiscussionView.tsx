import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Box, Paper, Typography, IconButton, Tooltip } from '@mui/material';
import { NavigateBefore, NavigateNext } from '@mui/icons-material';
import { RetroStore } from '../store/RetroStore';
import { Card as CardType } from '../types';

interface Props {
  store: RetroStore;
}

const DiscussionView: React.FC<Props> = observer(({ store }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const sortedCards = store.sortedCards;

  useEffect(() => {
    console.log('Cards in discussion view:', sortedCards.map(c => ({
      id: c.id,
      text: c.text,
      likes: c.likes?.length || 0,
      dislikes: c.dislikes?.length || 0,
      score: (c.likes?.length || 0) - (c.dislikes?.length || 0)
    })));
    setCurrentIndex(0);
  }, [store.phase, sortedCards]);

  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(sortedCards.length - 1, prev + 1));
  };

  const getCardColor = (card: CardType) => {
    return {
      liked: '#e8f5e9',
      disliked: '#ffebee',
      suggestion: '#e3f2fd'
    }[card.type];
  };

  const currentCard = sortedCards[currentIndex];

  if (!currentCard) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '100%',
        width: '100%'
      }}>
        <Typography variant="h6">Нет карточек для обсуждения</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      p: 3
    }}>
      <Box sx={{
        maxWidth: '800px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4
      }}>
        <Typography variant="h6">
          Карточка {currentIndex + 1} из {sortedCards.length}
        </Typography>

        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          width: '100%',
          justifyContent: 'center'
        }}>
          <Tooltip title="Предыдущая карточка">
            <span>
              <IconButton 
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                size="large"
                sx={{ transform: 'scale(1.2)' }}
              >
                <NavigateBefore />
              </IconButton>
            </span>
          </Tooltip>

          <Paper
            elevation={3}
            sx={{
              flex: '1 1 auto',
              maxWidth: '600px',
              p: 4,
              backgroundColor: getCardColor(currentCard),
              minHeight: '250px',
              display: 'flex',
              flexDirection: 'column',
              gap: 3
            }}
          >
            <Typography 
              variant="body1" 
              sx={{ 
                flexGrow: 1,
                fontSize: '1.1rem',
                lineHeight: 1.6
              }}
            >
              {currentCard.text}
            </Typography>

            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid rgba(0,0,0,0.1)',
              pt: 2
            }}>
              <Box sx={{ display: 'flex', gap: 3 }}>
                <Typography variant="body2" color="primary" sx={{ fontSize: '1rem' }}>
                  👍 {currentCard.likes?.length || 0}
                </Typography>
                <Typography variant="body2" color="error" sx={{ fontSize: '1rem' }}>
                  👎 {currentCard.dislikes?.length || 0}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '1rem' }}>
                Рейтинг: {(currentCard.likes?.length || 0) - (currentCard.dislikes?.length || 0)}
              </Typography>
            </Box>
          </Paper>

          <Tooltip title="Следующая карточка">
            <span>
              <IconButton
                onClick={handleNext}
                disabled={currentIndex === sortedCards.length - 1}
                size="large"
                sx={{ transform: 'scale(1.2)' }}
              >
                <NavigateNext />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
});

export default DiscussionView; 