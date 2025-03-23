import React, { useState, useEffect } from 'react';
import { 
  Box,
  Typography,
  Grid,
  Card,
  Fade,
  TextField,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Rating,
  CircularProgress,
  InputAdornment,
  Chip,
  Pagination,
  Button
} from '@mui/material';
import { Search, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import jellyfinApi from '../../services/jellyfinApi';  // Add this import

const SORT_OPTIONS = [
  { value: 'SortName', label: 'Name' },
  { value: 'PremiereDate', label: 'Release Date' },
  { value: 'DateCreated', label: 'Date Added' },
  { value: 'CommunityRating', label: 'Rating' },
  { value: 'Runtime', label: 'Duration' }
];

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: '4k', label: '4K' },
  { value: 'hdr', label: 'HDR' },
  { value: 'played', label: 'Watched' },
  { value: 'unplayed', label: 'Unwatched' }
];

// Items per page options
const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48, 96];

function MediaCard({ item, onSelect }) {
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(null);
  const imageUrl = jellyfinApi.getImageUrl(item.Id);
  const { ipcRenderer } = require('electron');

  // Load progress when card mounts
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const savedProgress = await ipcRenderer.invoke('get-progress', { mediaId: item.Id });
        setProgress(savedProgress);
      } catch (error) {
        console.error('Failed to load progress:', error);
      }
    };
    loadProgress();
  }, [item.Id]);
  
  return (
    <Card 
      onClick={() => onSelect(item.Id)}
      sx={{ 
        position: 'relative',
        paddingTop: '150%',
        backgroundColor: 'background.paper',
        cursor: 'pointer',
        '&:hover': {
          transform: 'scale(1.02)',
          zIndex: 1
        },
        transition: 'transform 0.2s'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Existing image */}
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
          objectFit: 'cover',
          filter: isHovered ? 'brightness(0.3)' : 'none',
          transition: 'filter 0.2s'
        }}
      />

      {/* Progress bar - always visible */}
      {progress && progress.position > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${(progress.position / progress.duration) * 100}%`,
              bgcolor: '#00a4dc', // Jellyfin blue
              transition: 'width 0.3s'
            }}
          />
        </Box>
      )}
      
      {isHovered && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center'
          }}
        >
          <Typography 
            variant="h6" 
            color="white"
            sx={{ mb: 1 }}
          >
            {item.Name}
          </Typography>
          <Typography 
            variant="body2" 
            color="grey.300"
            sx={{ mb: 1 }}
          >
            {item.ProductionYear}
          </Typography>
          {item.CommunityRating && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Rating 
                value={item.CommunityRating / 2}
                precision={0.5}
                size="small"
                readOnly
              />
              <Typography 
                variant="body2" 
                color="grey.300"
              >
                {(item.CommunityRating / 2).toFixed(1)}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Watched indicator for completed items */}
      {progress && progress.position >= progress.duration * 0.9 && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '50%',
            p: 0.5,
            zIndex: 1
          }}
        >
          <CheckCircle size={20} color="#00ff00" />
        </Box>
      )}
    </Card>
  );
}

function Library({ onMovieSelect }) {
  console.log('Library component is rendering');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState({
    sort: 'SortName',
    filter: 'all',
    search: ''
  });
  
  // Pagination states
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    // Reset to page 1 when filters change
    setPage(1);
    loadLibraryItems();
  }, [filters, itemsPerPage]);

  // Effect for handling pagination changes
  useEffect(() => {
    loadLibraryItems();
  }, [page]);

  const loadLibraryItems = async () => {
    try {
      setLoading(true);
      const params = {
        sortBy: filters.sort,
        sortOrder: 'Ascending',
        includeItemTypes: 'Movie',
        searchTerm: filters.search,
        // Pagination parameters
        startIndex: (page - 1) * itemsPerPage,
        limit: itemsPerPage
      };

      // Add specific filters
      if (filters.filter === '4k') {
        params.minWidth = 3840;
      } else if (filters.filter === 'hdr') {
        params.hasHdr = true;
      } else if (filters.filter === 'played') {
        params.isPlayed = true;
      } else if (filters.filter === 'unplayed') {
        params.isPlayed = false;
      }

      const result = await jellyfinApi.getItems(params);
      setItems(result.Items);
      setTotalItems(result.TotalRecordCount);
      setTotalPages(Math.ceil(result.TotalRecordCount / itemsPerPage));
    } catch (error) {
      console.error('Failed to load library:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle page change
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (event) => {
    setItemsPerPage(event.target.value);
    setPage(1); // Reset to first page when changing items per page
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* Search and Filters */}
        <Stack 
          direction="row" 
          spacing={2} 
          sx={{ mb: 3 }}
        >
          <TextField
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={20} />
                </InputAdornment>
              ),
            }}
          />

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={filters.sort}
              label="Sort By"
              onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value }))}
            >
              {SORT_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Filter</InputLabel>
            <Select
              value={filters.filter}
              label="Filter"
              onChange={(e) => setFilters(prev => ({ ...prev, filter: e.target.value }))}
            >
              {FILTER_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
                  <MediaCard 
                    item={item} 
                    onSelect={onMovieSelect}
                  />
                </Grid>
              ))}
            </Grid>

            {/* Pagination Controls */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mt: 3,
                pt: 2,
                borderTop: '1px solid',
                borderColor: 'divider'
              }}
            >
              {/* Items per page selector */}
              <FormControl sx={{ minWidth: 100 }}>
                <Select
                  value={itemsPerPage}
                  size="small"
                  onChange={handleItemsPerPageChange}
                  displayEmpty
                  renderValue={(value) => `${value} items`}
                >
                  {ITEMS_PER_PAGE_OPTIONS.map(option => (
                    <MenuItem key={option} value={option}>
                      {option} items
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Status text */}
              <Typography variant="body2" color="text.secondary">
                Showing {(page - 1) * itemsPerPage + 1} - {Math.min(page * itemsPerPage, totalItems)} of {totalItems} items
              </Typography>

              {/* Pagination component */}
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  disabled={page === 1}
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  startIcon={<ChevronLeft size={16} />}
                  size="small"
                >
                  Previous
                </Button>
                
                <Pagination 
                  count={totalPages} 
                  page={page} 
                  onChange={handlePageChange}
                  size="small"
                  siblingCount={1}
                  boundaryCount={1}
                  hideNextButton
                  hidePrevButton
                />
                
                <Button
                  disabled={page === totalPages}
                  onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  endIcon={<ChevronRight size={16} />}
                  size="small"
                >
                  Next
                </Button>
              </Stack>
            </Box>
          </>
        )}
      </Stack>
    </Box>
  );
}

export default Library;