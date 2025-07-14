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

const StockChart = ({ stockCode }) => {
  const [data, setData] = useState([]);
  const [timeframe, setTimeframe] = useState("1Y");
  const [showVolume, setShowVolume] = useState(true);
  const [tickValues, setTickValues] = useState([]);

  const API_BASE_URL = "http://127.0.0.1:8000/api";

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
    <Box sx={{ textAlign: "center", padding: 3, bgcolor: "#ffffff", borderRadius: 2, color: "#333", boxShadow: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: "bold", color: "#222", marginBottom: 2 }}>
        Stock Price Chart ({stockCode})
      </Typography>

      {/* Timeframe Selector */}
      <ToggleButtonGroup
        value={timeframe}
        exclusive
        onChange={(event, newValue) => newValue && setTimeframe(newValue)}
        sx={{ display: "flex", justifyContent: "center", marginBottom: 2 }}
      >
        {["1M", "6M", "1Y", "3Y", "5Y", "10Y", "MAX"].map((option) => (
          <ToggleButton
            key={option}
            value={option}
            sx={{
              textTransform: "none",
              fontSize: "14px",
              fontWeight: "bold",
              color: "#555",
              "&.Mui-selected": { bgcolor: "#3b82f6", color: "#fff" },
            }}
          >
            {option}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* Checkbox for Volume */}
      <Box sx={{ display: "flex", justifyContent: "center", gap: 2, marginBottom: 2 }}>
        <FormControlLabel control={<Checkbox checked={showVolume} onChange={() => setShowVolume(!showVolume)} />} label="Volume" />
      </Box>

      {/* Chart Container */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Left Y-Axis Label */}
        {showVolume && (
          <Typography sx={{ transform: "rotate(-90deg)", whiteSpace: "nowrap", fontSize: 20, fontWeight: "bold", color: "#555", marginRight: 1 }}>
            Volume
          </Typography>
        )}

        <ResponsiveContainer width="90%" height={500}>
          <ComposedChart data={data}>
            <CartesianGrid stroke="#aaa" strokeWidth={1} opacity={0.8} vertical={false} />

            <XAxis
              dataKey="Date"
              ticks={tickValues}
              tickFormatter={formatXAxis}
              tick={{ fill: "#777", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "#ddd" }}
            />

            {showVolume && (
              <YAxis
                yAxisId="left"
                orientation="left"
                tick={{ fill: "#777", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
            )}

            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: "#777", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />

            <Tooltip
              content={({ label, payload }) =>
                payload?.length ? (
                  <div style={{ backgroundColor: "#fff", padding: "10px", borderRadius: "6px", boxShadow: "0px 2px 10px rgba(0,0,0,0.1)", border: "1px solid #ddd" }}>
                    <p style={{ fontWeight: "bold", marginBottom: "5px", color: "#444" }}>{label}</p>
                    {payload.map((entry, index) => (
                      <p key={index} style={{ color: entry.color }}>
                        {entry.dataKey === "Close" ? `₹ ${entry.value.toFixed(2)}` : `Vol: ${entry.value.toLocaleString()}`}
                      </p>
                    ))}
                  </div>
                ) : null
              }
            />

            {showVolume && <Bar yAxisId="left" dataKey="Volume" fill="#4C82F7" opacity={0.15} name="Volume" barSize={4} />}
            <Line yAxisId="right" type="monotone" dataKey="Close" stroke="#4C82F7" strokeWidth={2} dot={false} name="Price (₹)" />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Right Y-Axis Label */}
        <Typography sx={{ transform: "rotate(90deg)", whiteSpace: "nowrap", fontSize: 20, fontWeight: "bold", color: "#555", marginLeft: 1 }}>
          Price (₹)
        </Typography>
      </Box>
    </Box>
  );
};

export default StockChart;
