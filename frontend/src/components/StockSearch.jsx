import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Container, TextField, Typography, Autocomplete, Button } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

const StockSearch = () => {
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
    <Container
      maxWidth="lg"
      sx={{
        mt: 8,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        bgcolor: "#F5F5F5",
        p: 4,
        borderRadius: 2,
      }}
    >
      <Typography
        variant="h3"
        sx={{
          fontWeight: "bold",
          fontFamily: "Poppins, sans-serif",
          color: "#4CAF50",
        }}
      >
        StockSage
      </Typography>
      <Typography
        variant="h6"
        color="#607D8B"
        sx={{ mb: 4, fontFamily: "Poppins, sans-serif" }}
      >
        Smart stock analysis and screening for informed investing.
      </Typography>

      <div style={{ display: "flex", gap: "16px", justifyContent: "center", width: "100%" }}>
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
              handleSearch(newValue.ticker); // ✅ Fix: Correct field for ticker
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              variant="outlined"
              label="Search for a company..."
              onKeyDown={(event) => {
                if (event.key === "Enter" && suggestions.length > 0) {
                  handleSearch(suggestions[0].ticker); // ✅ Fix: Select first suggestion on Enter
                }
              }}
            />
          )}
          sx={{ width: "70%" }}
        />
        <Button
          variant="contained"
          sx={{
            bgcolor: "#4CAF50",
            color: "white",
            px: 3,
            borderRadius: 2,
            "&:hover": { bgcolor: "#388E3C" },
          }}
          startIcon={<SearchIcon />}
          onClick={() => handleSearch(stockName)}
          disabled={!stockName} // ✅ Fix: Disable if empty
        >
          Search
        </Button>
      </div>
    </Container>
  );
};

export default StockSearch;
