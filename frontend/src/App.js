import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { CssBaseline } from "@mui/material";
import HomePage from "./pages/HomePage";
import StockDetailsPage from "./pages/StockDetailsPage"; // Updated import

function App() {
  return (
    <Router>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/stock/:stockCode" element={<StockDetailsPage />} /> {/* Updated Route */}
      </Routes>
    </Router>
  );
}

export default App;
