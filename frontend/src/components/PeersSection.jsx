import React from 'react';
import { Box, Card, CardContent, Typography, Grid, CircularProgress, IconButton } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const PeersSection = ({ peersData, isLoadingPeers, colors, handleStockClick }) => {
  return (
    <>
      <Typography variant="h6" fontWeight="bold" color="white" sx={{px: 2, mb: 1.5}}>
        Peers
      </Typography>
      <Card sx={{ 
        mb: 3,
        overflow: "hidden",
        bgcolor: colors.cardBg, 
        borderRadius: 3,
        boxShadow: 0, 
        border: `1px solid ${colors.divider}`,
        flexGrow: 1
      }}>
        <CardContent sx={{ p: 3, borderRadius: 3, minHeight: 150 }}>
          {isLoadingPeers ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: colors.headerAccent }} />
            </Box>
          ) : peersData.length > 0 ? (
            <Grid container spacing={0} columns={{ xs: 1, sm: 2 }}> 
              {peersData.map((peer, index) => (
                <Grid item xs={1} sm={1} key={index}> 
                  <Box 
                    onClick={() => handleStockClick(peer.symbol)} 
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      bgcolor: colors.cardBg,
                      py: 1.5, 
                      px: 1, 
                      borderBottom: `1px solid ${colors.divider}`, 
                      color: colors.textPrimary,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s, transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                      '&:hover': { 
                        bgcolor: colors.background,
                        transform: 'translateY(-2px)', 
                        boxShadow: 3,
                        border: `1px solid ${colors.headerAccent}` 
                      }
                    }}
                  >
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" fontWeight="medium" sx={{ color: colors.textPrimary }}>{peer.symbol}</Typography>
                      <Typography variant="caption" sx={{ color: colors.textSecondary }}>{peer.name}</Typography>
                    </Box>
                    <ArrowForwardIcon sx={{ color: colors.textSecondary, fontSize: 'small' }} /> 
                  </Box>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography variant="body2" sx={{ textAlign: 'center', py: 2, color: colors.textSecondary }}>
              No peer data available.
            </Typography>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default PeersSection;
