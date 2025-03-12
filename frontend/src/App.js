import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { CssBaseline, Container } from "@mui/material";
import Navbar from "./components/Navbar.jsx";
import StockSearch from "./components/StockSearch";
import StockDetails from "./components/StockDetails";
import "@fontsource/poppins";

const Home = () => <Container><StockSearch /></Container>;
const About = () => <Container><h2>About StockSage</h2><p>StockSage provides real-time stock analysis...</p></Container>;
const Login = () => <Container><h2>Login</h2><p>Login functionality coming soon...</p></Container>;

function App() {
    return (
        <Router>
            <CssBaseline />
            <Navbar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/login" element={<Login />} />
                <Route path="/stock/:stockCode" element={<StockDetails />} />
            </Routes>
        </Router>
    );
}

export default App;
