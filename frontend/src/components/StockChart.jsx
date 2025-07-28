import React, { useState, useEffect, useRef } from "react"; // Import useRef
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
  Legend,
  ReferenceArea,
} from "recharts";
import {
  ToggleButton,
  ToggleButtonGroup,
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  CircularProgress
} from "@mui/material";
import { format, parseISO } from "date-fns";

// Custom Tooltip content
const CustomTooltip = ({ active, payload, label, darkChartColors, chartType }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload;
    return (
      <div style={{
        backgroundColor: darkChartColors.tooltipBg,
        padding: "10px",
        borderRadius: "6px",
        boxShadow: "0px 2px 10px rgba(0,0,0,0.3)",
        border: `1px solid ${darkChartColors.tooltipBorder}`
      }}>
        <p style={{ fontWeight: "bold", marginBottom: "5px", color: darkChartColors.tooltipTextPrimary }}>{label}</p>
        {/* Only show Volume for candlestick, as requested */}
        {chartType === 'candlestick' && dataPoint && (
          <p style={{ color: darkChartColors.tooltipTextPrimary }}>Volume: {dataPoint.Volume?.toLocaleString() || 'N/A'}</p>
        )}
        {/* Show price, volume, and MAs for line chart */}
        {chartType === 'line' && payload.map((entry, index) => (
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

const StockChart = ({ stockCode, chartBg }) => {
  const [data, setData] = useState([]);
  const [intradayData, setIntradayData] = useState([]);
  const [timeframe, setTimeframe] = useState("1Y");
  const [intradayInterval, setIntradayInterval] = useState('5m');
  const [intradayPeriod, setIntradayPeriod] = useState('1d');
  const [showVolume, setShowVolume] = useState(true);
  const [showMA10, setShowMA10] = useState(true);
  const [showMA100, setShowMA100] = useState(true);
  const [tickValues, setTickValues] = useState([]);
  const [activeChartTab, setActiveChartTab] = useState('historical');
  const [chartType, setChartType] = useState('line');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const yAxisRef = useRef(null); // Create a ref for the YAxis component

  const API_BASE_URL = "https://d8b089cf382c.ngrok-free.app/api";

  const darkChartColors = {
    background: chartBg || "#1A1A1D",
    gridStroke: "#404045",
    axisText: "#A0A0A0",
    axisLine: "#404045",
    lineStroke: "#4A3B90",
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
    ma10Stroke: "#FFA500",
    ma100Stroke: "#32CD32",
    tabBg: "#1A1A1D",
    tabBorder: "#404045",
    tabActiveBorder: "#6A5ACD",
    tabTextInactive: "#A0A0A0",
    tabTextActive: "#E0E0E0",
    candlestickUpFill: "#32CD32", // Green for bullish candles
    candlestickDownFill: "#FF4500", // Red for bearish candles
  };

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
  }, [stockCode, timeframe, activeChartTab, intradayInterval, intradayPeriod]);

  useEffect(() => {
    const validPeriodsForCurrentInterval = intervalPeriods[intradayInterval];
    if (validPeriodsForCurrentInterval && !validPeriodsForCurrentInterval.includes(intradayPeriod)) {
      setIntradayPeriod(validPeriodsForCurrentInterval[0]);
    }
  }, [intradayInterval, intradayPeriod]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (activeChartTab === 'historical') {
        const historyUrl = `${API_BASE_URL}/stock/${stockCode}/history/?timeframe=${timeframe}`;
        const maUrl = `${API_BASE_URL}/stock/${stockCode}/moving-averages/?days=1000&format=json`;

        const [historyResponse, maResponse] = await Promise.all([
          axios.get(historyUrl),
          axios.get(maUrl),
        ]);

        let stockData = [];
        if (historyResponse.data.success && historyResponse.data.data) {
          stockData = historyResponse.data.data.map(item => ({
            Date: item.Date,
            // Prioritize CamelCase, then fallback to lowercase for OHLCV
            Open: parseFloat(item.Open || item.open),
            High: parseFloat(item.High || item.high),
            Low: parseFloat(item.Low || item.low),
            Close: parseFloat(item.Close || item.close),
            Volume: parseFloat(item.Volume || item.volume),
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

        const mergedData = stockData.map(stockItem => {
          const maItem = maData.find(ma => ma.Date === stockItem.Date);
          return {
            ...stockItem,
            ...(maItem || {}),
          };
        });

        let finalData = mergedData.sort((a, b) => new Date(a.Date) - new Date(b.Date));

        setData(finalData);
        setIntradayData([]);
        updateTickValues(finalData, 'historical');

      } else if (activeChartTab === 'intraday') {
        const intradayUrl = `${API_BASE_URL}/stock/${stockCode}/intraday/?format=json&interval=${intradayInterval}&period=${intradayPeriod}`;
        const intradayResponse = await axios.get(intradayUrl);

        if (intradayResponse.data.success && intradayResponse.data.data) {
          const processedIntradayData = intradayResponse.data.data.map(item => ({
            Date: item.Datetime,
            // Prioritize CamelCase, then fallback to lowercase for OHLCV
            Open: parseFloat(item.Open || item.open),
            High: parseFloat(item.High || item.high),
            Low: parseFloat(item.Low || item.low),
            Close: parseFloat(item.Close || item.close),
            Volume: parseFloat(item.Volume || item.volume),
          }));
          processedIntradayData.sort((a, b) => new Date(a.Date) - new Date(b.Date));
          setIntradayData(processedIntradayData);
          setData([]);
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
    let totalTicks = 5;
    if (type === 'intraday') {
        totalTicks = Math.min(chartData.length, 6);
    }
    const step = Math.floor(chartData.length / (totalTicks - 1));
    const selectedTicks = Array.from({ length: totalTicks }, (_, i) =>
      chartData[Math.min(i * step, chartData.length - 1)].Date
    );
    setTickValues(selectedTicks);
  };

  const formatXAxis = (tick) => {
    if (activeChartTab === 'historical') {
      return format(parseISO(tick), "MMM yyyy");
    } else {
      const date = parseISO(tick);
      if (isNaN(date.getTime())) return tick;
      return format(date, "HH:mm");
    }
  };

  const currentChartData = activeChartTab === 'historical' ? data : intradayData;

  // Custom shape for Candlestick Bar
  const CandlestickShape = (props) => {
    const { x, width, payload, darkChartColors } = props; // Removed yAxis from destructuring here
    const yScale = yAxisRef.current?.scale; // Access scale from the ref

    // Debug: Log all props received by CandlestickShape
    console.log("CandlestickShape: All props received:", props);

    // Ensure payload and its OHLC properties exist
    if (!payload || typeof payload.Open === 'undefined' || typeof payload.High === 'undefined' ||
        typeof payload.Low === 'undefined' || typeof payload.Close === 'undefined') {
      console.warn("CandlestickShape: Missing OHLC data in payload.", payload);
      return null;
    }

    const { Open, High, Low, Close } = payload;

    // Validate OHLC values are numeric
    if (isNaN(Open) || isNaN(High) || isNaN(Low) || isNaN(Close)) {
      console.warn("CandlestickShape: Invalid numeric OHLC data in payload. Skipping candle.", payload);
      return null;
    }

    if (!yScale) {
      console.warn("CandlestickShape: yScale not available from yAxisRef.current.scale. Skipping candle.");
      return null;
    }

    const isBullish = Close >= Open;
    const color = isBullish ? darkChartColors.candlestickUpFill : darkChartColors.candlestickDownFill;

    // Calculate pixel coordinates using the y-axis scale
    const openY = yScale(Open);
    const closeY = yScale(Close);
    const highY = yScale(High);
    const lowY = yScale(Low);

    // Debug: Log scaled Y values
    console.log(`CandlestickShape: Scaled Y values for ${payload.Date}: OpenY=${openY}, CloseY=${closeY}, HighY=${highY}, LowY=${lowY}`);

    // Check if scaled Y coordinates are valid numbers
    if (isNaN(openY) || isNaN(closeY) || isNaN(highY) || isNaN(lowY)) {
      console.error("CandlestickShape: One or more scaled Y coordinates are NaN. Check YAxis domain and data values.", { Open, High, Low, Close, openY, highY, lowY, closeY, yScale });
      return null;
    }

    // Body of the candle
    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.abs(openY - closeY);
    // const bodyBottom = bodyTop + bodyHeight; // This variable is not used in the return statement

    // Wick (thin line)
    const wickX = x + width / 2;

    // Debug: Log body and wick dimensions
    console.log(`CandlestickShape: Body (Top: ${bodyTop}, Height: ${bodyHeight}), Wick (X: ${wickX}, HighY: ${highY}, LowY: ${lowY})`);

    // Add a minimum height for visibility if the body is too small
    const minBodyHeight = 1; // Minimum pixel height for candle body
    const finalBodyHeight = Math.max(bodyHeight, minBodyHeight); // Use this for rendering
    const finalBodyTop = isBullish ? bodyTop : bodyTop - (finalBodyHeight - bodyHeight); // Adjust top if height increased

    // For the wick, if High and Low are the same (flat line), draw a small vertical line for visibility
    const minWickLength = 1; // Minimum pixel length for wick
    let renderedHighY = highY;
    let renderedLowY = lowY;

    if (Math.abs(highY - lowY) < minWickLength) {
        // If wick is too small, make it a fixed small length centered around the High/Low point
        const midPoint = (highY + lowY) / 2;
        renderedHighY = midPoint - minWickLength / 2;
        renderedLowY = midPoint + minWickLength / 2;
    }
    
    return (
      <g>
        {/* Wick */}
        <line
          x1={wickX}
          y1={renderedHighY} // Use adjusted HighY for rendering
          x2={wickX}
          y2={renderedLowY}  // Use adjusted LowY for rendering
          stroke={color}
          strokeWidth={1}
        />
        {/* Body */}
        <rect
          x={x}
          y={finalBodyTop} // Use adjusted bodyTop for rendering
          width={width}
          height={finalBodyHeight} // Use adjusted bodyHeight for rendering
          fill={color}
        />
      </g>
    );
  };

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
              bgcolor: darkChartColors.toggleButtonInactiveBg,
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
              bgcolor: darkChartColors.toggleButtonInactiveBg,
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

      {/* Chart Type Selector */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <ToggleButtonGroup
          value={chartType}
          exclusive
          onChange={(event, newValue) => newValue && setChartType(newValue)}
          sx={{
            '& .MuiToggleButtonGroup-grouped': {
              borderRadius: '0 !important',
              border: `1px solid ${darkChartColors.gridStroke} !important`,
              margin: '0 !important',
            }
          }}
        >
          <ToggleButton
            value="line"
            sx={{
              textTransform: "none",
              fontSize: "12px",
              fontWeight: "bold",
              color: darkChartColors.toggleButtonInactiveText,
              bgcolor: darkChartColors.toggleButtonInactiveBg,
              "&.Mui-selected": {
                bgcolor: darkChartColors.toggleButtonActiveBg,
                color: darkChartColors.toggleButtonActiveText,
                '&:hover': { bgcolor: darkChartColors.toggleButtonActiveBg, }
              },
              "&:hover": { bgcolor: darkChartColors.toggleButtonInactiveBg, },
              minWidth: '80px', padding: '4px 8px',
            }}
          >
            Line Chart
          </ToggleButton>
          <ToggleButton
            value="candlestick"
            sx={{
              textTransform: "none",
              fontSize: "12px",
              fontWeight: "bold",
              color: darkChartColors.toggleButtonInactiveText,
              bgcolor: darkChartColors.toggleButtonInactiveBg,
              "&.Mui-selected": {
                bgcolor: darkChartColors.toggleButtonActiveBg,
                color: darkChartColors.toggleButtonActiveText,
                '&:hover': { bgcolor: darkChartColors.toggleButtonActiveBg, }
              },
              "&:hover": { bgcolor: darkChartColors.toggleButtonInactiveBg, },
              minWidth: '80px', padding: '4px 8px',
            }}
          >
            Candlestick
          </ToggleButton>
        </ToggleButtonGroup>
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
                domain={['dataMin - 10', 'dataMax + 10']}
                ref={yAxisRef} 
              />

              <Tooltip content={<CustomTooltip darkChartColors={darkChartColors} chartType={chartType} />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />

              {showVolume && <Bar yAxisId="left" dataKey="Volume" fill={darkChartColors.barFill} opacity={0.15} name="Volume" barSize={4} />}

              {chartType === 'line' && (
                <Line yAxisId="right" type="monotone" dataKey="Close" stroke={darkChartColors.lineStroke} strokeWidth={3} dot={false} name="Price (₹)" />
              )}

              {chartType === 'candlestick' && (
                <Bar
                  yAxisId="right"
                  dataKey="Close" // DataKey is still needed for Recharts to map x-axis
                  fill={darkChartColors.candlestickUpFill} // Default fill, will be overridden by shape
                  barSize={10} // Width of the candle body
                  shape={<CandlestickShape darkChartColors={darkChartColors} />} // Pass darkChartColors
                />
              )}

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
