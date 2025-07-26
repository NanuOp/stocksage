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

const StockChart = ({ stockCode, chartBg }) => { // Accept chartBg prop
  const [data, setData] = useState([]);
  const [timeframe, setTimeframe] = useState("1Y");
  const [showVolume, setShowVolume] = useState(true);
  const [tickValues, setTickValues] = useState([]);

  const API_BASE_URL = "https://94d3be703f4e.ngrok-free.app/api";

  // Define dark theme colors for the chart
  const darkChartColors = {
    background: chartBg || "#1A1A1D", // Use prop, fallback to default dark
    gridStroke: "#404045", // Darker grey for grid lines
    axisText: "#A0A0A0",   // Medium grey for axis labels
    axisLine: "#404045",   // Darker grey for axis lines
    lineStroke: "#6A5ACD", // Accent color for the price line
    barFill: "#6A5ACD",    // Accent color for volume bars
    tooltipBg: "#2C2C30",  // Darker background for tooltip
    tooltipBorder: "#6A5ACD", // Accent border for tooltip
    tooltipTextPrimary: "#E0E0E0", // Light text for tooltip primary
    tooltipTextSecondary: "#A0A0A0", // Medium text for tooltip secondary
    toggleButtonActiveBg: "#6A5ACD", // Active toggle button background
    toggleButtonActiveText: "#E0E0E0", // Active toggle button text
    toggleButtonInactiveBg: "#2C2C30", // Inactive toggle button background
    toggleButtonInactiveText: "#A0A0A0", // Inactive toggle button text
    labelColor: "#E0E0E0", // Color for "Volume" and "Price (₹)" labels
  };

  useEffect(() => {
    fetchData();
  }, [stockCode, timeframe]);

  const fetchData = async () => {
    try {
      const url = `${API_BASE_URL}/stock/${stockCode}/history/?timeframe=${timeframe}`;
      const response = await axios.get(url);
      console.log("Chart API Response:", response.data);

      if (response.data.success) {
        let stockData = response.data.data || [];

        // Clean and normalize data
        stockData = stockData
          .map((item) => ({
            Date: item.Date,
            Close: parseFloat(item.Close),
            Volume: parseFloat(item.Volume),
          }))
          .filter((item) => item.Date && !isNaN(item.Close));

        setData(stockData);
        updateTickValues(stockData);
      } else {
        setData([]);
        console.warn("API returned success: false");
      }
    } catch (error) {
      console.error("Error fetching historical data:", error);
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

  return (
    <Box sx={{ 
      textAlign: "center", 
      padding: 3, 
      bgcolor: "#1A1A1D", // Apply background color here
      borderRadius: 2, // Changed to 0 for classical look
      color: "#1A1A1D", // Default text color for the chart box
     
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
          <ComposedChart data={data} style={{ background: darkChartColors.background }}> {/* Apply background here too */}
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

            <Tooltip
              content={({ label, payload }) =>
                payload?.length ? (
                  <div style={{ 
                    backgroundColor: "#1A1A1D", 
                    padding: "10px", 
                    borderRadius: "6px", 
                    boxShadow: "0px 2px 10px rgba(0,0,0,0.3)", 
                    
                  }}>
                    <p style={{ fontWeight: "bold", marginBottom: "5px", color: darkChartColors.tooltipTextPrimary }}>{label}</p>
                    {payload.map((entry, index) => (
                      <p key={index} style={{ color: entry.color || darkChartColors.tooltipTextSecondary }}>
                        {entry.dataKey === "Close" ? `₹ ${entry.value.toFixed(2)}` : `Vol: ${entry.value.toLocaleString()}`}
                      </p>
                    ))}
                  </div>
                ) : null
              }
            />

            {showVolume && <Bar yAxisId="left" dataKey="Volume" fill={darkChartColors.barFill} opacity={0.15} name="Volume" barSize={4} />}
            <Line yAxisId="right" type="monotone" dataKey="Close" stroke={darkChartColors.lineStroke} strokeWidth={2} dot={false} name="Price (₹)" />
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
        justifyContent: "flex-end", // Align to the right
        alignItems: "center",     // Align items to center vertically for better alignment
        gap: 2, 
        marginTop: 2, // Add some top margin
        flexWrap: 'wrap' // Allow wrapping on smaller screens
      }}>
        {/* Timeframe Selector */}
        <ToggleButtonGroup
          value={timeframe}
          exclusive
          onChange={(event, newValue) => newValue && setTimeframe(newValue)}
          sx={{ 
            display: "flex", 
            flexWrap: 'wrap', // Allow buttons to wrap
            justifyContent: "flex-end", // Align buttons to the right within their group
            '& .MuiToggleButtonGroup-grouped': {
              borderRadius: '0 !important', // Ensure no border radius on grouped items
              border: `1px solid ${darkChartColors.gridStroke} !important`, // Ensure consistent border
              margin: '0 !important', // Remove default margins between grouped buttons
            }
          }}
        >
          {["1D", "1W", "1M", "6M", "1Y", "3Y", "5Y", "MAX"].map((option) => (
            <ToggleButton
              key={option}
              value={option}
              sx={{
                textTransform: "none",
                fontSize: "12px", // Smaller font size for compact look
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
                minWidth: '40px', // Ensure minimum width for buttons
                padding: '4px 8px', // Adjust padding
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
                padding: '4px' // Reduce padding for checkbox to align better
              }} 
            />
          } 
          label={
            <Typography sx={{ color: darkChartColors.axisText, fontSize: "14px" }}>Volume</Typography> 
          } 
          sx={{ 
            marginRight: 0, 
            marginLeft: 1 // Add a small left margin to separate from buttons
          }} 
        />
      </Box>
    </Box>
  );
};

export default StockChart;
