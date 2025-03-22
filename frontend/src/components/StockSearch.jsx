import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { TextField, Autocomplete, IconButton, Box } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

const StockSearch = ({ isNavbar = false }) => {
  const [stockName, setStockName] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const navigate = useNavigate();
const API_BASE_URL = "http://192.168.29.94:8000/api";
  // ✅ Use network IP

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
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        backgroundColor: "white",
        borderRadius: "24px",
        padding: "8px 12px", // Increased padding for better look
        width: isNavbar ? "400px" : "700px", // Shorter width in navbar, wider in main
        maxWidth: "90%",
        height:isNavbar? "45px": "60px", // Increased height for better visibility
        boxShadow: isNavbar ? "none" : "0px 2px 6px rgba(0,0,0,0.2)",
        border: "1px solid #ccc",
      }}
    >
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
            placeholder="Search..."
            variant="standard"
            InputProps={{
              ...params.InputProps,
              disableUnderline: true,
              style: {
                fontSize: "16px",
                width: "100%",
                padding: "10px", // More padding for spacing
                height: "100%", // Ensure it fills the box height
              },
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && suggestions.length > 0) {
                handleSearch(suggestions[0].ticker);
              }
            }}
          />
        )}
        sx={{ width: "100%" }}
      />
      <IconButton onClick={() => handleSearch(stockName)} disabled={!stockName} sx={{ color: "black" }}>
        <SearchIcon />
      </IconButton>
    </Box>
  );
};

export default StockSearch;
