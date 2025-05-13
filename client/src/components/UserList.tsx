import React from 'react';
import { Box, List, ListItem, ListItemText, Typography, Avatar, Button, Tooltip, IconButton } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { RetroStore } from '../store/RetroStore';

interface User {
  id: string;
  name: string;
  role: 'admin' | 'user';
  isReady?: boolean;
}

interface UserListProps {
  users: User[];
  onlineUsers: string[]; // массив ID пользователей онлайн
  currentUserId: string;
  currentPhase: 'creation' | 'voting' | 'discussion';
  onReadyStateChange: (isReady: boolean) => void;
  store: RetroStore;
}

const UserList: React.FC<UserListProps> = ({ 
  users, 
  onlineUsers, 
  currentUserId,
  currentPhase,
  onReadyStateChange,
  store
}) => {
  const currentUser = users.find(u => u.id === currentUserId);
  const readyCount = users.filter(u => u.isReady).length;
  const isAdmin = currentUser?.role === 'admin';

  const handleKickUser = (userId: string) => {
    if (isAdmin && userId !== currentUserId) {
      store.socketService?.kickUser(userId);
    }
  };

  const handleLeaveRoom = () => {
    store.socketService?.leaveRoom();
  };

  const getPhaseActionText = (phase: string): string => {
    switch (phase) {
      case 'creation':
        return 'создал(а) карточки';
      case 'voting':
        return 'проголосовал(а)';
      case 'discussion':
        return 'готов(а) к обсуждению';
      default:
        return 'готов(а)';
    }
  };

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: 360, 
      bgcolor: 'background.paper',
      borderRadius: 1,
      boxShadow: 1,
      p: 1,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Box sx={{ p: 1 }}>
        <Typography variant="h6" gutterBottom>
          Участники ({users.length})
        </Typography>
        {currentUser && (
          <>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {currentUser.isReady ? 'Вы отметили свою готовность' : 'Отметьте свою готовность'}
            </Typography>
            <Button
              variant="contained"
              color={currentUser.isReady ? "success" : "primary"}
              fullWidth
              onClick={() => onReadyStateChange(!currentUser.isReady)}
              startIcon={currentUser.isReady ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
            >
              {currentUser.isReady ? 'Я готов(а)' : 'Отметить готовность'}
            </Button>
          </>
        )}
      </Box>
      <List>
        {users.map((user) => (
          <ListItem
            key={user.id}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              bgcolor: user.id === currentUserId && user.isReady ? 'success.light' : 'transparent',
              '&:hover': {
                bgcolor: user.id === currentUserId && user.isReady ? 'success.light' : 'action.hover',
              },
            }}
          >
            <Avatar
              sx={{
                mr: 2,
                bgcolor: onlineUsers.includes(user.id) ? 'success.main' : 'grey.400',
              }}
            >
              {user.role === 'admin' ? <AdminPanelSettingsIcon /> : <PersonIcon />}
            </Avatar>
            <ListItemText
              primary={user.name}
              secondary={user.role === 'admin' ? 'Администратор' : 'Участник'}
              sx={{
                '& .MuiListItemText-primary': {
                  fontWeight: onlineUsers.includes(user.id) ? 'bold' : 'normal',
                },
                '& .MuiListItemText-secondary': {
                  color: user.role === 'admin' ? 'primary.main' : 'text.secondary',
                },
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {user.id === currentUserId && (
                <Tooltip title={user.isReady ? `Вы ${getPhaseActionText(currentPhase)}` : `Вы еще не готовы`}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    color: user.isReady ? 'success.main' : 'text.disabled'
                  }}>
                    {user.isReady ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
                  </Box>
                </Tooltip>
              )}
              {isAdmin && user.id !== currentUserId && (
                <Tooltip title="Исключить пользователя">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleKickUser(user.id)}
                  >
                    <PersonRemoveIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default UserList; 