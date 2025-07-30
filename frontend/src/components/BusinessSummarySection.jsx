import React, { useState } from 'react';
import { Box, Card, Typography, Grid, Button, Modal, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const BusinessSummarySection = ({ stockData, colors }) => {
  const [openModal, setOpenModal] = useState(false);
  const summaryText = stockData.longBusinessSummary || 
    `${stockData.longName}, `;
  
  const MAX_SUMMARY_LENGTH = 300; // Define a character limit for truncation
  const isTruncated = summaryText.length > MAX_SUMMARY_LENGTH;
  // displayedSummary should always be the truncated version if isTruncated is true
  // The full summary is now displayed in the modal
  const displayedSummary = isTruncated ? summaryText.substring(0, MAX_SUMMARY_LENGTH) + '...' : summaryText;

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  return (
    <Grid item xs={12} md={12}>
      <Typography variant="h6" fontWeight="bold" color="white" sx={{px: 2, mb: 1.5}}>
        Business Summary
      </Typography>
      <Card sx={{ 
        mb: 3,
        overflow: "hidden",
        p: 3, 
        bgcolor: colors.cardBg, 
        borderRadius: 3,
        boxShadow: 0, 
        border: `1px solid ${colors.divider}`, 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <Typography variant="body1" sx={{ lineHeight: 1.7, color: colors.textPrimary }}>
          {displayedSummary}
        </Typography>
        {isTruncated && (
          <Button
            onClick={handleOpenModal} // Changed to open modal
            sx={{
              mt: 2,
              alignSelf: 'flex-start', // Align button to the left
              color: colors.headerAccent,
              fontWeight: 'bold',
              textTransform: 'none', // Prevent uppercase transformation
              '&:hover': {
                bgcolor: 'rgba(106, 90, 205, 0.1)', // Light hover background
              },
            }}
          >
            Read More
          </Button>
        )}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6}> 
            <Box sx={{ p: 1.5, bgcolor: colors.background, borderRadius: 3, boxShadow: 0, border: `1px solid ${colors.divider}` }}>
              <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Industry</Typography>
              <Typography variant="body1" fontWeight="medium" sx={{ color: colors.textPrimary }}>{stockData.industry || "Information Technology Services"}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 1.5, bgcolor: colors.background, borderRadius: 3, boxShadow: 0, border: `1px solid ${colors.divider}` }}>
              <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Sector</Typography>
              <Typography variant="body1" fontWeight="medium" sx={{ color: colors.textPrimary }}>{stockData.sector || "Technology"}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 1.5, bgcolor: colors.background, borderRadius: 3, boxShadow: 0, border: `1px solid ${colors.divider}` }}>
              <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Employees</Typography>
              <Typography variant="body1" fontWeight="medium" sx={{ color: colors.textPrimary }}>{stockData.fullTimeEmployees?.toLocaleString() || "Unknown"}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 1.5, bgcolor: colors.background, borderRadius: 3, boxShadow: 0, border: `1px solid ${colors.divider}` }}>
              <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Website</Typography>
              <Typography variant="body1" fontWeight="medium" sx={{ 
                overflow: "hidden", 
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}>
                <a href={stockData.website} target="_blank" rel="noopener noreferrer" style={{ color: colors.headerAccent }}>
                  {stockData.website || "https://www.company.com"}
                </a>
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Card>

      <Modal
        open={openModal}
        onClose={handleCloseModal}
        aria-labelledby="business-summary-modal-title"
        aria-describedby="business-summary-modal-description"
        BackdropProps={{
          sx: {
            backdropFilter: 'blur(3px)', // Apply blur effect to the backdrop
            backgroundColor: 'rgba(0, 0, 0, 0.5)', // Optional: darken the background slightly
          },
        }}
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: '70%', md: '50%' },
          bgcolor: colors.cardBg,
          border: `1px solid ${colors.divider}`,
          boxShadow: 24,
          p: 4,
          borderRadius: 3,
          maxHeight: '80vh', // Limit height
          overflowY: 'auto', // Enable scrolling within modal
          color: colors.textPrimary,
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography id="business-summary-modal-title" variant="h6" component="h2" fontWeight="bold" sx={{ color: "white" }}>
              Business Summary
            </Typography>
            <IconButton onClick={handleCloseModal} sx={{ color: colors.textSecondary }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography id="business-summary-modal-description" sx={{ mt: 2, lineHeight: 1.7, color: colors.textPrimary }}>
            {summaryText}
          </Typography>
        </Box>
      </Modal>
    </Grid>
  );
};

export default BusinessSummarySection;
