import React from "react";
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { Link } from "react-router-dom";

const Navbar = () => {
    return (
        <AppBar position="static" sx={{ backgroundColor: "#1E1E2F", fontFamily: "Poppins, sans-serif" }}>
            <Toolbar>
                <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: "bold" }}>
                    StockSage
                </Typography>
                <Box sx={{ display: "flex", gap: 2 }}>
                    <Button color="inherit" component={Link} to="/" sx={{ fontFamily: "Poppins, sans-serif" }}>
                        Home
                    </Button>
                    <Button color="inherit" component={Link} to="/about" sx={{ fontFamily: "Poppins, sans-serif" }}>
                        About
                    </Button>
                    <Button color="inherit" component={Link} to="/login" sx={{ fontFamily: "Poppins, sans-serif" }}>
                        Login
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;
