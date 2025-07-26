import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  TextField,
  Autocomplete,
  IconButton,
  Box,
  CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

const StockSearch = ({ isNavbar = false }) => {
  const [stockName, setStockName] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const API_BASE_URL = "https://94d3be703f4e.ngrok-free.app/api";

  const fetchSuggestions = async (query) => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/suggestions/?q=${encodeURIComponent(query)}`
      );
      if (response.data.success) {
        setSuggestions(response.data.data);
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
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
        padding: "8px 12px",
        width: isNavbar ? "400px" : "700px",
        maxWidth: "90%",
        height: isNavbar ? "45px" : "60px",
        boxShadow: isNavbar ? "none" : "0px 2px 6px rgba(0,0,0,0.2)",
        border: "1px solid #ccc",
        zIndex: 1302,
      }}
    >
      <Autocomplete
        freeSolo
        disablePortal
        autoHighlight
        autoSelect
        options={suggestions}
        value={stockName}
        getOptionLabel={(option) =>
          typeof option === "string" ? option : option.name || ""
        }
        loading={loading}
        onInputChange={(event, newValue, reason) => {
          if (reason === "input") {
            setStockName(newValue);
            fetchSuggestions(newValue);
          }
        }}
        onChange={(event, newValue) => {
          if (newValue) {
            if (typeof newValue === "string") {
              setStockName(newValue);
              fetchSuggestions(newValue);
            } else {
              setStockName(newValue.name);
              handleSearch(newValue.ticker);
            }
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Search for stocks..."
            variant="standard"
            InputProps={{
              ...params.InputProps,
              disableUnderline: true,
              endAdornment: (
                <>
                  {loading && <CircularProgress color="inherit" size={16} />}
                  {params.InputProps.endAdornment}
                </>
              ),
              style: {
                fontSize: "16px",
                padding: "10px",
                height: "100%",
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
      <IconButton
        onClick={() => handleSearch(stockName)}
        disabled={!stockName}
        sx={{ color: "black" }}
      >
        <SearchIcon />
      </IconButton>
    </Box>
  );
};

export default StockSearch;
