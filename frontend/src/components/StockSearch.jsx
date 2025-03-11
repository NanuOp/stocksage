import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
    Container, TextField, Typography, Card, CardContent, CircularProgress, Grid, Autocomplete, Button 
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

const StockSearch = () => {
    const [stockName, setStockName] = useState("");
    const [stockData, setStockData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [randomStocks, setRandomStocks] = useState([]);

    const API_BASE_URL = "http://127.0.0.1:8000/api";

    // Fetch stock suggestions from the database
    const fetchSuggestions = async (query) => {
        if (!query) {
            setSuggestions([]);
            return;
        }

        try {
            const response = await axios.get(`${API_BASE_URL}/suggestions/?q=${query}`);
            if (response.data.success) {
                setSuggestions(response.data.data);  
            }
        } catch (err) {
            console.error("Error fetching stock suggestions:", err);
        }
    };

    // Fetch random stocks for "Analyse" section
    const fetchRandomStocks = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/random-stocks/`);
            if (response.data.success) {
                setRandomStocks(response.data.data);  
            }
        } catch (err) {
            console.error("Error fetching random stocks:", err);
        }
    };

    // Fetch stock data
    const fetchStockData = async (stockCode) => {
        setError("");
        setStockData(null);
        setLoading(true);

        try {
            const response = await axios.get(`${API_BASE_URL}/stock/${stockCode}/`);
            if (response.data.success) {
                setStockData(response.data.data);
            } else {
                setError("Stock not found.");
            }
        } catch (err) {
            setError("Error fetching stock data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRandomStocks();
    }, []);

    return (
        <Container maxWidth="md" sx={{ mt: 8, textAlign: "center" }}>
            {/* Branding */}
            <Typography variant="h3" sx={{ fontWeight: "bold", fontFamily: "Poppins, sans-serif" }}>
                StockSage
            </Typography>
            <Typography variant="h6" color="textSecondary" sx={{ mb: 4, fontFamily: "Poppins, sans-serif" }}>
                Smart stock analysis and screening for informed investing.
            </Typography>
            
            {/* Search Bar */}
            <Grid container spacing={2} justifyContent="center">
                <Grid item xs={9}>
                    <Autocomplete
                        freeSolo
                        options={suggestions}
                        getOptionLabel={(option) => option.name}
                        onInputChange={(event, newValue) => {
                            setStockName(newValue);
                            fetchSuggestions(newValue);
                        }}
                        onChange={(event, newValue) => {
                            if (newValue) {
                                setStockName(newValue.name);
                                fetchStockData(newValue.code);
                            }
                        }}
                        renderInput={(params) => (
                            <TextField 
                                {...params}
                                fullWidth 
                                variant="outlined"
                                label="Search for a company..."
                            />
                        )}
                    />
                </Grid>
                <Grid item xs={3}>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        fullWidth
                        startIcon={<SearchIcon />} 
                        onClick={() => fetchStockData(stockName)}
                    >
                        Search
                    </Button>
                </Grid>
            </Grid>

            {/* Analyse Section */}
            {randomStocks.length > 0 && (
                <Typography variant="h6" sx={{ mt: 4, fontWeight: "medium", fontFamily: "Poppins, sans-serif" }}>
                    Or analyse:
                </Typography>
            )}
            <Grid container spacing={1} justifyContent="center" sx={{ mt: 1 }}>
                {randomStocks.map((stock) => (
                    <Grid item key={stock.code}>
                        <Button 
                            variant="outlined" 
                            sx={{ textTransform: "none", fontFamily: "Poppins, sans-serif" }}
                            onClick={() => fetchStockData(stock.code)}
                        >
                            {stock.name}
                        </Button>
                    </Grid>
                ))}
            </Grid>

            {/* Loading Indicator */}
            {loading && <CircularProgress sx={{ mt: 3 }} />}

            {/* Error Message */}
            {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}

            {/* Stock Data Display */}
            {stockData && (
                <Card sx={{ mt: 4, p: 2, boxShadow: 3 }}>
                    <CardContent>
                        <Typography variant="h5" gutterBottom>
                            {stockData.companyName} ({stockData.securityID})
                        </Typography>
                        <Typography variant="body1"><strong>Stock Code:</strong> {stockData.scripCode}</Typography>
                        <Typography variant="body1"><strong>Current Price:</strong> ₹{stockData.currentValue}</Typography>
                        <Typography variant="body1"><strong>Change:</strong> {stockData.change} ({stockData.pChange}%)</Typography>
                        <Typography variant="body1"><strong>Day High:</strong> ₹{stockData.dayHigh}</Typography>
                        <Typography variant="body1"><strong>Day Low:</strong> ₹{stockData.dayLow}</Typography>
                        <Typography variant="body1"><strong>52-Week High:</strong> ₹{stockData["52weekHigh"]}</Typography>
                        <Typography variant="body1"><strong>52-Week Low:</strong> ₹{stockData["52weekLow"]}</Typography>
                        <Typography variant="body1"><strong>Market Cap:</strong> {stockData.marketCapFull}</Typography>
                        <Typography variant="body1"><strong>Industry:</strong> {stockData.industry}</Typography>
                        <Typography variant="body1"><strong>Face Value:</strong> ₹{stockData.faceValue}</Typography>
                        <Typography variant="body2" color="textSecondary">Last Updated: {stockData.updatedOn}</Typography>
                    </CardContent>
                </Card>
            )}
        </Container>
    );
};

export default StockSearch;
