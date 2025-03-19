import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { Container, Typography, Grid, Divider, Box } from "@mui/material";
import Navbar from "../components/Navbar";
import StockChart from "../components/StockChart";  // ✅ Import StockChart
import "@fontsource/poppins";

const StockDetailsPage = () => {
  const { stockCode } = useParams();
  const [stockData, setStockData] = useState(null);
  const API_BASE_URL = "http://127.0.0.1:8000/api";

  const fetchStockDetails = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/stock/${stockCode}/`);
      if (response.data.success) {
        setStockData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching stock details:", error);
    }
  };

  useEffect(() => {
    fetchStockDetails();
    const interval = setInterval(fetchStockDetails, 60000);
    return () => clearInterval(interval);
  }, [stockCode]);

  if (!stockData) {
    return (
      <Typography variant="h6" align="center" sx={{ fontFamily: "Poppins, sans-serif", color: "#e2e8f0" }}>
        Loading...
      </Typography>
    );
  }

  return (
    <>
      <Navbar />
      <Container
        maxWidth={false}
        sx={{
          width: "100vw",
          fontFamily: "Poppins, sans-serif",
          px: 5,
          bgcolor: "#0f172a",
          color: "#e2e8f0",
          minHeight: "100vh",
          paddingTop: 0,
        }}
      >
        {/* Stock Name & Price */}
        <Typography variant="h3" fontWeight="bold" sx={{ color: "#e2e8f0", textAlign: "center", mt: 0 }}>
          {stockData.longName} ({stockData.symbol})
        </Typography>
        <Typography
          variant="h5"
          sx={{
            textAlign: "center",
            color: stockData.change.startsWith("+") ? "#4caf50" : "#f44336",
            mb: 2,
          }}
        >
          ₹ {stockData.realTimePrice?.toFixed(2)} ({stockData.change} / {stockData.pChange})
        </Typography>
        <Typography variant="subtitle2" color="gray" textAlign="center">
          Updated on: {stockData.updatedOn}
        </Typography>

        <Divider sx={{ my: 3, bgcolor: "#444" }} />

        {/* First Row: Financials, Valuation Ratios, Trading Volume, Stock Performance */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Box sx={{ p: 3, bgcolor: "#1e293b", borderRadius: 2, minHeight: "100%" }}>
              <Typography variant="h5" fontWeight="bold" sx={{ color: "#e2e8f0" }}>Financials</Typography>
              <Typography>Stock P/E: {stockData.trailingPE}</Typography>
              <Typography>Market Cap: ₹ {stockData.marketCap?.toLocaleString()}</Typography>
              {stockData.totalRevenue && <Typography>Total Revenue: ₹ {stockData.totalRevenue?.toLocaleString()}</Typography>}
              {stockData.debtToEquity && <Typography>Debt to Equity: {stockData.debtToEquity}</Typography>}
              {stockData.grossProfits && <Typography>Gross Profits: ₹ {stockData.grossProfits?.toLocaleString()}</Typography>}
            </Box>
          </Grid>

          <Grid item xs={12} md={3}>
            <Box sx={{ p: 3, bgcolor: "#1e293b", borderRadius: 2, minHeight: "100%" }}>
              <Typography variant="h5" fontWeight="bold" sx={{ color: "#e2e8f0" }}>Valuation Ratios</Typography>
              <Typography>Beta: {stockData.beta}</Typography>
              {stockData.trailingPE && <Typography>Trailing P/E: {stockData.trailingPE}</Typography>}
              {stockData.forwardPE && <Typography>Forward P/E: {stockData.forwardPE}</Typography>}
              {stockData.bookValue && <Typography>Book Value: ₹ {stockData.bookValue}</Typography>}
              {stockData.priceToBook && <Typography>Price to Book Ratio: {stockData.priceToBook}</Typography>}
            </Box>
          </Grid>

          <Grid item xs={12} md={3}>
            <Box sx={{ p: 3, bgcolor: "#1e293b", borderRadius: 2, minHeight: "100%", display: "flex", flexDirection: "column" }}>
              <Typography variant="h5" fontWeight="bold" sx={{ color: "#e2e8f0" }}>Trading Volume</Typography>
              <Typography>Previous Close: ₹ {stockData.regularMarketPreviousClose}</Typography>
              <Typography>Market Open: ₹ {stockData.regularMarketOpen}</Typography>
              <Typography>Day High/Low: ₹ {stockData.dayHigh} / ₹ {stockData.dayLow}</Typography>
              <Typography>Regular Volume: {stockData.regularMarketVolume?.toLocaleString()}</Typography>
              <Typography>Average Volume: {stockData.averageVolume?.toLocaleString()}</Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={3}>
            <Box sx={{ p: 3, bgcolor: "#1e293b", borderRadius: 2, minHeight: "100%", display: "flex", flexDirection: "column" }}>
              <Typography variant="h5" fontWeight="bold" sx={{ color: "#e2e8f0" }}>Stock Performance</Typography>
              <Typography>Previous Close: ₹ {stockData.regularMarketPreviousClose}</Typography>
              <Typography>Open: ₹ {stockData.regularMarketOpen}</Typography>
              <Typography>52-Week High/Low: ₹ {stockData.fiftyTwoWeekHigh} / ₹ {stockData.fiftyTwoWeekLow}</Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3, bgcolor: "#444" }} />

        {/* Company Info */}
        {stockData.industry && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ p: 3, bgcolor: "#1e293b", borderRadius: 2 }}>
                <Typography variant="h5" fontWeight="bold" sx={{ color: "#e2e8f0" }}>Company Info</Typography>
                <Typography>Industry: {stockData.industry}</Typography>
                <Typography>Sector: {stockData.sector}</Typography>
                {stockData.fullTimeEmployees && <Typography>Employees: {stockData.fullTimeEmployees}</Typography>}
                {stockData.phone && <Typography>Contact: {stockData.phone}</Typography>}
                {stockData.website && (
                  <Typography>
                    Website: <a href={stockData.website} target="_blank" rel="noopener noreferrer">{stockData.website}</a>
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        )}

        {/* ✅ Add Stock Chart Here */}
        <Box sx={{ mt: 4 }}>
          <StockChart stockCode={stockCode} />
        </Box>
      </Container>
    </>
  );
};

export default StockDetailsPage;
