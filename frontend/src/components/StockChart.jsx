import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  ComposedChart
} from "recharts";
import {
  ToggleButton,
  ToggleButtonGroup,
  Box,
  Typography
} from "@mui/material";
import { format, subYears, subMonths, parse } from "date-fns";

const StockChart = ({ stockCode }) => {
  const [data, setData] = useState([]);
  const [years, setYears] = useState("10");
  const API_BASE_URL = "http://127.0.0.1:8000/api";

  useEffect(() => {
    fetchData();
  }, [years]);

  const fetchData = async () => {
    let computedStartDate = "";
    switch (years) {
      case "0.08": computedStartDate = format(subMonths(new Date(), 1), "yyyy-MM-dd"); break;
      case "0.5": computedStartDate = format(subMonths(new Date(), 6), "yyyy-MM-dd"); break;
      case "1": computedStartDate = format(subYears(new Date(), 1), "yyyy-MM-dd"); break;
      case "3": computedStartDate = format(subYears(new Date(), 3), "yyyy-MM-dd"); break;
      case "5": computedStartDate = format(subYears(new Date(), 5), "yyyy-MM-dd"); break;
      case "10": computedStartDate = format(subYears(new Date(), 10), "yyyy-MM-dd"); break;
      default: computedStartDate = format(subYears(new Date(), 10), "yyyy-MM-dd");
    }

    let url = `${API_BASE_URL}/stock/${stockCode}/history/?start_date=${computedStartDate}&end_date=${format(new Date(), "yyyy-MM-dd")}`;

    try {
      const response = await axios.get(url);
      if (response.data.success) {
        setData(response.data.nse_data);
      }
    } catch (error) {
      console.error("Error fetching historical data:", error);
    }
  };

  // Format X-axis to show only 7 points with "Month Year" format
  const formatXAxis = (tickItem, index) => {
    if (data.length === 0) return "";
    
    // Display only 7 evenly spaced dates
    const interval = Math.floor(data.length / 7);
    if (index % interval === 0 || index === data.length - 1) {
      const parsedDate = parse(tickItem, "yyyy-MM-dd", new Date());
      return format(parsedDate, "MMM yyyy");
    }
    
    return "";
  };

  return (
    <Box sx={{ textAlign: "center", padding: 3, bgcolor: "#121212", borderRadius: 2, color: "#fff" }}>
      <Typography variant="h5" sx={{ marginBottom: 2, fontWeight: "bold", color: "#fff" }}>
        Stock Price Chart ({stockCode})
      </Typography>

      {/* Timeframe Selector */}
      <ToggleButtonGroup
        value={years}
        exclusive
        onChange={(event, newValue) => {
          if (newValue !== null) setYears(newValue);
        }}
        sx={{
          display: "flex",
          justifyContent: "center",
          borderRadius: 2,
          marginBottom: 2,
          bgcolor: "#1E1E1E"
        }}
      >
        {[
          { label: "1M", value: "0.08" },
          { label: "6M", value: "0.5" },
          { label: "1Yr", value: "1" },
          { label: "3Yr", value: "3" },
          { label: "5Yr", value: "5" },
          { label: "10Yr", value: "10" },
        ].map((option) => (
          <ToggleButton
            key={option.value}
            value={option.value}
            sx={{
              borderRadius: 1,
              textTransform: "none",
              fontSize: "14px",
              fontWeight: "bold",
              color: "#fff",
              "&.Mui-selected": {
                bgcolor: "#3b82f6",
                color: "#fff",
              },
            }}
          >
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* Stock Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" opacity={0.4} />
          <XAxis
            dataKey="Date"
            tickFormatter={formatXAxis}
            tick={{ fill: "#ddd", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            orientation="left"
            tick={{ fill: "#ddd", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            label={{
              value: "Volume",
              angle: -90,
              position: "insideLeft",
              fill: "#ddd",
              fontSize: 14,
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: "#ddd", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            label={{
              value: "Price (₹)",
              angle: -90,
              position: "insideRight",
              fill: "#ddd",
              fontSize: 14,
            }}
          />
          <Tooltip
            content={({ label, payload }) => {
              if (!payload || payload.length === 0) return null;
              return (
                <div style={{ backgroundColor: "#222", padding: "8px", borderRadius: "8px", color: "#fff" }}>
                  <p style={{ fontWeight: "bold", marginBottom: "5px" }}>{label}</p>
                  {payload.map((entry, index) => (
                    <p key={index} style={{ color: entry.color }}>
                      {entry.dataKey === "Close" ? `₹ ${entry.value.toFixed(2)}` : `Volume: ${entry.value.toLocaleString()}`}
                    </p>
                  ))}
                </div>
              );
            }}
          />
          <Bar yAxisId="left" dataKey="Volume" fill="#4C82F7" opacity={0.3} name="Volume" />
          <Line yAxisId="right" type="monotone" dataKey="Close" stroke="#FBC02D" strokeWidth={2} dot={false} name="Price (₹)" />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default StockChart;
