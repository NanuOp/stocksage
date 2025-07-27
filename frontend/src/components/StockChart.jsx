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
}
 from "@mui/material";
import { format, parseISO } from "date-fns";

const StockChart = ({ stockCode, chartBg }) => {
  const [data, setData] = useState([]);
  const [timeframe, setTimeframe] = useState("1Y");
  const [showVolume, setShowVolume] = useState(true);
  const [showMA10, setShowMA10] = useState(true);
  // Removed showMA20 state as it's no longer needed
  const [showMA100, setShowMA100] = useState(true);
  const [tickValues, setTickValues] = useState([]);

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
    ma20Stroke: "#00BFFF", // Deep Sky Blue for MA20 - Retained for color definition, but not used for line
    ma100Stroke: "#32CD32", // Lime Green for MA100
  };

  useEffect(() => {
    fetchData();
  }, [stockCode, timeframe]);

  const fetchData = async () => {
    try {
      // 1. Fetch historical data (Close, Volume) with timeframe
      const historyUrl = `${API_BASE_URL}/stock/${stockCode}/history/?timeframe=${timeframe}`;
      // 2. Fetch moving averages from the backend
      // Changed 'days' parameter to 1000 as requested
      const maUrl = `${API_BASE_URL}/stock/${stockCode}/moving-averages/?days=1000&format=json`;

      const [historyResponse, maResponse] = await Promise.all([
        axios.get(historyUrl),
        axios.get(maUrl),
      ]);

      let stockData = [], maData = [];

      if (historyResponse.data.success && historyResponse.data.data) {
        stockData = historyResponse.data.data.map(item => ({
          Date: item.Date,
          Close: parseFloat(item.Close),
          Volume: parseFloat(item.Volume),
        }));
      } else {
        console.warn("API returned success: false for historical data or no data.");
      }

      if (maResponse.data.success && maResponse.data.data) {
        maData = maResponse.data.data.map(item => ({
          Date: item.Date,
          MA10: item.MA10 ? parseFloat(item.MA10) : null,
          MA20: item.MA20 ? parseFloat(item.MA20) : null, // Still fetch MA20 data, but won't display the line
          MA100: item.MA100 ? parseFloat(item.MA100) : null,
        }));
      } else {
        console.warn("API returned success: false for moving averages or no data.");
      }

      // Merge historical data and MA data
      // No truncation of MA data here; all available data from API will be used.
      const mergedData = stockData.map(stockItem => {
        const maItem = maData.find(ma => ma.Date === stockItem.Date);
        return {
          ...stockItem,
          ...(maItem || {}), // Merge MA data if found, otherwise an empty object
        };
      });

      let finalData = mergedData.sort((a, b) => new Date(a.Date) - new Date(b.Date));
      
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
            <Legend wrapperStyle={{ paddingTop: '20px' }} /> {/* Add Legend component */}

            {showVolume && <Bar yAxisId="left" dataKey="Volume" fill={darkChartColors.barFill} opacity={0.15} name="Volume" barSize={4} />}
            <Line yAxisId="right" type="monotone" dataKey="Close" stroke={darkChartColors.lineStroke} strokeWidth={3} dot={false} name="Price (₹)" />
            
            {/* Moving Average Lines */}
            {showMA10 && <Line yAxisId="right" type="monotone" dataKey="MA10" stroke={darkChartColors.ma10Stroke} strokeWidth={2} dot={false} name="MA10" />}
            {/* Removed MA20 Line component */}
            {showMA100 && <Line yAxisId="right" type="monotone" dataKey="MA100" stroke={darkChartColors.ma100Stroke} strokeWidth={2} dot={false} name="MA100" />}

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
          control={<Checkbox checked={showMA10} onChange={() => setShowMA10(!showMA10)} sx={{ color: darkChartColors.ma10Stroke, padding: '4px' }} />}
          label={<Typography sx={{ color: darkChartColors.ma10Stroke, fontSize: 14 }}>MA10</Typography>}
          sx={{ marginRight: 0, marginLeft: 1 }}
        />
        {/* Removed MA20 Checkbox */}
        <FormControlLabel 
          control={<Checkbox checked={showMA100} onChange={() => setShowMA100(!showMA100)} sx={{ color: darkChartColors.ma100Stroke, padding: '4px' }} />}
          label={<Typography sx={{ color: darkChartColors.ma100Stroke, fontSize: 14 }}>MA100</Typography>}
          sx={{ marginRight: 0, marginLeft: 1 }}
        />
      </Box>
    </Box>
  );
};

export default StockChart;
