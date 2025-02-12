import React from 'react';
import { 
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton,
  ListItemIcon, 
  ListItemText
} from '@mui/material';
import { 
  Library, 
  Download, 
  Settings 
} from 'lucide-react';

const drawerWidth = 240;

function Sidebar({ selectedView, onViewChange }) {
  const menuItems = [
    { id: 'library', text: 'Library', icon: <Library size={24} /> },
    { id: 'downloads', text: 'Downloads', icon: <Download size={24} /> },
    { id: 'settings', text: 'Settings', icon: <Settings size={24} /> },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ overflow: 'auto', mt: 8 }}>
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton
                selected={selectedView === item.id}
                onClick={() => onViewChange(item.id)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}

export default Sidebar;