import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { Container, Typography, Box, Paper, Grid, Divider } from "@mui/material";
import "@fontsource/poppins";

const StockDetails = () => {
    const { stockCode } = useParams();
    const [stockData, setStockData] = useState(null);
    const API_BASE_URL = "http://127.0.0.1:8000/api";

    useEffect(() => {
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
        
        fetchStockDetails();
    }, [stockCode]);

    if (!stockData) {
        return (
            <Typography variant="h6" align="center" sx={{ fontFamily: "Poppins, sans-serif", color: "#fdd835" }}>
                Loading...
            </Typography>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 5, fontFamily: "Poppins, sans-serif", textAlign: "center" }}>
            <Typography variant="h3" fontWeight="bold" sx={{ color: "#fdd835" }}>
                {stockData.companyName}
            </Typography>
            <Typography variant="h5" sx={{ color: "#ff4081", mb: 2 }}>
                ₹ {stockData.currentValue} ({stockData.change} / {stockData.pChange}%)
            </Typography>
            <Typography variant="subtitle2" color="gray">Updated on: {stockData.updatedOn}</Typography>

            <Paper elevation={4} sx={{ mt: 4, p: 4, borderRadius: 3, bgcolor: "#1e1e1e", color: "#f8f9fa" }}>
                <Divider sx={{ my: 3, bgcolor: "#444" }} />

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: "#2c2c2c", color: "#fdd835" }}>
                            <Typography variant="body1"><strong>Market Cap:</strong> ₹ {stockData.marketCapFull}</Typography>
                            <Typography variant="body1"><strong>Market Cap Free Float:</strong> ₹ {stockData.marketCapFreeFloat}</Typography>
                            <Typography variant="body1"><strong>Current Price:</strong> ₹ {stockData.currentValue}</Typography>
                            <Typography variant="body1"><strong>52-Week High / Low:</strong> ₹ {stockData["52weekHigh"]} / {stockData["52weekLow"]}</Typography>
                            <Typography variant="body1"><strong>Face Value:</strong> ₹ {stockData.faceValue}</Typography>
                            <Typography variant="body1"><strong>Industry:</strong> {stockData.industry}</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: "#2c2c2c", color: "#fdd835" }}>
                            <Typography variant="body1"><strong>Previous Close:</strong> ₹ {stockData.previousClose}</Typography>
                            <Typography variant="body1"><strong>Previous Open:</strong> ₹ {stockData.previousOpen}</Typography>
                            <Typography variant="body1"><strong>Day High:</strong> ₹ {stockData.dayHigh}</Typography>
                            <Typography variant="body1"><strong>Day Low:</strong> ₹ {stockData.dayLow}</Typography>
                            <Typography variant="body1"><strong>Weighted Avg Price:</strong> ₹ {stockData.weightedAvgPrice}</Typography>
                            <Typography variant="body1"><strong>Total Traded Value:</strong> {stockData.totalTradedValue}</Typography>
                            <Typography variant="body1"><strong>Total Traded Quantity:</strong> {stockData.totalTradedQuantity}</Typography>
                        </Paper>
                    </Grid>
                </Grid>
                
                <Box mt={4}>
                    <Typography variant="h5" fontWeight="bold" sx={{ color: "#fdd835" }}>About</Typography>
                    <Typography variant="body1" color="gray" sx={{ mt: 1 }}>{stockData.about.overview}</Typography>
                </Box>
            </Paper>
        </Container>
    );
};

export default StockDetails;