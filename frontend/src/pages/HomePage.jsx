import React from "react";
import { Container, Typography, Box } from "@mui/material";
import Navbar from "../components/Navbar";
import StockSearch from "../components/StockSearch";

const HomePage = () => {
  return (
    <>
      <Navbar />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          bgcolor: "#AFCABA", // ✅ Match background from image
          textAlign: "center",
        }}
      >
        <Typography variant="h3" fontWeight="bold" sx={{ fontFamily: "Poppins, sans-serif", color: "white", mb: 1 }}>
          StockSage
        </Typography>
        <Typography variant="subtitle1" sx={{ fontFamily: "Poppins, sans-serif", color: "white", mb: 3 }}>
          Smart stock analysis and screening for informed investing.
        </Typography>
        <StockSearch />
      </Box>
    </>
  );
};

export default HomePage;
