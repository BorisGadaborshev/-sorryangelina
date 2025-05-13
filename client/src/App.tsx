import React, { useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material';
import { RetroStore } from './store/RetroStore';
import Login from './components/Login';
import Board from './components/Board';
import { observer } from 'mobx-react-lite';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#9c27b0',
    },
  },
});

const store = new RetroStore();

const App = observer(() => {
  useEffect(() => {
    return () => {
      store.socket?.disconnect();
    };
  }, []);

  console.log('App render, room state:', store.room);

  return (
    <ThemeProvider theme={theme}>
      {store.room ? <Board store={store} /> : <Login store={store} />}
    </ThemeProvider>
  );
});

export default App;
