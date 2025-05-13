import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Box, AppBar, Toolbar, Typography, Button, ButtonGroup, CircularProgress, IconButton, Tooltip } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PeopleIcon from '@mui/icons-material/People';
import DeleteIcon from '@mui/icons-material/Delete';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import RetroColumn from './RetroColumn';
import UserList from './UserList';
import { RetroStore } from '../store/RetroStore';
import DiscussionView from './DiscussionView';

interface Props {
  store: RetroStore;
}

const Board: React.FC<Props> = observer(({ store }) => {
  const [isReady, setIsReady] = useState(false);
  const [isUserListVisible, setIsUserListVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const getPhaseTranslation = (phase: 'creation' | 'voting' | 'discussion'): string => {
    const translations = {
      creation: 'Создание',
      voting: 'Голосование',
      discussion: 'Обсуждение'
    };
    return translations[phase];
  };

  const handleReadyStateChange = (isReady: boolean) => {
    store.socketService?.updateReadyState(isReady);
  };

  if (!store.room || !store.currentUser || !isReady) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  const readyUsersCount = store.users.filter(u => u.isReady).length;
  const totalUsers = store.users.length;

  const renderColumns = () => (
    <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
      <RetroColumn
        title="Что прошло хорошо"
        type="liked"
        columnIndex={0}
        store={store}
      />
      <RetroColumn
        title="Что нужно улучшить"
        type="disliked"
        columnIndex={1}
        store={store}
      />
      <RetroColumn
        title="План действий"
        type="suggestion"
        columnIndex={2}
        store={store}
      />
    </Box>
  );

  const renderContent = () => {
    switch (store.phase) {
      case 'discussion':
        return <DiscussionView store={store} />;
      case 'creation':
      case 'voting':
      default:
        return renderColumns();
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Ретроспектива - Комната: {store.room?.id}
          </Typography>
          <Typography variant="subtitle1" sx={{ mr: 2 }}>
            Этап: {getPhaseTranslation(store.phase)}
          </Typography>
          {(() => {
            const canChange = store.canChangePhase();
            const readyCount = store.getUserReadyCount();
            const totalCount = store.getTotalUserCount();
            const isAdmin = store.currentUser?.role === 'admin';

            return isAdmin ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Tooltip title={`${readyCount} из ${totalCount} участников готовы`}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      mr: 2, 
                      color: readyCount === totalCount ? 'success.light' : 'warning.light'
                    }}
                  >
                    {readyCount}/{totalCount} готовы
                  </Typography>
                </Tooltip>
                <ButtonGroup variant="contained" color="secondary" size="small" sx={{ mr: 2 }}>
                  <Button
                    onClick={() => store.socketService?.changePhase('creation')}
                    disabled={store.phase === 'creation' || !canChange}
                    sx={{ color: 'white' }}
                  >
                    Создание
                  </Button>
                  <Button
                    onClick={() => store.socketService?.changePhase('voting')}
                    disabled={store.phase === 'voting' || !canChange}
                    sx={{ color: 'white' }}
                  >
                    Голосование
                  </Button>
                  <Button
                    onClick={() => store.socketService?.changePhase('discussion')}
                    disabled={store.phase === 'discussion' || !canChange}
                    sx={{ color: 'white' }}
                  >
                    Обсуждение
                  </Button>
                </ButtonGroup>
                <Tooltip title="Удалить комнату">
                  <IconButton
                    color="error"
                    onClick={() => store.socketService?.deleteRoom()}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            ) : null;
          })()}
          <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              color="inherit"
              onClick={() => setIsUserListVisible(!isUserListVisible)}
              size="small"
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PeopleIcon sx={{ mr: 0.5 }} />
                <Typography variant="caption" sx={{ mr: 1 }}>
                  {store.users.length}
                </Typography>
                {isUserListVisible ? <ChevronRightIcon /> : <ChevronLeftIcon />}
              </Box>
            </IconButton>
            <Tooltip title="Выйти из комнаты">
              <IconButton
                color="inherit"
                onClick={() => store.socketService?.leaveRoom()}
                size="small"
              >
                <ExitToAppIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>
      <Box sx={{ 
        display: 'flex', 
        flexGrow: 1, 
        p: 2, 
        gap: 2,
        height: 'calc(100vh - 64px)',
        overflow: 'hidden'
      }}>
        <Box sx={{ 
          width: isUserListVisible ? 300 : 0,
          flexShrink: 0,
          overflowY: 'auto',
          bgcolor: 'background.paper',
          borderRadius: 1,
          boxShadow: 1,
          transition: 'width 0.2s ease-in-out',
          visibility: isUserListVisible ? 'visible' : 'hidden'
        }}>
          <UserList 
            users={store.users}
            onlineUsers={store.users.map(u => u.id)}
            currentUserId={store.currentUser.id}
            currentPhase={store.phase}
            onReadyStateChange={handleReadyStateChange}
            store={store}
          />
        </Box>
        <Box sx={{ 
          flexGrow: 1,
          overflowY: 'auto'
        }}>
          {renderContent()}
        </Box>
      </Box>
    </Box>
  );
});

export default Board;