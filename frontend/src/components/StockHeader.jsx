import { Box, Typography } from '@mui/material';
import { format, parseISO } from 'date-fns'; // Added parseISO to the import

const StockHeader = ({ stockData, colors }) => {
  const formatTimestamp = (dateString) => {
    try {
      const date = parseISO(dateString);
      if (isNaN(date.getTime())) {
        const parts = dateString.match(/(\d{2})-(\w{3})-(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
        if (parts) {
          const months = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
          };
          const d = new Date(parts[3], months[parts[2]], parts[1], parts[4], parts[5], parts[6]);
          return format(d, 'MMM dd, yyyy HH:mm:ss zzz');
        }
        const simpleDateTimeParts = dateString.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
        if (simpleDateTimeParts) {
            const d = new Date(simpleDateTimeParts[1]);
            return format(d, 'MMM dd, yyyy HH:mm:ss zzz');
        }
        return dateString;
      }
      return format(date, 'MMM dd, yyyy HH:mm:ss zzz');
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return dateString;
    }
  };

  return (
    <Box sx={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "flex-start", 
      mb: 4, 
      p: { xs: 2, sm: 3 }, 
      bgcolor: colors.background, 
      borderRadius: 3,
    }}>
      <Typography variant="h3" fontWeight="bold" gutterBottom sx={{ color: colors.textPrimary, fontSize: { xs: '2rem', sm: '3rem' } }}>
        {stockData.longName} ({stockData.symbol})
      </Typography>
      <Typography
        variant="h5"
        sx={{ 
          color: stockData.change?.startsWith("+") ? colors.positiveTrend : colors.negativeTrend, 
          mb: 1,
          fontWeight: "bold",
          fontSize: { xs: '1.5rem', sm: '2rem' }
        }}
      >
        ₹ {Number(stockData.realTimePrice).toFixed(2)} 
        &nbsp;({stockData.change} / {stockData.pChange})
      </Typography>
      <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>
        Updated on: {formatTimestamp(stockData.updatedOn)}
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, mt: 1, flexWrap: 'wrap' }}>
        {stockData.fiftyTwoWeekHigh && (
          <Typography variant="body2" sx={{ color: colors.textSecondary, fontWeight: 'medium' }}>
            52-Week High: <span style={{ color: colors.positiveTrend }}>₹ {Number(stockData.fiftyTwoWeekHigh).toFixed(2)}</span>
          </Typography>
        )}
        {stockData.fiftyTwoWeekLow && (
          <Typography variant="body2" sx={{ color: colors.textSecondary, fontWeight: 'medium' }}>
            52-Week Low: <span style={{ color: colors.negativeTrend }}>₹ {Number(stockData.fiftyTwoWeekLow).toFixed(2)}</span>
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default StockHeader;
