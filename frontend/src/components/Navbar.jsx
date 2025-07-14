import React from "react";
import { AppBar, Toolbar, Typography, Box } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import StockSearch from "./StockSearch";

const Navbar = () => {
  const location = useLocation();

  // Hide navbar on homepage
  if (location.pathname === "/") {
    return null;
  }

  // Reusing colors from StockDetailsPage
  const colors = {
    headerBg: "#2E5E46", // Dark green from your theme
    textColor: "#FFFFFF",
  };

  return (
    <AppBar
      position="static"
      sx={{
        bgcolor: colors.headerBg,
        boxShadow: "none",
        padding: "6px 24px",
        zIndex: 1201,
      }}
    >
      <Toolbar sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <Typography
            variant="h5"
            sx={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: "bold",
              color: colors.textColor,
              cursor: "pointer",
            }}
          >
            StockSage
          </Typography>
        </Link>

        <Box sx={{ width: 400, ml: 2 }}>
          <StockSearch isNavbar={true} />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
