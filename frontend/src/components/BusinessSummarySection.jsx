import React from 'react';
import { Box, Card, Typography, Grid } from '@mui/material';

const BusinessSummarySection = ({ stockData, colors }) => {
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
          {stockData.longBusinessSummary || 
            `${stockData.longName}, together with its subsidiaries, provides consulting, technology, outsourcing, and next-generation digital services.`}
        </Typography>
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
    </Grid>
  );
};

export default BusinessSummarySection;
