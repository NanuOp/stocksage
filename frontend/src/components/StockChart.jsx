import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Bar,
  Legend // Import Legend for chart legend
} from "recharts";
import {
  ToggleButton,
  ToggleButtonGroup,
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  CircularProgress // Import CircularProgress for loading indicator
} from "@mui/material";
import { format, parseISO } from "date-fns";

// Custom Tooltip content - Moved outside StockChart component
const CustomTooltip = ({ active, payload, label, darkChartColors }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ 
        backgroundColor: darkChartColors.tooltipBg, 
        padding: "10px", 
        borderRadius: "6px", 
        boxShadow: "0px 2px 10px rgba(0,0,0,0.3)", 
        border: `1px solid ${darkChartColors.tooltipBorder}`
      }}>
        <p style={{ fontWeight: "bold", marginBottom: "5px", color: darkChartColors.tooltipTextPrimary }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color || darkChartColors.tooltipTextSecondary }}>
            {entry.dataKey === "Close" ? `Price: ₹${entry.value.toFixed(2)}` :
             entry.dataKey === "Volume" ? `Vol: ${entry.value.toLocaleString()}` :
             // Handle MA data keys for tooltip
             entry.dataKey.startsWith("MA") ? `${entry.dataKey}: ₹${entry.value ? entry.value.toFixed(2) : 'N/A'}` :
             `${entry.dataKey}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const StockChart = ({ stockCode, chartBg }) => {
  const [data, setData] = useState([]); // For historical data
  const [intradayData, setIntradayData] = useState([]); // For intraday data
  const [timeframe, setTimeframe] = useState("1Y"); // For historical data timeframe
  const [intradayInterval, setIntradayInterval] = useState('5m'); // State for intraday interval
  const [intradayPeriod, setIntradayPeriod] = useState('1d'); // State for intraday period
  const [showVolume, setShowVolume] = useState(true);
  const [showMA10, setShowMA10] = useState(true);
  const [showMA100, setShowMA100] = useState(true);
  const [tickValues, setTickValues] = useState([]);
  const [activeChartTab, setActiveChartTab] = useState('historical'); // New state for active tab
  const [isLoading, setIsLoading] = useState(true); // Loading state for data fetch
  const [error, setError] = useState(null); // Error state for data fetch

  const API_BASE_URL = "https://94d3be703f4e.ngrok-free.app/api"; // Your backend API base URL

  const darkChartColors = {
    background: chartBg || "#1A1A1D",
    gridStroke: "#404045",
    axisText: "#A0A0A0",
    axisLine: "#404045",
    lineStroke: "#4A3B90", // Darker purple for the main price line
    barFill: "#6A5ACD",
    tooltipBg: "#2C2C30",
    tooltipBorder: "#6A5ACD",
    tooltipTextPrimary: "#E0E0E0",
    tooltipTextSecondary: "#A0A0A0",
    toggleButtonActiveBg: "#6A5ACD",
    toggleButtonActiveText: "#E0E0E0",
    toggleButtonInactiveBg: "#2C2C30",
    toggleButtonInactiveText: "#A0A0A0",
    labelColor: "#E0E0E0",
    ma10Stroke: "#FFA500", // Orange for MA10
    ma100Stroke: "#32CD32", // Lime Green for MA100
    tabBg: "#1A1A1D", // Dark charcoal for tabs
    tabBorder: "#404045", // Border for tabs
    tabActiveBorder: "#6A5ACD", // Active tab border
    tabTextInactive: "#A0A0A0",
    tabTextActive: "#E0E0E0",
  };

  // Mapping for valid intraday periods based on interval
  const intervalPeriods = {
    '1m': ['1d', '5d', '7d'],
    '2m': ['1d', '5d', '7d', '60d'],
    '5m': ['1d', '5d', '7d', '60d'],
    '15m': ['1d', '5d', '7d', '60d'],
    '30m': ['1d', '5d', '7d', '60d', '90d'],
    '60m': ['1d', '5d', '7d', '60d', '90d', '730d'],
    '90m': ['1d', '5d', '7d', '60d', '90d', '730d'],
  };

  useEffect(() => {
    fetchData();
  }, [stockCode, timeframe, activeChartTab, intradayInterval, intradayPeriod]); // Add new dependencies

  // Effect to update intradayPeriod if current period becomes invalid for new interval
  useEffect(() => {
    const validPeriodsForCurrentInterval = intervalPeriods[intradayInterval];
    if (validPeriodsForCurrentInterval && !validPeriodsForCurrentInterval.includes(intradayPeriod)) {
      // If current period is not valid for the new interval, reset to the first valid period
      setIntradayPeriod(validPeriodsForCurrentInterval[0]);
    }
  }, [intradayInterval, intradayPeriod]);


  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (activeChartTab === 'historical') {
        // Fetch historical data (Close, Volume) with timeframe
        const historyUrl = `${API_BASE_URL}/stock/${stockCode}/history/?timeframe=${timeframe}`;
        // Fetch moving averages from the backend
        const maUrl = `${API_BASE_URL}/stock/${stockCode}/moving-averages/?days=1000&format=json`;

        const [historyResponse, maResponse] = await Promise.all([
          axios.get(historyUrl),
          axios.get(maUrl),
        ]);

        let stockData = [];
        if (historyResponse.data.success && historyResponse.data.data) {
          stockData = historyResponse.data.data.map(item => ({
            Date: item.Date,
            Close: parseFloat(item.Close),
            Volume: parseFloat(item.Volume),
          }));
        } else {
          console.warn("API returned success: false for historical data or no data.");
        }

        let maData = [];
        if (maResponse.data.success && maResponse.data.data) {
          maData = maResponse.data.data.map(item => ({
            Date: item.Date,
            MA10: item.MA10 ? parseFloat(item.MA10) : null,
            MA100: item.MA100 ? parseFloat(item.MA100) : null,
          }));
        } else {
          console.warn("API returned success: false for moving averages or no data.");
        }

        // Merge historical data and MA data
        const mergedData = stockData.map(stockItem => {
          const maItem = maData.find(ma => ma.Date === stockItem.Date);
          return {
            ...stockItem,
            ...(maItem || {}), // Merge MA data if found, otherwise an empty object
          };
        });

        let finalData = mergedData.sort((a, b) => new Date(a.Date) - new Date(b.Date));
        
        setData(finalData);
        setIntradayData([]); // Clear intraday data when switching to historical
        updateTickValues(finalData, 'historical');

      } else if (activeChartTab === 'intraday') {
        // Fetch intraday data using selected interval and period
        const intradayUrl = `${API_BASE_URL}/stock/${stockCode}/intraday/?format=json&interval=${intradayInterval}&period=${intradayPeriod}`;
        const intradayResponse = await axios.get(intradayUrl);

        if (intradayResponse.data.success && intradayResponse.data.data) {
          const processedIntradayData = intradayResponse.data.data.map(item => ({
            // Rename Datetime to Date for consistency with XAxis dataKey
            Date: item.Datetime,
            Close: parseFloat(item.Close),
            Volume: parseFloat(item.Volume),
            // Include Open, High, Low if needed for future candlestick charts
            Open: parseFloat(item.Open),
            High: parseFloat(item.High),
            Low: parseFloat(item.Low),
          }));
          // Sort by Datetime
          processedIntradayData.sort((a, b) => new Date(a.Date) - new Date(b.Date));
          setIntradayData(processedIntradayData);
          setData([]); // Clear historical data when switching to intraday
          updateTickValues(processedIntradayData, 'intraday');
        } else {
          console.warn("API returned success: false for intraday data or no data.");
          setIntradayData([]);
        }
      }
    } catch (error) {
      console.error("Error fetching chart data:", error);
      setError("Failed to load chart data. Please try again later.");
      setData([]);
      setIntradayData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTickValues = (chartData, type) => {
    if (chartData.length === 0) return setTickValues([]);
    let totalTicks = 5; // Default for historical
    if (type === 'intraday') {
        // For intraday, adjust tick count for better readability of time
        totalTicks = Math.min(chartData.length, 6); // E.g., show up to 6 ticks for intraday
    }
    const step = Math.floor(chartData.length / (totalTicks - 1));
    const selectedTicks = Array.from({ length: totalTicks }, (_, i) =>
      chartData[Math.min(i * step, chartData.length - 1)].Date
    );
    setTickValues(selectedTicks);
  };

  const formatXAxis = (tick) => {
    if (activeChartTab === 'historical') {
      // For historical data, format as Month Year
      return format(parseISO(tick), "MMM yyyy");
    } else {
      // For intraday data, format as Hour:Minute
      const date = parseISO(tick); // parseISO handles timezone offset
      if (isNaN(date.getTime())) return tick; // Fallback if parsing fails
      return format(date, "HH:mm");
    }
  };

  const currentChartData = activeChartTab === 'historical' ? data : intradayData;

  return (
    <Box sx={{ 
      textAlign: "center", 
      padding: 3, 
      bgcolor: darkChartColors.background,
      borderRadius: 2,
      color: darkChartColors.background,
    }}>
      
      {/* Tab Selector for Historical/Intraday */}
      <Box sx={{ display: 'flex', width: '100%', mb: 3 }}>
        <Box
          onClick={() => setActiveChartTab('historical')}
          sx={{
            flex: 1,
            textAlign: 'center',
            py: 1.5,
            cursor: 'pointer',
            bgcolor: darkChartColors.tabBg,
            borderBottom: activeChartTab === 'historical' ? `2px solid ${darkChartColors.tabActiveBorder}` : `1px solid ${darkChartColors.tabBorder}`,
            transition: 'border-bottom 0.3s ease, background-color 0.3s ease',
            '&:hover': {
              bgcolor: darkChartColors.toggleButtonInactiveBg, // Slightly lighter on hover
            }
          }}
        >
          <Typography 
            variant="subtitle1" 
            fontWeight="bold" 
            sx={{ color: activeChartTab === 'historical' ? darkChartColors.tabTextActive : darkChartColors.tabTextInactive }}
          >
            Historical
          </Typography>
        </Box>
        <Box
          onClick={() => setActiveChartTab('intraday')}
          sx={{
            flex: 1,
            textAlign: 'center',
            py: 1.5,
            cursor: 'pointer',
            bgcolor: darkChartColors.tabBg,
            borderBottom: activeChartTab === 'intraday' ? `2px solid ${darkChartColors.tabActiveBorder}` : `1px solid ${darkChartColors.tabBorder}`,
            transition: 'border-bottom 0.3s ease, background-color 0.3s ease',
            '&:hover': {
              bgcolor: darkChartColors.toggleButtonInactiveBg, // Slightly lighter on hover
            }
          }}
        >
          <Typography 
            variant="subtitle1" 
            fontWeight="bold" 
            sx={{ color: activeChartTab === 'intraday' ? darkChartColors.tabTextActive : darkChartColors.tabTextInactive }}
          >
            Intraday
          </Typography>
        </Box>
      </Box>

      {/* Chart Container */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Left Y-Axis Label */}
        {showVolume && (
          <Typography sx={{ 
            transform: "rotate(-90deg)", 
            whiteSpace: "nowrap", 
            fontSize: 20, 
            fontWeight: "bold", 
            color: darkChartColors.labelColor, 
            marginRight: 1 
          }}>
            Volume
          </Typography>
        )}

        <ResponsiveContainer width="90%" height={500}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress sx={{ color: darkChartColors.headerAccent }} />
              <Typography variant="body2" sx={{ ml: 2, color: darkChartColors.axisText }}>Loading chart data...</Typography>
            </Box>
          ) : error ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'error.main' }}>
              <Typography variant="body1">{error}</Typography>
            </Box>
          ) : currentChartData.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: darkChartColors.axisText }}>
              <Typography variant="body1">No data available for the selected period.</Typography>
            </Box>
          ) : (
            <ComposedChart data={currentChartData} style={{ background: darkChartColors.background }}>
              <CartesianGrid stroke={darkChartColors.gridStroke} strokeWidth={1} opacity={0.8} vertical={false} />

              <XAxis
                dataKey="Date"
                ticks={tickValues}
                tickFormatter={formatXAxis}
                tick={{ fill: darkChartColors.axisText, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: darkChartColors.axisLine }}
              />

              {showVolume && (
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  tick={{ fill: darkChartColors.axisText, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
              )}

              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: darkChartColors.axisText, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />

              <Tooltip content={<CustomTooltip darkChartColors={darkChartColors} />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} /> {/* Add Legend component */}

              {showVolume && <Bar yAxisId="left" dataKey="Volume" fill={darkChartColors.barFill} opacity={0.15} name="Volume" barSize={4} />}
              <Line yAxisId="right" type="monotone" dataKey="Close" stroke={darkChartColors.lineStroke} strokeWidth={3} dot={false} name="Price (₹)" />
              
              {/* Moving Average Lines (only for historical data) */}
              {showMA10 && activeChartTab === 'historical' && <Line yAxisId="right" type="monotone" dataKey="MA10" stroke={darkChartColors.ma10Stroke} strokeWidth={2} dot={false} name="MA10" />}
              {showMA100 && activeChartTab === 'historical' && <Line yAxisId="right" type="monotone" dataKey="MA100" stroke={darkChartColors.ma100Stroke} strokeWidth={2} dot={false} name="MA100" />}

            </ComposedChart>
          )}
        </ResponsiveContainer>

        {/* Right Y-Axis Label */}
        <Typography sx={{ 
          transform: "rotate(90deg)", 
          whiteSpace: "nowrap", 
          fontSize: 20, 
          fontWeight: "bold", 
          color: darkChartColors.labelColor, 
          marginLeft: 1 
        }}>
          Price (₹)
        </Typography>
      </Box>

      {/* Controls at bottom right */}
      <Box sx={{ 
        display: "flex", 
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 2, 
        marginTop: 2,
        flexWrap: 'wrap'
      }}>
        {/* Timeframe Selector (only for historical data) */}
        {activeChartTab === 'historical' && (
          <ToggleButtonGroup
            value={timeframe}
            exclusive
            onChange={(event, newValue) => newValue && setTimeframe(newValue)}
            sx={{ 
              display: "flex", 
              flexWrap: 'wrap',
              justifyContent: "flex-end",
              '& .MuiToggleButtonGroup-grouped': {
                borderRadius: '0 !important',
                border: `1px solid ${darkChartColors.gridStroke} !important`,
                margin: '0 !important',
              }
            }}
          >
            {["1D", "1W", "1M", "6M", "1Y", "3Y", "5Y", "MAX"].map((option) => (
              <ToggleButton
                key={option}
                value={option}
                sx={{
                  textTransform: "none",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: darkChartColors.toggleButtonInactiveText,
                  bgcolor: darkChartColors.toggleButtonInactiveBg,
                  "&.Mui-selected": { 
                    bgcolor: darkChartColors.toggleButtonActiveBg, 
                    color: darkChartColors.toggleButtonActiveText,
                    '&:hover': {
                      bgcolor: darkChartColors.toggleButtonActiveBg, 
                    }
                  },
                  "&:hover": {
                    bgcolor: darkChartColors.toggleButtonInactiveBg, 
                  },
                  minWidth: '40px',
                  padding: '4px 8px',
                }}
              >
                {option}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}

        {/* Intraday Interval Selector (only for intraday data) */}
        {activeChartTab === 'intraday' && (
          <ToggleButtonGroup
            value={intradayInterval}
            exclusive
            onChange={(event, newValue) => newValue && setIntradayInterval(newValue)}
            sx={{ 
              display: "flex", 
              flexWrap: 'wrap',
              justifyContent: "flex-end",
              '& .MuiToggleButtonGroup-grouped': {
                borderRadius: '0 !important',
                border: `1px solid ${darkChartColors.gridStroke} !important`,
                margin: '0 !important',
              }
            }}
          >
            {['1m', '2m', '5m', '15m', '30m', '60m', '90m'].map((option) => (
              <ToggleButton
                key={option}
                value={option}
                sx={{
                  textTransform: "none",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: darkChartColors.toggleButtonInactiveText,
                  bgcolor: darkChartColors.toggleButtonInactiveBg,
                  "&.Mui-selected": { 
                    bgcolor: darkChartColors.toggleButtonActiveBg, 
                    color: darkChartColors.toggleButtonActiveText,
                    '&:hover': {
                      bgcolor: darkChartColors.toggleButtonActiveBg, 
                    }
                  },
                  "&:hover": {
                    bgcolor: darkChartColors.toggleButtonInactiveBg, 
                  },
                  minWidth: '40px',
                  padding: '4px 8px',
                }}
              >
                {option}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}

        {/* Intraday Period Selector (only for intraday data) */}
        {activeChartTab === 'intraday' && (
          <ToggleButtonGroup
            value={intradayPeriod}
            exclusive
            onChange={(event, newValue) => newValue && setIntradayPeriod(newValue)}
            sx={{ 
              display: "flex", 
              flexWrap: 'wrap',
              justifyContent: "flex-end",
              '& .MuiToggleButtonGroup-grouped': {
                borderRadius: '0 !important',
                border: `1px solid ${darkChartColors.gridStroke} !important`,
                margin: '0 !important',
              }
            }}
          >
            {intervalPeriods[intradayInterval]?.map((option) => (
              <ToggleButton
                key={option}
                value={option}
                sx={{
                  textTransform: "none",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: darkChartColors.toggleButtonInactiveText,
                  bgcolor: darkChartColors.toggleButtonInactiveBg,
                  "&.Mui-selected": { 
                    bgcolor: darkChartColors.toggleButtonActiveBg, 
                    color: darkChartColors.toggleButtonActiveText,
                    '&:hover': {
                      bgcolor: darkChartColors.toggleButtonActiveBg, 
                    }
                  },
                  "&:hover": {
                    bgcolor: darkChartColors.toggleButtonInactiveBg, 
                  },
                  minWidth: '40px',
                  padding: '4px 8px',
                }}
              >
                {option}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}

        {/* Checkbox for Volume */}
        <FormControlLabel 
          control={
            <Checkbox 
              checked={showVolume} 
              onChange={() => setShowVolume(!showVolume)} 
              sx={{ 
                color: darkChartColors.axisText, 
                padding: '4px'
              }} 
            />
          } 
          label={
            <Typography sx={{ color: darkChartColors.axisText, fontSize: "14px" }}>Volume</Typography> 
          } 
          sx={{ 
            marginRight: 0, 
            marginLeft: 1
          }} 
        />

        {/* Checkboxes for Moving Averages (only for historical data) */}
        {activeChartTab === 'historical' && (
          <>
            <FormControlLabel 
              control={<Checkbox checked={showMA10} onChange={() => setShowMA10(!showMA10)} sx={{ color: darkChartColors.ma10Stroke, padding: '4px' }} />}
              label={<Typography sx={{ color: darkChartColors.ma10Stroke, fontSize: 14 }}>MA10</Typography>}
              sx={{ marginRight: 0, marginLeft: 1 }}
            />
            <FormControlLabel 
              control={<Checkbox checked={showMA100} onChange={() => setShowMA100(!showMA100)} sx={{ color: darkChartColors.ma100Stroke, padding: '4px' }} />}
              label={<Typography sx={{ color: darkChartColors.ma100Stroke, fontSize: 14 }}>MA100</Typography>}
              sx={{ marginRight: 0, marginLeft: 1 }}
            />
          </>
        )}
      </Box>
    </Box>
  );
};

export default StockChart;
