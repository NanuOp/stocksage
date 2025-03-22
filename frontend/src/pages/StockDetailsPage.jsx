import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { Container, Typography, Grid, Card, CardContent, Divider, Box } from "@mui/material";
import Navbar from "../components/Navbar";
import StockChart from "../components/StockChart";
import "@fontsource/poppins";

const StockDetailsPage = () => {
  const { stockCode } = useParams();
  const [stockData, setStockData] = useState(null);
  const API_BASE_URL = "http://192.168.29.94:8000/api";

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
      <Typography variant="h6" align="center" sx={{ fontFamily: "Poppins, sans-serif", color: "#212529" }}>
        Loading...
      </Typography>
    );
  }

  return (
    <>
      <Navbar />
      <Container maxWidth={false} sx={{ fontFamily: "Poppins, sans-serif", pt: 4, pb: 4, px: 6 }}>
        <Typography variant="h3" fontWeight="bold" align="center" gutterBottom>
          {stockData.longName} ({stockData.symbol})
        </Typography>
        <Typography
          variant="h5"
          align="center"
          sx={{ color: stockData.change.startsWith("+") ? "#28a745" : "#dc3545", mb: 2 }}
        >
          ₹ {stockData.realTimePrice?.toFixed(2)} ({stockData.change} / {stockData.pChange})
        </Typography>
        <Typography variant="subtitle2" color="gray" align="center" gutterBottom>
          Updated on: {stockData.updatedOn}
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Grid container spacing={3}>
          {["Financials", "Valuation Ratios", "Trading Volume", "Stock Performance"].map((title, index) => (
            <Grid item xs={12} md={3} key={index}>
              <Card sx={{ borderRadius: 4, boxShadow: 3, p: 2, height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {title}
                  </Typography>
                  <Grid container spacing={1}>
                    {(() => {
                      switch (title) {
                        case "Financials":
                          return [
                            `Stock P/E: ${stockData.trailingPE}`,
                            `Market Cap: ₹ ${stockData.marketCap?.toLocaleString()}`,
                            stockData.totalRevenue && `Total Revenue: ₹ ${stockData.totalRevenue?.toLocaleString()}`,
                            stockData.debtToEquity && `Debt to Equity: ${stockData.debtToEquity}`,
                            stockData.grossProfits && `Gross Profits: ₹ ${stockData.grossProfits?.toLocaleString()}`,
                          ];
                        case "Valuation Ratios":
                          return [
                            `Beta: ${stockData.beta}`,
                            `Trailing P/E: ${stockData.trailingPE}`,
                            stockData.forwardPE && `Forward P/E: ${stockData.forwardPE}`,
                            stockData.bookValue && `Book Value: ₹ ${stockData.bookValue}`,
                            stockData.priceToBook && `Price to Book Ratio: ${stockData.priceToBook}`,
                          ];
                        case "Trading Volume":
                          return [
                            `Previous Close: ₹ ${stockData.regularMarketPreviousClose}`,
                            `Market Open: ₹ ${stockData.regularMarketOpen}`,
                            `Day High/Low: ₹ ${stockData.dayHigh} / ₹ ${stockData.dayLow}`,
                            `Regular Volume: ${stockData.regularMarketVolume?.toLocaleString()}`,
                            `Average Volume: ${stockData.averageVolume?.toLocaleString()}`,
                          ];
                        case "Stock Performance":
                          return [
                            `Previous Close: ₹ ${stockData.regularMarketPreviousClose}`,
                            `Open: ₹ ${stockData.regularMarketOpen}`,
                            `52-Week High/Low: ₹ ${stockData.fiftyTwoWeekHigh} / ₹ ${stockData.fiftyTwoWeekLow}`,
                          ];
                        default:
                          return [];
                      }
                    })().map((text, idx) => text && (
                      <Grid item xs={12} key={idx}>
                        <Card sx={{ p: 1, bgcolor: "#f5f5f5", boxShadow: 1 }}>
                          <CardContent>
                            <Typography variant="body2">{text}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mt: 4 }}>
          <StockChart stockCode={stockCode} />
        </Box>
      </Container>
    </>
  );
};

export default StockDetailsPage;
