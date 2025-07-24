import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, Button } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import axios from 'axios';
import { format, parseISO } from 'date-fns';

const FinancialChartsSection = ({ stockCode, colors }) => {
  const [activePeriod, setActivePeriod] = useState('annually');
  const [financialData, setFinancialData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = "http://localhost:8000/api";

  useEffect(() => {
    if (stockCode) fetchFinancialData();
  }, [stockCode]);

  const fetchFinancialData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/stock/${stockCode}/events/`);
      if (response.data.success) setFinancialData(response.data);
      else setError("No financial data available for this stock.");
    } catch (err) {
      console.error("Error fetching financial data:", err);
      setError("Failed to load financial data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const getChartData = () => {
    if (!financialData) return [];
    const conversionFactor = 1e7;
    const dataSource = activePeriod === 'annually' ? financialData.annual_results : financialData.quarterly_results;
    if (!dataSource) return [];

    return dataSource
      .filter(item => item && item.date && item.data)
      .map(item => ({
        name: format(parseISO(item.date), activePeriod === 'annually' ? 'yyyy' : 'MMM yyyy'),
        revenue: (item.data["Total Revenue"] || 0) / conversionFactor,
        profit: (item.data["Net Income"] || 0) / conversionFactor,
        originalDate: parseISO(item.date)
      }))
      .sort((a, b) => a.originalDate - b.originalDate);
  };

  const renderChart = (data) => {
    if (!data || data.length === 0) {
      return <Typography variant="body1" sx={{ textAlign: 'center', py: 3, color: colors.textSecondary }}>No data available for this period.</Typography>;
    }

    return (
      <Box sx={{ bgcolor: "#1A1A1D", borderRadius: 2, p: 2 }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.divider} />
            <XAxis dataKey="name" stroke={colors.textSecondary} />
            <YAxis stroke={colors.textSecondary} tickFormatter={(v) => `₹ ${v.toLocaleString()} Cr`} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1A1A1D", border: `1px solid ${colors.divider}`, color: colors.textPrimary }}
              itemStyle={{ color: colors.textPrimary }}
              formatter={(v) => `₹ ${v.toLocaleString()} Cr`}
            />
            <Legend />
            <Bar dataKey="revenue" fill={colors.headerAccent} name="Revenue" radius={[4, 4, 0, 0]} />
            <Bar dataKey="profit" fill={colors.positiveTrend} name="Net Income (Profit/Loss)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    );
  };

  const chartData = getChartData();

  return (
    <Card sx={{ borderRadius: 2, boxShadow: 0, mb: 3, bgcolor: colors.background, color: colors.textPrimary }}>
      <Box sx={{ p: 2, bgcolor: colors.background, color: colors.textPrimary }}>
        <Typography variant="h6" fontWeight="bold">FINANCIAL</Typography>
      </Box>

      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Button
            onClick={() => setActivePeriod('quarterly')}
            sx={{
              flex: 1,
              py: 1.5,
              bgcolor: colors.background,
              color: activePeriod === 'quarterly' ? colors.textPrimary : colors.textSecondary,
              borderBottom: activePeriod === 'quarterly' ? `2px solid ${colors.headerAccent}` : '2px solid transparent',
              borderRadius: 0,
              '&:hover': { bgcolor: colors.cardBg },
            }}
          >
            Quarterly Results
          </Button>
          <Button
            onClick={() => setActivePeriod('annually')}
            sx={{
              flex: 1,
              py: 1.5,
              bgcolor: colors.background,
              color: activePeriod === 'annually' ? colors.textPrimary : colors.textSecondary,
              borderBottom: activePeriod === 'annually' ? `2px solid ${colors.headerAccent}` : '2px solid transparent',
              borderRadius: 0,
              '&:hover': { bgcolor: colors.cardBg },
            }}
          >
            Annual Results
          </Button>
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: colors.headerAccent }} />
            <Typography variant="body2" sx={{ ml: 2, color: colors.textSecondary }}>Loading financial data...</Typography>
          </Box>
        ) : error ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body1" color="error" sx={{ mb: 2 }}>{error}</Typography>
            <Button variant="contained" onClick={fetchFinancialData} sx={{ bgcolor: colors.buttonBg, '&:hover': { bgcolor: colors.buttonHoverBg }, color: colors.textPrimary }}>Retry</Button>
          </Box>
        ) : (
          renderChart(chartData)
        )}
      </CardContent>
    </Card>
  );
};

export default FinancialChartsSection;
