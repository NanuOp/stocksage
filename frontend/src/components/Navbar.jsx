import React, { useState } from "react";
import { AppBar, Toolbar, Typography, Button, Box, TextField, Autocomplete, IconButton } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const Navbar = () => {
    const [stockName, setStockName] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const navigate = useNavigate();
    const API_BASE_URL = "http://127.0.0.1:8000/api";

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

    const handleSearch = (ticker) => {
        if (ticker) {
            navigate(`/stock/${ticker}`);
        }
    };

    return (
        <AppBar position="static" sx={{ backgroundColor: "#1E1E2F", fontFamily: "Poppins, sans-serif", padding: "8px" }}>
            <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", gap: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: "bold", color: "white" }}>
                        StockSage
                    </Typography>
                    <Button color="inherit" component={Link} to="/" sx={{ fontFamily: "Poppins, sans-serif" }}>
                        Stock
                    </Button>
                    <Button color="inherit" component={Link} to="/charts" sx={{ fontFamily: "Poppins, sans-serif" }}>
                        Charts
                    </Button>
                    <Button color="inherit" component={Link} to="/revenue" sx={{ fontFamily: "Poppins, sans-serif" }}>
                        Revenue
                    </Button>
                    <Button color="inherit" component={Link} to="/profits-loss" sx={{ fontFamily: "Poppins, sans-serif" }}>
                        Profits & Loss
                    </Button>
                    <Button color="inherit" component={Link} to="/shareholders" sx={{ fontFamily: "Poppins, sans-serif" }}>
                        Shareholders
                    </Button>
                    <Button color="inherit" component={Link} to="/mutual-funds" sx={{ fontFamily: "Poppins, sans-serif" }}>
                        Mutual Funds Invested
                    </Button>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, bgcolor: "white", borderRadius: 2, padding: "2px 10px" }}>
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
                                handleSearch(newValue.ticker);
                            }
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Search for Company"
                                variant="standard"
                                InputProps={{
                                    ...params.InputProps,
                                    disableUnderline: true,
                                }}
                                sx={{ minWidth: 200 }}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" && suggestions.length > 0) {
                                        handleSearch(suggestions[0].ticker);
                                    }
                                }}
                            />
                        )}
                    />
                    <IconButton onClick={() => handleSearch(stockName)} disabled={!stockName}>
                        <SearchIcon sx={{ color: "black" }} />
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;
