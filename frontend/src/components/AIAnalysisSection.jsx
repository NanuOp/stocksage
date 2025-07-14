import React, { useState, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { Box, Card, CardContent, Typography, Grid, CircularProgress, Chip, Button } from "@mui/material";

const AIAnalysisSection = ({ stockCode }) => {
  const [analysisData, setAnalysisData] = useState(null);
  const [parsedData, setParsedData] = useState({ pros: [], cons: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const API_BASE_URL = "http://127.0.0.1:8000/api";

  useEffect(() => {
    if (stockCode) fetchAnalysisData();
  }, [stockCode]);

  useEffect(() => {
    if (analysisData && analysisData.summary) {
      parseAnalysisSummary(analysisData.summary);
    }
  }, [analysisData]);

  const parseAnalysisSummary = (summary) => {
    try {
      // Extract the sections using regex
      const prosRegex = /(?:Top\s*\d*\s*Pros\s*:|Pros\s*:)([\s\S]*?)(?=(?:Top\s*\d*\s*Cons\s*:|Cons\s*:|$))/i;
      const consRegex = /(?:Top\s*\d*\s*Cons\s*:|Cons\s*:)([\s\S]*?)(?=$)/i;
      
      const prosMatch = summary.match(prosRegex);
      const consMatch = summary.match(consRegex);
      
      // Function to extract list items with various formats (numbered, bulleted, or plain lines)
      const extractItems = (text) => {
        if (!text) return [];
        
        // Remove the section header if present
        const cleanedText = text.replace(/^(?:Top\s*\d*\s*Pros\s*:|Pros\s*:|Top\s*\d*\s*Cons\s*:|Cons\s*:)/i, '').trim();
        
        // Split by newlines and process each line
        const lines = cleanedText.split('\n')
          .map(line => line.trim())
          // Remove empty lines and numbering/bullets
          .filter(line => line.length > 0)
          .map(line => {
            // Remove numbering (1., 2., etc.) or bullets (•, -, *)
            return line.replace(/^\d+\.\s*|^[•\-\*]\s*/, '').trim();
          })
          // Filter out any remaining empty items or section headers
          .filter(item => 
            item.length > 3 && 
            !item.match(/^Pros\s*:/i) && 
            !item.match(/^Cons\s*:/i) && 
            !item.match(/^Top\s*\d*\s*Pros\s*:/i) && 
            !item.match(/^Top\s*\d*\s*Cons\s*:/i)
          );
        
        return lines;
      };

      const prosItems = prosMatch ? extractItems(prosMatch[1]) : [];
      const consItems = consMatch ? extractItems(consMatch[1]) : [];
      
      setParsedData({
        pros: prosItems,
        cons: consItems
      });
    } catch (err) {
      console.error("Error parsing summary:", err);
      setParsedData({ pros: [], cons: [] });
    }
  };

  const fetchAnalysisData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/analyze/${stockCode}/`, { timeout: 30000 });
      if (!response.data || !response.data.summary) throw new Error("Invalid response from server");
      setAnalysisData(response.data);
    } catch (error) {
      console.error("Error fetching AI analysis:", error);
      setError("Failed to load AI analysis. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Styles for hover effects
  const cardHoverStyle = {
    transition: 'transform 0.3s, box-shadow 0.3s',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
    }
  };

  const listItemHoverStyle = {
    transition: 'background-color 0.2s, transform 0.2s',
    padding: '8px',
    borderRadius: '4px',
    '&:hover': {
      backgroundColor: '#f5f5f5',
      transform: 'translateX(5px)',
    }
  };

  // Function to render summary without duplicating pros and cons
  const renderFilteredSummary = () => {
    if (!analysisData || !analysisData.summary) return null;
    
    let filteredSummary = analysisData.summary;
    
    // Check if summary contains a pros/cons section and remove it to avoid duplication
    const prosConsPattern = /((?:Top\s*\d*\s*Pros\s*:|Pros\s*:)[\s\S]*?(?:(?:Top\s*\d*\s*Cons\s*:|Cons\s*:)[\s\S]*?)?$)/i;
    const hasProsCons = prosConsPattern.test(filteredSummary);
    
    if (hasProsCons && parsedData.pros.length > 0) {
      // If pros and cons were successfully parsed, remove them from the summary
      filteredSummary = filteredSummary.replace(prosConsPattern, '').trim();
    }
    
    return <ReactMarkdown>{filteredSummary}</ReactMarkdown>;
  };

  return (
    <Card sx={{ borderRadius: 4, boxShadow: 3, mb: 3, overflow: "hidden" }}>
      <Box sx={{ p: 2, bgcolor: "#6B46C1", color: "white" }}>
        <Typography variant="h6" fontWeight="bold">STOCK ANALYSIS</Typography>
      </Box>

      <CardContent sx={{ bgcolor: "#F7F5FF", p: 3 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              Analysis may take up to 30 seconds to load...
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body1" color="error" sx={{ mb: 2 }}>{error}</Typography>
            <Button variant="contained" onClick={fetchAnalysisData} sx={{ bgcolor: "#6B46C1", '&:hover': { bgcolor: "#5D3AAF" } }}>
              Retry
            </Button>
          </Box>
        ) : (
          <>
            {/* Summary - now filtered to avoid duplication */}
            <Typography variant="h6" fontWeight="bold" color="#6B46C1" gutterBottom>SUMMARY</Typography>
            <Card sx={{ 
              p: 2, 
              bgcolor: "white", 
              borderRadius: 2, 
              mb: 3,
              ...cardHoverStyle
            }}>
              {renderFilteredSummary()}
            </Card>

            {/* Pros & Cons */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight="bold" color="#2E7D32" mb={2}>PROS</Typography>
                <Card sx={{ 
                  bgcolor: "white", 
                  p: 3, 
                  borderRadius: 2,
                  ...cardHoverStyle
                }}>
                  <ul style={{ margin: 0, paddingLeft: 24 }}>
                    {parsedData.pros.length > 0 ? (
                      parsedData.pros.map((pro, index) => (
                        <li key={index} style={{ marginBottom: 12 }}>
                          <Typography 
                            variant="body1" 
                            sx={listItemHoverStyle}
                          >
                            {pro}
                          </Typography>
                        </li>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">No pros identified</Typography>
                    )}
                  </ul>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight="bold" color="#C62828" mb={2}>CONS</Typography>
                <Card sx={{ 
                  bgcolor: "white", 
                  p: 3, 
                  borderRadius: 2,
                  ...cardHoverStyle
                }}>
                  <ul style={{ margin: 0, paddingLeft: 24 }}>
                    {parsedData.cons.length > 0 ? (
                      parsedData.cons.map((con, index) => (
                        <li key={index} style={{ marginBottom: 12 }}>
                          <Typography 
                            variant="body1"
                            sx={listItemHoverStyle}
                          >
                            {con}
                          </Typography>
                        </li>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">No cons identified</Typography>
                    )}
                  </ul>
                </Card>
              </Grid>
            </Grid>

            {/* Footer */}
            <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
              <Chip 
                label="Generated By AI System." 
                sx={{ 
                  bgcolor: "#6B46C1", 
                  color: "white", 
                  fontWeight: "medium",
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    bgcolor: "#5D3AAF"
                  }
                }} 
              />
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AIAnalysisSection;
