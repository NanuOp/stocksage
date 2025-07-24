import React from 'react';
import { Box, Card, Typography, Grid } from '@mui/material';

const KeyMetricsOverview = ({ stockData, colors }) => {
  // Assuming stockData contains the necessary metrics
  const metrics = [
    { label: "Prev Close", value: stockData.regularMarketPreviousClose?.toFixed(2) },
    { label: "Open", value: stockData.regularMarketOpen?.toFixed(2) },
    { label: "24H Volume", value: stockData.regularMarketVolume?.toLocaleString() },
    { label: "Market Cap", value: stockData.marketCap?.toLocaleString() },
    { label: "P/E Ratio", value: stockData.trailingPE?.toFixed(2) },
    { label: "Dividend Yield", value: stockData.dividendYield ? `${(stockData.dividendYield * 100).toFixed(2)}%` : 'N/A' },
    { label: "Day Range", value: `${stockData.dayLow?.toFixed(2)} - ${stockData.dayHigh?.toFixed(2)}` },
    { label: "52W Range", value: `${stockData.fiftyTwoWeekLow?.toFixed(2)} - ${stockData.fiftyTwoWeekHigh?.toFixed(2)}` },
    // Add more metrics as needed, similar to how they are processed in StockDetailsPage
  ].filter(item => item.value !== 'N/A' && item.value !== 'NaN'); // Filter out invalid data

  return (
    <Grid item xs={12} md={12}>
      {/* Updated Typography for the title */}
      <Typography variant="h6" fontWeight="bold" color="white" sx={{ px: 2, mb: 1.5 }}>
        Key Metrics 
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
        <Grid container spacing={2}>
          {metrics.map((metric, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <Box sx={{ p: 1.5, bgcolor: colors.background, borderRadius: 3, boxShadow: 0, border: `1px solid ${colors.divider}` }}>
                <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>{metric.label}</Typography>
                <Typography variant="body1" fontWeight="medium" sx={{ color: colors.textPrimary }}>{metric.value}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Card>
    </Grid>
  );
};

export default KeyMetricsOverview;
