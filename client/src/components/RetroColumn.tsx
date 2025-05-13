import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { Paper, Typography, Box, TextField, Button, IconButton, Popover } from '@mui/material';
import { RetroStore } from '../store/RetroStore';
import RetroCard from './RetroCard';
import { Card } from '../types';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';

interface Props {
  title: string;
  type: 'liked' | 'disliked' | 'suggestion';
  columnIndex: number;
  store: RetroStore;
}

const EMOJI_GROUPS = {
  'liked': [
    '😊', '🎉', '👍', '⭐', '🌟', '💪', '🙌', '👏', '✨', '🎯',
    '❤️', '🥰', '😍', '🤩', '😇', '🥳', '🔥', '💯', '👌', '💖',
    '💝', '💫', '🌈', '🎨', '🎭', '🎪', '🎡', '🎢', '🎠', '🎬'
  ],
  'disliked': [
    '😕', '😢', '😩', '😫', '😤', '😠', '😡', '💔', '⚠️', '❌',
    '😞', '😔', '😣', '😖', '😨', '😰', '😥', '😪', '😓', '😭',
    '🤔', '🤨', '😒', '🙄', '😑', '😐', '😶', '🤦', '🤷', '💩'
  ],
  'suggestion': [
    '💡', '🎨', '🔧', '🛠️', '📝', '✏️', '🎯', '🎪', '🎭', '🎬',
    '📌', '📍', '💭', '🗯️', '💬', '📢', '🔍', '⚡', '💫', '🌟',
    '🎵', '🎶', '📱', '💻', '⌨️', '🖥️', '🎮', '🎲', '🔮', '✨'
  ]
};

const RetroColumn: React.FC<Props> = observer(({ title, type, columnIndex, store }) => {
  const [newCardText, setNewCardText] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [localCards, setLocalCards] = useState<Card[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const textFieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const filteredCards = store.cards.filter(card => card.column === columnIndex);
    setLocalCards(filteredCards);
  }, [store.cards, columnIndex]);

  const handleAddCard = () => {
    if (newCardText.trim() && store.socket && store.phase === 'creation') {
      const text = selectedEmoji ? `${selectedEmoji} ${newCardText.trim()}` : newCardText.trim();
      store.socketService?.addCard(text, type, columnIndex);
      setNewCardText('');
      setSelectedEmoji('');
    }
  };

  const handleEmojiClick = (emoji: string) => {
    const start = cursorPosition;
    const newText = newCardText.slice(0, start) + emoji + ' ' + newCardText.slice(start);
    setNewCardText(newText);
    setAnchorEl(null);
    
    // Восстанавливаем фокус на текстовом поле
    setTimeout(() => {
      if (textFieldRef.current) {
        textFieldRef.current.focus();
        const newCursorPos = start + emoji.length + 1;
        textFieldRef.current.setSelectionRange(newCursorPos, newCursorPos);
        setCursorPosition(newCursorPos);
      }
    }, 0);
  };

  const handleCursorChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const target = e.target as HTMLTextAreaElement | HTMLInputElement;
    setCursorPosition(target.selectionStart || 0);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLDivElement>) => {
    const target = e.target as HTMLTextAreaElement | HTMLInputElement;
    setCursorPosition(target.selectionStart || 0);
  };

  const handleOpenEmojiPicker = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseEmojiPicker = () => {
    setAnchorEl(null);
  };

  const columnColor = {
    liked: '#e8f5e9',
    disliked: '#ffebee',
    suggestion: '#e3f2fd'
  }[type];

  const open = Boolean(anchorEl);

  return (
    <Paper 
      elevation={2}
      sx={{
        width: '33%',
        minWidth: '300px',
        minHeight: '70vh',
        p: 2,
        backgroundColor: columnColor,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Typography variant="h6" gutterBottom align="center">
        {title}
      </Typography>

      {store.phase === 'creation' && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              variant="outlined"
              placeholder="Добавить новую карточку..."
              value={newCardText}
              onChange={(e) => {
                setNewCardText(e.target.value);
                handleCursorChange(e);
              }}
              onSelect={handleSelect}
              inputRef={textFieldRef}
              size="small"
              InputProps={{
                startAdornment: null,
                endAdornment: (
                  <IconButton 
                    onClick={handleOpenEmojiPicker}
                    sx={{ 
                      p: 0.5,
                      opacity: 0.6,
                      '&:hover': { 
                        backgroundColor: 'transparent',
                        opacity: 1 
                      }
                    }}
                  >
                    <EmojiEmotionsIcon fontSize="small" />
                  </IconButton>
                )
              }}
            />
          </Box>
          <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={handleCloseEmojiPicker}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <Box sx={{ 
              p: 1.5, 
              display: 'grid', 
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: 0.5,
              maxWidth: '400px'
            }}>
              {EMOJI_GROUPS[type].map((emoji) => (
                <IconButton
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  sx={{ 
                    fontSize: '1.2rem',
                    width: 32,
                    height: 32,
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                >
                  {emoji}
                </IconButton>
              ))}
            </Box>
          </Popover>
          <Button
            fullWidth
            variant="contained"
            onClick={handleAddCard}
            disabled={!newCardText.trim()}
          >
            Добавить
          </Button>
        </Box>
      )}

      <Box
        sx={{
          flexGrow: 1,
          minHeight: '100px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {localCards.map((card, index) => (
          <RetroCard
            key={card.id}
            card={card}
            index={index}
            store={store}
          />
        ))}
      </Box>
    </Paper>
  );
});

export default RetroColumn; 