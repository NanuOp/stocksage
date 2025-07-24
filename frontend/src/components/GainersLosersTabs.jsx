import React, { useState } from 'react';
import { Box, Card, Typography, CircularProgress } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'; // Corrected import for ArrowForwardIcon

// Helper component to render Gainer/Loser lists
const GainerLoserList = ({ data, isGainer, onStockClick, colors }) => (
  <Box sx={{ 
    maxHeight: 400, 
    overflowY: 'auto',
    "&::-webkit-scrollbar": { width: "8px" },
    "&::-webkit-scrollbar-track": { 
      backgroundColor: colors.background, 
      borderRadius: "10px"
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: colors.divider, 
      borderRadius: "10px",
      "&:hover": { backgroundColor: colors.headerAccent } 
    },
    py: 1, 
    px: 1 
  }}>
    {data.length > 0 ? (
      data.map((stock, index) => (
        <Box 
          key={index}
          onClick={() => onStockClick(stock.symbol)}
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            py: 1.5, 
            px: 2, 
            mb: 1, 
            bgcolor: colors.background,
            borderRadius: 3,
            boxShadow: 0,
            border: `1px solid ${colors.divider}`,
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
            <Typography variant="body2" fontWeight="medium" sx={{ color: colors.textPrimary }}>
              {stock.symbol} 
            </Typography>
            {(stock.highPrice !== null && !isNaN(stock.highPrice) && stock.lowPrice !== null && !isNaN(stock.lowPrice)) && (
              <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                H: ₹{Number(stock.highPrice).toFixed(2)} | L: ₹{Number(stock.lowPrice).toFixed(2)}
              </Typography>
            )}
          </Box>
          <Box sx={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" fontWeight="bold" sx={{ color: colors.textPrimary }}>
              ₹{Number(isGainer ? stock.lastPrice : stock.ltp).toFixed(2)} 
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: (isGainer && parseFloat(stock.pChange) > 0) || (!isGainer && parseFloat(stock.perChange) > 0) ? colors.positiveTrend : colors.negativeTrend, 
                fontWeight: 'bold' 
              }}
            >
              {parseFloat(isGainer ? stock.pChange : stock.perChange) > 0 ? `+${isGainer ? stock.pChange : stock.perChange}` : (isGainer ? stock.pChange : stock.perChange)}
            </Typography>
            <ArrowForwardIcon sx={{ color: colors.textSecondary, fontSize: 'small' }} />
          </Box>
        </Box>
      ))
    ) : (
      <Typography variant="body2" sx={{ textAlign: 'center', py: 2, color: colors.textSecondary }}>
        No data available.
      </Typography>
    )}
  </Box>
);

const GainersLosersTabs = ({ topGainers, topLosers, isLoadingGainersLosers, colors, handleStockClick }) => {
  const [activeTab, setActiveTab] = useState('gainers');

  return (
    <>
      <Typography variant="h6" fontWeight="bold" color="white" sx={{px: 2, mb: 1.5}}>
        Top Gainers & Losers
      </Typography>
      <Card sx={{ 
        mb: 3,
        overflow: "hidden",
        bgcolor: colors.cardBg, 
        borderRadius: 4,
        boxShadow: 0, 
        flexGrow: 1
      }}>
        <Box sx={{ display: 'flex', borderBottom: `1px solid ${colors.divider}`, borderRadius: 6 }}>
          <Box 
            onClick={() => setActiveTab('gainers')}
            sx={{
              flex: 1,
              textAlign: 'center',
              py: 2,
              cursor: 'pointer',
              bgcolor: activeTab === 'gainers' ? colors.background : "#1A1A1D", 
              borderBottom: activeTab === 'gainers' ? `1px solid ${colors.headerAccent}` : 'none',
              transition: 'background-color 0.3s ease' 
            }}
          >
            <Typography 
              variant="h6" 
              fontWeight="bold" 
              sx={{ color: activeTab === 'gainers' ? colors.headerAccent : colors.textSecondary }}
            >
              Gainers
            </Typography>
          </Box>
          <Box 
            onClick={() => setActiveTab('losers')}
            sx={{
              flex: 1,
              textAlign: 'center',
              py: 2,
              cursor: 'pointer',
              bgcolor: activeTab === 'losers' ? colors.background : "#1A1A1D",
              borderBottom: activeTab === 'losers' ? `1px solid ${colors.headerAccent}` : 'none',
              transition: 'background-color 0.3s ease' 
            }}
          >
            <Typography 
              variant="h6" 
              fontWeight="bold" 
              sx={{ color: activeTab === 'losers' ? colors.headerAccent : colors.textSecondary }}
            >
              Losers
            </Typography>
          </Box>
        </Box>

        {isLoadingGainersLosers ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: colors.headerAccent }} />
          </Box>
        ) : (
          <Box sx={{ bgcolor: colors.cardBg }}> 
            {activeTab === 'gainers' ? (
              <GainerLoserList data={topGainers} isGainer={true} onStockClick={handleStockClick} colors={colors} />
            ) : (
              <GainerLoserList data={topLosers} isGainer={false} onStockClick={handleStockClick} colors={colors} />
            )}
          </Box>
        )}
      </Card>
    </>
  );
};

export default GainersLosersTabs;
