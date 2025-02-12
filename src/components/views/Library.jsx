import React, { useState, useEffect } from 'react';
import { 
  Box,
  Typography,
  Grid,
  Card,
  Fade,
  IconButton,
  Chip,
  TextField,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
  Pagination,
  Rating,
  CircularProgress
} from '@mui/material';
import { Search, Download, Play } from 'lucide-react';
import jellyfinApi from '../../services/jellyfinApi';

const MEDIA_TYPES = [
  { value: 'Movie', label: 'Movies' },
  { value: 'Series', label: 'TV Shows' },
  { value: 'MusicAlbum', label: 'Music' }
];

const SORT_OPTIONS = [
  { value: 'SortName', label: 'Name' },
  { value: 'PremiereDate', label: 'Release Date' },
  { value: 'DateCreated', label: 'Date Added' },
  { value: 'CommunityRating', label: 'Rating' },
  { value: 'Runtime', label: 'Duration' }
];

const QUALITY_OPTIONS = [
    { value: 'all', label: 'All Qualities' },
    { value: '4k', label: '4K' },
    { value: 'hdr', label: 'HDR' },
    { value: '1080p', label: '1080p' }
];

function MediaCard({ item }) {
  const [isHovered, setIsHovered] = useState(false);
  const imageUrl = jellyfinApi.getImageUrl(item.Id);
  
  return (
    <Card 
    sx={{ 
        position: 'relative',
        paddingTop: '150%',
        backgroundColor: 'background.paper',
        borderRadius: 1,
        transition: 'transform 0.2s',
        cursor: 'pointer', // Add pointer cursor
        '&:hover': {
        transform: 'scale(1.02)',
        zIndex: 1
        }
    }}
    onClick={() => onMovieClick(item.Id)} // Add click handler
    >
      {/* Poster Image */}
      <Box
        component="img"
        src={imageUrl}
        alt={item.Name}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />
      
      {/* Hover Overlay */}
      <Fade in={isHovered}>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            p: 1.5
          }}
        >
          <Box>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: 'white',
                mb: 0.5,
                fontWeight: 500,
                lineHeight: 1.2
              }}
            >
              {item.Name}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ color: 'grey.400' }}
            >
              {item.ProductionYear}
            </Typography>
            {item.CommunityRating && (
              <Box sx={{ mt: 1 }}>
                <Rating 
                  value={item.CommunityRating / 2}
                  precision={0.5}
                  size="small"
                  readOnly
                />
              </Box>
            )}
          </Box>

          <Stack direction="row" spacing={1} justifyContent="center">
            <IconButton 
              size="small"
              sx={{ 
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
              }}
              onClick={() => console.log('Play:', item.Id)}
            >
              <Play size={20} />
            </IconButton>
            <IconButton 
              size="small"
              sx={{ 
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
              }}
              onClick={() => console.log('Download:', item.Id)}
            >
              <Download size={20} />
            </IconButton>
          </Stack>
        </Box>
      </Fade>
    </Card>
  );
}

function Library() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mediaType, setMediaType] = useState('Movie');
  const [sortBy, setSortBy] = useState('SortName');
  const [sortOrder, setSortOrder] = useState('Ascending');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const ITEMS_PER_PAGE = 30;

  useEffect(() => {
    loadLibraryItems();
  }, [mediaType, sortBy, sortOrder, page, searchTerm]);

  const loadLibraryItems = async () => {
    try {
      setLoading(true);
      const result = await jellyfinApi.getItems({
        includeItemTypes: mediaType,
        sortBy,
        sortOrder,
        searchTerm,
        startIndex: (page - 1) * ITEMS_PER_PAGE,
        limit: ITEMS_PER_PAGE
      });
      setItems(result.Items);
      setTotalItems(result.TotalRecordCount);
    } catch (error) {
      console.error('Failed to load library:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* Header with Media Type Selection */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2
        }}>
          <Typography variant="h5" fontWeight="500">
            Media Library
          </Typography>
          
          <ToggleButtonGroup
            value={mediaType}
            exclusive
            onChange={(_, newType) => newType && setMediaType(newType)}
            size="small"
          >
            {MEDIA_TYPES.map(type => (
              <ToggleButton 
                key={type.value} 
                value={type.value}
              >
                {type.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* Search and Sort Controls */}
        <Stack 
          direction="row" 
          spacing={2} 
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ pb: 1 }}
        >
          <TextField
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={20} />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <ToggleButtonGroup
            value={sortOrder}
            exclusive
            onChange={(_, newOrder) => newOrder && setSortOrder(newOrder)}
            size="small"
          >
            <ToggleButton value="Ascending">A-Z</ToggleButton>
            <ToggleButton value="Descending">Z-A</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {/* Media Grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Grid container spacing={2}>
              {items.map((item) => (
                <Grid item key={item.Id} xs={6} sm={4} md={3} lg={2}>
                  <MediaCard item={item} />
                </Grid>
              ))}
            </Grid>

            {/* Pagination */}
            {totalItems > ITEMS_PER_PAGE && (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center',
                pt: 2 
              }}>
                <Pagination
                  count={Math.ceil(totalItems / ITEMS_PER_PAGE)}
                  page={page}
                  onChange={(_, newPage) => setPage(newPage)}
                  color="primary"
                  size="large"
                />
              </Box>
            )}

            {/* Empty State */}
            {items.length === 0 && (
              <Typography 
                variant="body1" 
                color="text.secondary" 
                sx={{ textAlign: 'center', py: 4 }}
              >
                No media items found
              </Typography>
            )}
          </>
        )}
      </Stack>
    </Box>
  );
}

export default Library;