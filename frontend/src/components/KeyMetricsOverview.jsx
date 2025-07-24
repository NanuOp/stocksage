import React from 'react';
import { Box, Card, Typography, Grid } from '@mui/material';

const KeyMetricsOverview = ({ stockData, colors }) => {
  return (
    <Card sx={{ 
      mb: 3, 
      p: { xs: 2, sm: 3 }, 
      bgcolor: colors.cardBg, 
      borderRadius: 3,
      boxShadow: 0, 
      border: `1px solid ${colors.divider}` 
    }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: colors.headerAccent, mb: 2 }}>
        Key Metrics Overview
      </Typography>
      <Grid container spacing={{ xs: 1, sm: 2 }}>
        <Grid item xs={6} sm={3}>
          <Box sx={{ p: 1.5, bgcolor: colors.background, borderRadius: 3, border: `1px solid ${colors.divider}` }}>
            <Typography variant="caption" sx={{ color: colors.textSecondary }}>Market Cap</Typography>
            <Typography variant="body1" fontWeight="medium" sx={{ color: colors.textPrimary }}>
              {stockData.marketCap ? `₹ ${stockData.marketCap.toLocaleString()}` : 'N/A'}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box sx={{ p: 1.5, bgcolor: colors.background, borderRadius: 3, border: `1px solid ${colors.divider}` }}>
            <Typography variant="caption" sx={{ color: colors.textSecondary }}>P/E Ratio</Typography>
            <Typography variant="body1" fontWeight="medium" sx={{ color: colors.textPrimary }}>
              {stockData.trailingPE ? stockData.trailingPE.toFixed(2) : 'N/A'}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box sx={{ p: 1.5, bgcolor: colors.background, borderRadius: 3, border: `1px solid ${colors.divider}` }}>
            <Typography variant="caption" sx={{ color: colors.textSecondary }}>Dividend Yield</Typography>
            <Typography variant="body1" fontWeight="medium" sx={{ color: colors.textPrimary }}>
              {stockData.dividendYield ? `${(stockData.dividendYield * 100).toFixed(2)}%` : 'N/A'}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box sx={{ p: 1.5, bgcolor: colors.background, borderRadius: 3, border: `1px solid ${colors.divider}` }}>
            <Typography variant="caption" sx={{ color: colors.textSecondary }}>Profit Margins</Typography>
            <Typography variant="body1" fontWeight="medium" sx={{ color: colors.textPrimary }}>
              {stockData.profitMargins ? `${(stockData.profitMargins * 100).toFixed(2)}%` : 'N/A'}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Card>
  );
};

export default KeyMetricsOverview;
