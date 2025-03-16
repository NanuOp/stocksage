import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { Container, Typography, Grid, Divider } from "@mui/material";
import "@fontsource/poppins";

const StockDetails = () => {
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
    const interval = setInterval(fetchStockDetails, 1000);
    return () => clearInterval(interval);
  }, [stockCode, fetchStockDetails]); // Including fetchStockDetails in dependencies

  if (!stockData) {
    return (
      <Typography
        variant="h6"
        align="center"
        sx={{ fontFamily: "Poppins, sans-serif", color: "#fdd835" }}
      >
        Loading...
      </Typography>
    );
  }

  return (
    <Container maxWidth={false} sx={{ mt: 5, fontFamily: "Poppins, sans-serif" }}>
      <Typography variant="h3" fontWeight="bold" sx={{ color: "#fdd835", textAlign: "center" }}>
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

      {/* Stock Details Section */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Typography variant="h5" fontWeight="bold">Financials</Typography>
          <Typography>Stock P/E: {stockData.trailingPE}</Typography>
          <Typography>Market Cap: ₹ {stockData.marketCap?.toLocaleString()}</Typography>
          <Typography>Total Revenue: ₹ {stockData.totalRevenue?.toLocaleString()}</Typography>
          <Typography>Debt to Equity: {stockData.debtToEquity}</Typography>
          <Typography>Gross Profits: ₹ {stockData.grossProfits?.toLocaleString()}</Typography>
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography variant="h5" fontWeight="bold">Trading Volume</Typography>
          <Typography>Previous Close: ₹ {stockData.regularMarketPreviousClose}</Typography>
          <Typography>Market Open: ₹ {stockData.regularMarketOpen}</Typography>
          <Typography>Day High/Low: ₹ {stockData.dayHigh} / ₹ {stockData.dayLow}</Typography>
          <Typography>Regular Volume: {stockData.regularMarketVolume?.toLocaleString()}</Typography>
          <Typography>Average Volume: {stockData.averageVolume?.toLocaleString()}</Typography>
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography variant="h5" fontWeight="bold">Company Info</Typography>
          <Typography>Industry: {stockData.industry}</Typography>
          <Typography>Sector: {stockData.sector}</Typography>
          <Typography>Employees: {stockData.fullTimeEmployees}</Typography>
          <Typography>Contact: {stockData.phone}</Typography>
          <Typography>Parent Organization: {stockData.parentOrganisation}</Typography>
          <Typography>
            Website: <a href={stockData.website} target="_blank" rel="noopener noreferrer">{stockData.website}</a>
          </Typography>
          <Typography variant="h6" fontWeight="bold" sx={{ mt: 2 }}>Company Overview</Typography>
          <Typography sx={{ mt: 1, color: "gray" }}>{stockData.longBusinessSummary}</Typography>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3, bgcolor: "#444" }} />

      {/* Stock Performance & Valuation Ratios */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h5" fontWeight="bold">Stock Performance</Typography>
          <Typography>Previous Close: ₹ {stockData.regularMarketPreviousClose}</Typography>
          <Typography>Open: ₹ {stockData.regularMarketOpen}</Typography>
          <Typography>52-Week High/Low: ₹ {stockData.fiftyTwoWeekHigh} / ₹ {stockData.fiftyTwoWeekLow}</Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h5" fontWeight="bold">Valuation Ratios</Typography>
          <Typography>Beta: {stockData.beta}</Typography>
          <Typography>Trailing P/E: {stockData.trailingPE}</Typography>
          <Typography>Forward P/E: {stockData.forwardPE}</Typography>
          <Typography>Book Value: ₹ {stockData.bookValue}</Typography>
          <Typography>Price to Book Ratio: {stockData.priceToBook}</Typography>
        </Grid>
      </Grid>
    </Container>
  );
};

export default StockDetails;
