import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  CircularProgress,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
} from '@mui/material';
import { RetroStore } from '../store/RetroStore';

interface Props {
  store: RetroStore;
}

interface AvailableRoom {
  id: string;
  usersCount: number;
  phase: string;
}

const Login: React.FC<Props> = observer(({ store }) => {
  const [tab, setTab] = useState(0);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);

  useEffect(() => {
    if (tab === 1) {
      fetchAvailableRooms();
    }
  }, [tab]);

  const fetchAvailableRooms = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/rooms');
      const rooms = await response.json();
      setAvailableRooms(rooms);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      store.setError('Failed to load available rooms');
    }
  };

  const handleRoomSelect = (selectedRoomId: string) => {
    setRoomId(selectedRoomId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !username || !password) return;

    setIsLoading(true);
    store.setError(null);

    try {
      console.log('Attempting to handle room submission:', { tab, roomId, username });
      if (tab === 0) {
        await store.socketService?.createRoom(roomId, password, username);
      } else {
        await store.socketService?.joinRoom(roomId, password, username);
      }
      console.log('Room operation successful, current store state:', {
        room: store.room,
        currentUser: store.currentUser,
        users: store.users
      });
    } catch (error) {
      console.error('Room operation failed:', error);
      store.setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getPhaseTranslation = (phase: string) => {
    const translations = {
      'creation': 'Создание',
      'voting': 'Голосование',
      'discussion': 'Обсуждение'
    };
    return translations[phase as keyof typeof translations] || phase;
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f5f5f5',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, newValue) => setTab(newValue)}
          variant="fullWidth"
          sx={{ mb: 3 }}
        >
          <Tab label="Создать комнату" />
          <Tab label="Присоединиться" />
        </Tabs>

        {store.error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {store.error}
          </Typography>
        )}

        <form onSubmit={handleSubmit}>
          {tab === 1 && availableRooms.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Доступные комнаты:
              </Typography>
              <List>
                {availableRooms.map((room) => (
                  <React.Fragment key={room.id}>
                    <ListItemButton
                      selected={roomId === room.id}
                      onClick={() => handleRoomSelect(room.id)}
                    >
                      <ListItemText
                        primary={`Комната: ${room.id}`}
                        secondary={`Участников: ${room.usersCount} | Фаза: ${getPhaseTranslation(room.phase)}`}
                      />
                    </ListItemButton>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </Box>
          )}

          {tab === 1 && availableRooms.length === 0 && (
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Нет доступных комнат
            </Typography>
          )}

          <TextField
            fullWidth
            label="ID комнаты"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            margin="normal"
            required
            disabled={isLoading}
          />
          <TextField
            fullWidth
            label="Ваше имя"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            margin="normal"
            required
            disabled={isLoading}
          />
          <TextField
            fullWidth
            label={tab === 0 ? "Установить пароль" : "Пароль комнаты"}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            disabled={isLoading}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            sx={{ mt: 3 }}
            disabled={isLoading || !roomId || !username || !password}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              tab === 0 ? 'Создать комнату' : 'Присоединиться'
            )}
          </Button>
        </form>
      </Paper>
    </Box>
  );
});

export default Login; 