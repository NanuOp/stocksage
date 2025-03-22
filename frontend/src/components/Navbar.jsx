import React from "react";
import { AppBar, Toolbar, Typography, Box } from "@mui/material";
import { Link, useLocation } from "react-router-dom"; // ✅ Import Link & useLocation
import StockSearch from "./StockSearch"; // Import the search component

const Navbar = () => {
    const location = useLocation(); // Get current route

    return (
        <AppBar 
            position="static" 
            sx={{ 
                backgroundColor: "#F5F5F5", 
                fontFamily: "Poppins, sans-serif", 
                padding: "8px 32px", // ✅ Left & right padding 
                boxShadow: "none" 
            }}
        >
            <Toolbar sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                
                {/* ✅ Clickable Logo to go to Home */}
                <Link to="/" style={{ textDecoration: "none" }}>
                    <Typography variant="h6" sx={{ fontWeight: "bold", color: "#4CAF50", cursor: "pointer" }}>
                        StockSage
                    </Typography>
                </Link>

                {/* ✅ Show search bar ONLY if NOT on the homepage */}
                {location.pathname !== "/" && (
                    <Box sx={{ maxWidth: 350 }}> 
                        <StockSearch isNavbar={true} />
                    </Box>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;
