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
} from "recharts";
import {
  ToggleButton,
  ToggleButtonGroup,
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { format, parseISO } from "date-fns";

const StockChart = ({ stockCode, chartBg }) => {
  const [data, setData] = useState([]);
  const [timeframe, setTimeframe] = useState("1Y");
  const [showVolume, setShowVolume] = useState(true);
  const [showMA10, setShowMA10] = useState(false);
  const [showMA50, setShowMA50] = useState(false);
  const [showMA100, setShowMA100] = useState(false);
  const [tickValues, setTickValues] = useState([]);

  const API_BASE_URL = "http://127.0.0.1:8000/api"; // Your backend API base URL

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
    ma10Stroke: "#FFD700", // Gold for MA10
    ma50Stroke: "#00CED1", // Dark Cyan for MA50
    ma100Stroke: "#FF6347", // Tomato for MA100
  };

  useEffect(() => {
    fetchData();
  }, [stockCode, timeframe]);

  // Function to calculate Simple Moving Average (SMA) client-side
  // This will be used for MA50 if the backend doesn't provide it
  const calculateSMA = (data, period, dataKey = 'Close', newMAKey) => {
    if (!data || data.length === 0) return data; // Return original data if empty

    const processedData = data.map(item => ({ ...item })); // Create a deep copy to avoid modifying original

    for (let i = 0; i < processedData.length; i++) {
      if (i >= period - 1) {
        const sum = processedData.slice(i - period + 1, i + 1).reduce((acc, item) => acc + item[dataKey], 0);
        processedData[i][newMAKey] = sum / period;
      } else {
        processedData[i][newMAKey] = null; // MA is null until enough data points are available
      }
    }
    return processedData;
  };

  const fetchData = async () => {
    try {
      // 1. Fetch historical data (Close, Volume)
      const historyUrl = `${API_BASE_URL}/stock/${stockCode}/history/?timeframe=${timeframe}`;
      const historyResponse = await axios.get(historyUrl);
      let stockData = [];

      if (historyResponse.data.success && historyResponse.data.data) {
        stockData = historyResponse.data.data
          .map((item) => ({
            Date: item.Date,
            Close: parseFloat(item.Close),
            Volume: parseFloat(item.Volume),
          }))
          .filter((item) => item.Date && !isNaN(item.Close));
      } else {
        console.warn("API returned success: false for historical data or no data.");
      }

      // 2. Fetch moving averages from the new endpoint
      // Assuming this endpoint returns MA10, MA20, MA100 as per your JSON example
      const maUrl = `${API_BASE_URL}/stock/${stockCode}/moving-averages/?days=100&timeframe=${timeframe}`; // Added timeframe for consistency
      const maResponse = await axios.get(maUrl);
      let maData = [];

      if (maResponse.data.success && maResponse.data.data) {
        maData = maResponse.data.data.map(item => ({
          Date: item.Date,
          MA10: item.MA10 ? parseFloat(item.MA10) : null,
          MA20: item.MA20 ? parseFloat(item.MA20) : null, // Keep MA20 for reference if needed
          MA100: item.MA100 ? parseFloat(item.MA100) : null,
        })).filter(item => item.Date);
      } else {
        console.warn("API returned success: false for moving averages or no data.");
      }

      // 3. Merge historical data and MA data
      // Use a map for efficient merging by Date
      const mergedDataMap = new Map();

      stockData.forEach(item => {
        mergedDataMap.set(item.Date, { ...item });
      });

      maData.forEach(item => {
        const existing = mergedDataMap.get(item.Date);
        if (existing) {
          mergedDataMap.set(item.Date, { ...existing, ...item });
        } else {
          // If MA data has a date not in history (less common but possible), add it
          mergedDataMap.set(item.Date, { ...item });
        }
      });

      let finalData = Array.from(mergedDataMap.values()).sort((a, b) => new Date(a.Date) - new Date(b.Date));

      // 4. Calculate MA50 client-side if not provided by backend
      // Check if MA50 key exists in the first non-null MA entry
      const hasMA50FromBackend = finalData.some(item => item.MA50 !== undefined && item.MA50 !== null);

      if (!hasMA50FromBackend) {
        finalData = calculateSMA(finalData, 50, 'Close', 'MA50');
      }
      
      setData(finalData);
      updateTickValues(finalData);

    } catch (error) {
      console.error("Error fetching chart data:", error);
      setData([]);
    }
  };

  const updateTickValues = (data) => {
    if (data.length === 0) return setTickValues([]);
    const totalTicks = 5;
    const step = Math.floor(data.length / (totalTicks - 1));
    const selectedTicks = Array.from({ length: totalTicks }, (_, i) =>
      data[Math.min(i * step, data.length - 1)].Date
    );
    setTickValues(selectedTicks);
  };

  const formatXAxis = (tick) => format(parseISO(tick), "MMM yyyy");

  // Custom Tooltip content
  const CustomTooltip = ({ active, payload, label }) => {
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
               entry.dataKey.startsWith("MA") ? `${entry.dataKey}: ₹${entry.value ? entry.value.toFixed(2) : 'N/A'}` :
               `${entry.dataKey}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Box sx={{ 
      textAlign: "center", 
      padding: 3, 
      bgcolor: "#1A1A1D",
      borderRadius: 2,
      color: "#1A1A1D",
    }}>
      
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
          <ComposedChart data={data} style={{ background: darkChartColors.background }}>
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

            <Tooltip content={<CustomTooltip />} />

            {showVolume && <Bar yAxisId="left" dataKey="Volume" fill={darkChartColors.barFill} opacity={0.15} name="Volume" barSize={4} />}
            <Line yAxisId="right" type="monotone" dataKey="Close" stroke={darkChartColors.lineStroke} strokeWidth={3} dot={false} name="Price (₹)" />
            
            {/* Moving Average Lines */}
            {showMA10 && <Line yAxisId="right" type="monotone" dataKey="MA10" stroke={darkChartColors.ma10Stroke} strokeWidth={1.5} dot={false} name="MA10" />}
            {showMA50 && <Line yAxisId="right" type="monotone" dataKey="MA50" stroke={darkChartColors.ma50Stroke} strokeWidth={1.5} dot={false} name="MA50" />}
            {showMA100 && <Line yAxisId="right" type="monotone" dataKey="MA100" stroke={darkChartColors.ma100Stroke} strokeWidth={1.5} dot={false} name="MA100" />}

          </ComposedChart>
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
        {/* Timeframe Selector */}
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

        {/* Checkboxes for Moving Averages */}
        <FormControlLabel 
          control={
            <Checkbox 
              checked={showMA10} 
              onChange={() => setShowMA10(!showMA10)} 
              sx={{ color: darkChartColors.ma10Stroke, padding: '4px' }} 
            />
          } 
          label={
            <Typography sx={{ color: "white", fontSize: "14px" }}>MA10</Typography> 
          } 
          sx={{ marginRight: 0, marginLeft: 1 }} 
        />
        <FormControlLabel 
          control={
            <Checkbox 
              checked={showMA50} 
              onChange={() => setShowMA50(!showMA50)} 
              sx={{ color: darkChartColors.ma50Stroke, padding: '4px' }} 
            />
          } 
          label={
            <Typography sx={{ color: "white", fontSize: "14px" }}>MA50</Typography> 
          } 
          sx={{ marginRight: 0, marginLeft: 1 }} 
        />
        <FormControlLabel 
          control={
            <Checkbox 
              checked={showMA100} 
              onChange={() => setShowMA100(!showMA100)} 
              sx={{ color: darkChartColors.ma100Stroke, padding: '4px' }} 
            />
          } 
          label={
            <Typography sx={{ color: "white", fontSize: "14px" }}>MA100</Typography> 
          } 
          sx={{ marginRight: 0, marginLeft: 1 }} 
        />
      </Box>
    </Box>
  );
};

export default StockChart;
