import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Stack, 
  Chip,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel 
} from '@mui/material';
import { Play, Download, ChevronLeft } from 'lucide-react';

function MovieDetails({ movie, onBack }) {
  return (
    <Box sx={{ p: 3 }}>
      {/* Back Button */}
      <Button 
        startIcon={<ChevronLeft />} 
        onClick={onBack}
        sx={{ mb: 2 }}
      >
        Back to Library
      </Button>

      {/* Hero Section */}
      <Box 
        sx={{ 
          position: 'relative',
          height: 400,
          mb: 3,
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        <Box
          component="img"
          src={movie.BackdropImageUrl}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
            p: 3,
          }}
        >
          <Typography variant="h4" color="white" gutterBottom>
            {movie.Name}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label="4K" size="small" />
            <Chip label="HDR 10" size="small" />
            <Typography variant="body2" color="grey.300">
              {movie.ProductionYear}
            </Typography>
            <Typography variant="body2" color="grey.300">
              {movie.OfficialRating}
            </Typography>
            <Typography variant="body2" color="grey.300">
              {`${Math.floor(movie.RunTimeTicks / 10000000 / 60)}min`}
            </Typography>
          </Stack>
        </Box>
      </Box>

      {/* Content Grid */}
      <Grid container spacing={4}>
        {/* Left Column */}
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            {/* Overview */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Overview
              </Typography>
              <Typography variant="body1">
                {movie.Overview}
              </Typography>
            </Box>

            {/* Rating Section */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Ratings
              </Typography>
              <Stack direction="row" spacing={4}>
                <Box>
                  <Typography variant="body2" color="grey.500">
                    IMDB Rating
                  </Typography>
                  <Typography variant="h5">
                    {movie.CommunityRating}/10
                  </Typography>
                </Box>
                {/* Add more rating sources if available */}
              </Stack>
            </Box>

            {/* Cast & Crew */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Cast & Crew
              </Typography>
              <Grid container spacing={2}>
                {movie.People?.map(person => (
                  <Grid item key={person.Id} xs={6} sm={4} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box
                        component="img"
                        src={person.PrimaryImageUrl}
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          mb: 1
                        }}
                      />
                      <Typography variant="body2" noWrap>
                        {person.Name}
                      </Typography>
                      <Typography variant="caption" color="grey.500" noWrap>
                        {person.Role}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Stack>
        </Grid>

        {/* Right Column - Playback Options */}
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={<Play />}
              fullWidth
            >
              Play
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              startIcon={<Download />}
              fullWidth
            >
              Download
            </Button>

            {/* Video Quality Selection */}
            <FormControl>
              <InputLabel>Video Quality</InputLabel>
              <Select
                value="4k"
                label="Video Quality"
              >
                <MenuItem value="4k">4K HEVC HDR</MenuItem>
                <MenuItem value="1080p">1080p H.264</MenuItem>
                <MenuItem value="720p">720p H.264</MenuItem>
              </Select>
            </FormControl>

            {/* Audio Track Selection */}
            <FormControl>
              <InputLabel>Audio</InputLabel>
              <Select
                value="default"
                label="Audio"
              >
                <MenuItem value="default">English - AAC - 5.1</MenuItem>
                <MenuItem value="stereo">English - AAC - Stereo</MenuItem>
              </Select>
            </FormControl>

            {/* Subtitle Selection */}
            <FormControl>
              <InputLabel>Subtitle</InputLabel>
              <Select
                value="none"
                label="Subtitle"
              >
                <MenuItem value="none">No Subtitle</MenuItem>
                <MenuItem value="en">English</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

export default MovieDetails;