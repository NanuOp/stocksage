import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { 
  Container, Typography, Grid, Card, CardContent, Divider, 
  Box,IconButton, Button, CircularProgress 
} from "@mui/material";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Navbar from "../components/Navbar";
import StockChart from "../components/StockChart";
import AIAnalysisSection from "../components/AIAnalysisSection"; // Import the new component
import "@fontsource/poppins";

const StockDetailsPage = () => {
  const { stockCode } = useParams();
  const [stockData, setStockData] = useState(null);
  const [newsData, setNewsData] = useState([]);
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const newsContainerRef = useRef(null);
  const API_BASE_URL = "http://localhost:8000/api";

  const fetchStockDetails = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/stock/${stockCode}/`);
      if (response.data.success) {
        setStockData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching stock details:", error);
    }
  };

  const fetchStockNews = async () => {
    setIsLoadingNews(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/news/${stockCode}/`);
      if (response.data.success && response.data.articles) {
        const formattedNews = response.data.articles.map((article, index) => ({
          id: index,
          title: article.title,
          summary: article.description || article.title,
          source: article.source,
          publishedDate: article.publishedAt,
          url: article.url,
          imageUrl: article.urlToImage
        }));
        setNewsData(formattedNews);
      } else {
        setNewsData([]);
      }
    } catch (error) {
      console.error("Error fetching stock news:", error);
      setNewsData([]);
    } finally {
      setIsLoadingNews(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line 
    fetchStockDetails();
// eslint-disable-next-line 
    fetchStockNews();
    // eslint-disable-next-line 
    const interval = setInterval(fetchStockDetails, 60000);
    // eslint-disable-next-line 
    return () => clearInterval(interval);
    // eslint-disable-next-line 
  }, [stockCode]);



  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const scrollNews = (direction) => {
    if (newsContainerRef.current) {
      const scrollAmount = 300;
      const scrollPosition = direction === 'right' 
        ? newsContainerRef.current.scrollLeft + scrollAmount 
        : newsContainerRef.current.scrollLeft - scrollAmount;
      
      newsContainerRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  };

  const colors = {
    background: "#A6C4B4",
    headerBg: "#2E5E46",
    cardBg: "#FFFFFF",
    positiveTrend: "#28a745",
    negativeTrend: "#dc3545",
    divider: "#2E5E46",
    dataItemBg: "#E8F4EE",
    chartBg: "#FFFFFF",
    cardHeaderBg: "#84A98C",
    businessSummaryBg: "#E8F4EE",
    newsBg: "#F5F8F6",
    newsCardBg: "#FFFFFF",
    newsBorder: "#84A98C",
    newsHeader: "#2C5282"
  };

  if (!stockData) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", bgcolor: colors.background }}>
        <Typography variant="h6" sx={{ fontFamily: "Poppins, sans-serif", color: colors.headerBg }}>
          Loading...
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Navbar />
      
      <Container maxWidth={false} sx={{ fontFamily: "Poppins, sans-serif", pt: 4, pb: 4, px: 6, bgcolor: colors.background, minHeight: "calc(100vh - 64px)" }}>
        {/* Stock Header */}
        <Box sx={{ 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "flex-start", 
          mb: 4, 
          p: 3, 
          bgcolor: colors.background,
          color: "white",
        }}>
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            {stockData.longName} ({stockData.symbol})
          </Typography>
          <Typography
            variant="h5"
            sx={{ 
              color: stockData.change?.startsWith("+") ? colors.positiveTrend : colors.negativeTrend, 
              mb: 1,
              fontWeight: "bold"
            }}
          >
            ₹ {Number(stockData.realTimePrice).toFixed(2)} 
({stockData.change} / {stockData.pChange})

)

          </Typography>
          <Typography variant="subtitle2" color="white" gutterBottom>
            Updated on: {stockData.updatedOn}
          </Typography>
        </Box>

        {/* Financial Metrics Grid */}
        <Grid container spacing={3}>
          {[
            { title: "Financials", color: "#4A7856" },
            { title: "Valuation Ratios", color: "#3A6A79" },
            { title: "Trading Volume", color: "#5D4A78" },
            { title: "Stock Performance", color: "#78574A" }
          ].map((section, index) => (
            <Grid item xs={12} md={3} key={index}>
              <Card sx={{ 
                borderRadius: 4, 
                boxShadow: 3, 
                height: "100%",
                overflow: "hidden"
              }}>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: section.color, 
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: 1
                }}>
                  <Typography variant="h6" fontWeight="bold">
                    {section.title}
                  </Typography>
                </Box>
                <CardContent sx={{ bgcolor: colors.cardBg, p: 2 }}>
                  <Grid container spacing={1}>
                    {(() => {
                      switch (section.title) {
                        case "Financials":
                          return [
                            `Stock P/E: ${stockData.trailingPE}`,
                            `Market Cap: ₹ ${stockData.marketCap?.toLocaleString()}`,
                            stockData.totalRevenue && `Total Revenue: ₹ ${stockData.totalRevenue?.toLocaleString()}`,
                            stockData.debtToEquity && `Debt to Equity: ${stockData.debtToEquity}`,
                            stockData.grossProfits && `Gross Profits: ₹ ${stockData.grossProfits?.toLocaleString()}`,
                          ];
                        case "Valuation Ratios":
                          return [
                            `Beta: ${stockData.beta}`,
                            `Trailing P/E: ${stockData.trailingPE}`,
                            stockData.forwardPE && `Forward P/E: ${stockData.forwardPE}`,
                            stockData.bookValue && `Book Value: ₹ ${stockData.bookValue}`,
                            stockData.priceToBook && `Price to Book Ratio: ${stockData.priceToBook}`,
                          ];
                        case "Trading Volume":
                          return [
                            `Previous Close: ₹ ${stockData.regularMarketPreviousClose}`,
                            `Market Open: ₹ ${stockData.regularMarketOpen}`,
                            `Day High/Low: ₹ ${stockData.dayHigh} / ₹ ${stockData.dayLow}`,
                            `Regular Volume: ${stockData.regularMarketVolume?.toLocaleString()}`,
                            `Average Volume: ${stockData.averageVolume?.toLocaleString()}`,
                          ];
                        case "Stock Performance":
                          return [
                            `Previous Close: ₹ ${stockData.regularMarketPreviousClose}`,
                            `Open: ₹ ${stockData.regularMarketOpen}`,
                            `52-Week High/Low: ₹ ${stockData.fiftyTwoWeekHigh} / ₹ ${stockData.fiftyTwoWeekLow}`,
                          ];
                        default:
                          return [];
                      }
                    })().map((text, idx) => text && (
                      <Grid item xs={12} key={idx}>
                        <Card sx={{ 
                          p: 1, 
                          bgcolor: colors.dataItemBg, 
                          boxShadow: 1, 
                          borderLeft: `4px solid ${section.color}`,
                          transition: "all 0.3s ease",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: 3
                          }
                        }}>
                          <CardContent sx={{ p: "8px !important" }}>
                            <Typography variant="body2" fontWeight="medium">{text}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Divider sx={{ my: 3}} />

        {/* Business Summary Section */}
        <Card sx={{ 
          borderRadius: 4, 
          boxShadow: 3, 
          mb: 3,
          overflow: "hidden"
        }}>
          <Box sx={{ 
            p: 2, 
            bgcolor: colors.headerBg, 
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: 1
          }}>
            <Typography variant="h6" fontWeight="bold">
              Business Summary
            </Typography>
          </Box>
          <CardContent sx={{ bgcolor: colors.businessSummaryBg, p: 3 }}>
            <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
              {stockData.longBusinessSummary || 
               `${stockData.longName}, together with its subsidiaries, provides consulting, technology, outsourcing, and next-generation digital services.`}
            </Typography>
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'white', p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Industry</Typography>
                  <Typography variant="body1" fontWeight="medium">{stockData.industry || "Information Technology Services"}</Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'white', p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Sector</Typography>
                  <Typography variant="body1" fontWeight="medium">{stockData.sector || "Technology"}</Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'white', p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Employees</Typography>
                  <Typography variant="body1" fontWeight="medium">{stockData.fullTimeEmployees?.toLocaleString() || "Unknown"}</Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'white', p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Website</Typography>
                  <Typography variant="body1" fontWeight="medium" sx={{ 
                    overflow: "hidden", 
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}>
                    <a href={stockData.website} target="_blank" rel="noopener noreferrer" style={{ color: colors.headerBg }}>
                      {stockData.website || "https://www.company.com"}
                    </a>
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        
        {/* News Section */}
        <Card sx={{ 
          borderRadius: 4, 
          boxShadow: 3, 
          mb: 3,
          overflow: "hidden"
        }}>
          <Box sx={{ 
            p: 2, 
            bgcolor: colors.newsHeader, 
            color: "white",
            display: "flex",
            alignItems: "center"
          }}>
            <NewspaperIcon sx={{ mr: 1 }} />
            <Typography variant="h6" fontWeight="bold">
              Latest News 
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            {newsData.length > 0 && (
              <Box sx={{ display: "flex", gap: 1 }}>
                <IconButton 
                  size="small" 
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.15)', 
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' } 
                  }}
                  onClick={() => scrollNews('left')}
                >
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
                <IconButton 
                  size="small" 
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.15)', 
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' } 
                  }}
                  onClick={() => scrollNews('right')}
                >
                  <ArrowForwardIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Box>
          <CardContent sx={{ bgcolor: colors.newsBg, p: 3 }}>
            {isLoadingNews ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : newsData.length > 0 ? (
              <>
                <Box 
                  sx={{ 
                    display: "flex", 
                    overflowX: "auto", 
                    pb: 3,
                    scrollbarWidth: "thin",
                    "&::-webkit-scrollbar": { height: "8px" },
                    "&::-webkit-scrollbar-track": { 
                      backgroundColor: "#f1f1f1",
                      borderRadius: "10px"
                    },
                    "&::-webkit-scrollbar-thumb": {
                      backgroundColor: "#cccccc",
                      borderRadius: "10px",
                      "&:hover": { backgroundColor: "#aaaaaa" }
                    }
                  }}
                  ref={newsContainerRef}
                >
                  <Box sx={{ display: "flex", gap: 2,  minWidth: 400 }}>
                    {newsData.map((news) => (
                      <Card key={news.id} sx={{ 
                        minWidth: 350,
                        height: 250,
                        display: "flex", 
                        flexDirection: "column", 
                        borderRadius: 2,
                        boxShadow: 2,
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: 4
                        }
                      }}>
                        <CardContent sx={{ flexGrow: 1, p: 2 }}>
                          <Typography 
                            variant="subtitle1" 
                            fontWeight="bold" 
                            gutterBottom 
                            sx={{ 
                              color: colors.headerBg,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              height: "48px"
                            }}
                          >
                            {news.title}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              mb: 2, 
                              color: "text.secondary",
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              height: "72px"
                            }}
                          >
                            {news.summary}
                          </Typography>
                          <Box sx={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            mt: "auto", 
                            pt: 1,
                            borderTop: "1px solid #eaeaea"
                          }}>
                            <Typography variant="caption" fontWeight="medium" color="text.secondary">
                              {news.source}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(news.publishedDate)}
                            </Typography>
                          </Box>
                        </CardContent>
                        <Box sx={{ mt: "auto", p: 1, bgcolor: "#f5f5f5", borderTop: "1px solid #eaeaea" }}>
                          <Button 
                            variant="text" 
                            size="small" 
                            sx={{ color: colors.newsHeader, fontWeight: "medium" }}
                            href={news.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Read More
                          </Button>
                        </Box>
                      </Card>
                    ))}
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Scroll horizontally to view all news articles
                </Typography>
              </>
            ) : (
              <Typography variant="body1" sx={{ textAlign: 'center', py: 3 }}>
                No news articles available for {stockCode}.
              </Typography>
            )}
          </CardContent>
        </Card>
        
        {/* AI Analysis Section */}
        <AIAnalysisSection stockCode={stockCode} colors={colors} />
        
        <Divider sx={{ my: 3, borderColor: colors.divider, borderWidth: 2 }} />

        {/* Stock Chart Section */}
        <Box sx={{ mt: 4 }}>
          <Card sx={{ p: 3, borderRadius: 4, bgcolor: colors.chartBg }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ color: colors.headerBg }}>
              <TrendingUpIcon sx={{ mr: 1, verticalAlign: "text-bottom" }} />
              Stock Price Chart ({stockData.symbol})
            </Typography>
            <StockChart stockCode={stockCode} />
          </Card>
        </Box>
      </Container>
    </>
  );
};

export default StockDetailsPage;
