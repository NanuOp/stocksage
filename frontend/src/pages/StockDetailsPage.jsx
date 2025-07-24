import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Container, Typography, Grid, Card, Divider, CircularProgress, Box 
} from "@mui/material";

// Import newly created components
import StockHeader from "../components/StockHeader";
import KeyMetricsOverview from "../components/KeyMetricsOverview";
import PeersSection from "../components/PeersSection";
import GainersLosersTabs from "../components/GainersLosersTabs";
import FinancialOverviewSection from "../components/FinancialOverviewSection";
import BusinessSummarySection from "../components/BusinessSummarySection";
import NewsAndAnnouncementsSection from "../components/NewsAndAnnouncementsSection";
import FinancialChartsSection from "../components/FinancialChartsSection"; // Import the new component

import Navbar from "../components/Navbar";
import StockChart from "../components/StockChart";
import AIAnalysisSection from "../components/AIAnalysisSection";
import "@fontsource/poppins";

const StockDetailsPage = () => {
  const { stockCode } = useParams();
  const navigate = useNavigate();
  const [stockData, setStockData] = useState(null);
  const [newsData, setNewsData] = useState([]);
  const [announcementsData, setAnnouncementsData] = useState([]);
  const [eventsData, setEventsData] = useState([]); // Added eventsData state
  const [topGainers, setTopGainers] = useState([]);
  const [topLosers, setTopLosers] = useState([]);
  const [peersData, setPeersData] = useState([]);
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true); // Added isLoadingEvents state
  const [isLoadingGainersLosers, setIsLoadingGainersLosers] = useState(true);
  const [isLoadingPeers, setIsLoadingPeers] = useState(true);
  const [dividendsData, setDividendsData] = useState([]); // State for dividends
  const [splitsData, setSplitsData] = useState([]);      // State for splits

  const API_BASE_URL = "http://localhost:8000/api";

  const colors = {
    background: "#1A1A1D",
    cardBg: "#2C2C30",
    headerAccent: "#6A5ACD",
    textPrimary: "#E0E0E0",
    textSecondary: "#A0A0A0",
    positiveTrend: "#4CAF50",
    negativeTrend: "#F44336",
    divider: "#404045",
    buttonBg: "#6A5ACD",
    buttonHoverBg: "#7B68EE",
    newsCardBorder: "#404045",
  };

  const [allFinancialMetrics, setAllFinancialMetrics] = useState([]);

  const fetchStockDetails = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/stock/${stockCode}/`);
      if (response.data.success) {
        const data = response.data.data;
        setStockData(data);
        setDividendsData(response.data.dividends || []); // Set dividends data
        setSplitsData(response.data.splits || []);      // Set splits data

        const metrics = [
          { label: "Prev Close", value: `₹ ${Number(data.regularMarketPreviousClose).toFixed(2)}` },
          { label: "Open", value: `₹ ${Number(data.regularMarketOpen).toFixed(2)}` },
          { label: "24H Volume", value: data.regularMarketVolume?.toLocaleString() },
          { label: "Market Cap", value: `₹ ${data.marketCap?.toLocaleString()}` },
          { label: "P/E Ratio", value: data.trailingPE?.toFixed(2) },
          { label: "Dividend Yield", value: data.dividendYield ? `${(data.dividendYield * 100).toFixed(2)}%` : 'N/A' },
          { label: "Day Range", value: `₹ ${Number(data.dayLow).toFixed(2)} - ₹ ${Number(data.dayHigh).toFixed(2)}` },
          { label: "52W Range", value: `₹ ${Number(data.fiftyTwoWeekLow).toFixed(2)} - ₹ ${Number(data.fiftyTwoWeekHigh).toFixed(2)}` },
          { label: "EPS", value: data.eps?.toFixed(2) },
          { label: "Beta", value: data.beta?.toFixed(2) },
          { label: "Book Value", value: data.bookValue?.toFixed(2) },
          { label: "Price to Book", value: data.priceToBook?.toFixed(2) },
          { label: "Operating Cash Flow", value: data.operatingCashflow ? `₹ ${data.operatingCashflow.toLocaleString()}` : 'N/A' },
          { label: "Free Cash Flow", value: data.freeCashflow ? `₹ ${data.freeCashflow.toLocaleString()}` : 'N/A' },
          { label: "Total Cash", value: data.totalCash ? `₹ ${data.totalCash.toLocaleString()}` : 'N/A' },
          { label: "Borrowing (Total Debt)", value: data.totalDebt ? `₹ ${data.totalDebt.toLocaleString()}` : 'N/A' },
          { label: "Total Revenue", value: data.totalRevenue ? `₹ ${data.totalRevenue.toLocaleString()}` : 'N/A' },
          { label: "Gross Profits", value: data.grossProfits ? `₹ ${data.grossProfits.toLocaleString()}` : 'N/A' },
          { label: "EBITDA", value: data.ebitda ? `₹ ${data.ebitda.toLocaleString()}` : 'N/A' },
          { label: "Net Income", value: data.netIncomeToCommon ? `₹ ${data.netIncomeToCommon.toLocaleString()}` : 'N/A' },
          { label: "Shares Outstanding", value: data.sharesOutstanding ? data.sharesOutstanding.toLocaleString() : 'N/A' },
          { label: "Book Value per Share", value: data.bookValue ? `₹ ${data.bookValue.toFixed(2)}` : 'N/A' },
          { label: "Debt to Equity", value: data.debtToEquity ? data.debtToEquity.toFixed(2) : 'N/A' },
          { label: "Current Ratio", value: data.currentRatio ? data.currentRatio.toFixed(2) : 'N/A' },
          { label: "Quick Ratio", value: data.quickRatio ? data.quickRatio.toFixed(2) : 'N/A' },
          { label: "Return on Assets (%)", value: data.returnOnAssets ? `${(data.returnOnAssets * 100).toFixed(2)}%` : 'N/A' },
          { label: "Return on Equity (%)", value: data.returnOnEquity ? `${(data.returnOnEquity * 100).toFixed(2)}%` : 'N/A' },
          { label: "Profit Margins (%)", value: data.profitMargins ? `${(data.profitMargins * 100).toFixed(2)}%` : 'N/A' },
          { label: "Operating Margins (%)", value: data.operatingMargins ? `${(data.operatingMargins * 100).toFixed(2)}%` : 'N/A' },
          { label: "EBITDA Margins (%)", value: data.ebitdaMargins ? `${(data.ebitdaMargins * 100).toFixed(2)}%` : 'N/A' },
        ].filter(item => item.value !== 'N/A' && item.value !== '₹ NaN');

        setAllFinancialMetrics(metrics);
      }
    } catch (error) {
      console.error("Error fetching stock details:", error);
      setStockData(null);
      setAllFinancialMetrics([]);
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

  const fetchAnnouncements = async () => {
    setIsLoadingAnnouncements(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/announcements/${stockCode}/`);
      
      if (response.data.success && response.data.announcements) {
        const formattedAnnouncements = response.data.announcements.map((announcement, index) => ({
          id: index, 
          title: announcement.subject, 
          summary: announcement.subject, 
          publishedDate: announcement.date, 
          url: announcement.attachment, 
          source: announcement.symbol || "Corporate" 
        }));
        setAnnouncementsData(formattedAnnouncements);
      } else {
        setAnnouncementsData([]);
      }

    } catch (error) {
      console.error("Error fetching announcements:", error);
      setAnnouncementsData([]);
    } finally {
      setIsLoadingAnnouncements(false);
    }
  };

  const fetchEvents = async () => { // Added fetchEvents function
    setIsLoadingEvents(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/stock/${stockCode}/events/`);
      if (response.data.success && response.data.events) {
        const formattedEvents = response.data.events.map((event, index) => ({
          id: index,
          title: event.subject,
          summary: event.subject, 
          publishedDate: event.date,
          url: event.attachment,
          source: "Corporate Event"
        }));
        setEventsData(formattedEvents);
      } else {
        setEventsData([]);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      setEventsData([]);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const fetchTopGainersLosers = async () => {
    setIsLoadingGainersLosers(true);
    try {
      const gainersResponse = await axios.get(`${API_BASE_URL}/top-gainers/`);
      if (gainersResponse.data.success && gainersResponse.data.data) {
        setTopGainers(gainersResponse.data.data);
      } else {
        setTopGainers([]);
      }

      const losersResponse = await axios.get(`${API_BASE_URL}/top-losers/`);
      if (losersResponse.data.success && losersResponse.data.data) {
        setTopLosers(losersResponse.data.data);
      } else {
        setTopLosers([]);
      }
    } catch (error) {
      console.error("Error fetching top gainers/losers:", error);
      setTopGainers([]);
      setTopLosers([]);
    } finally {
      setIsLoadingGainersLosers(false);
    }
  };

  const fetchPeers = async () => {
    setIsLoadingPeers(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/stock/${stockCode}/peers/`);
      if (response.data.success && response.data.peers) {
        const filteredPeers = response.data.peers.slice(0, 5).map(peer => ({
          symbol: peer.security_id,
          name: peer.name,
          industry: peer.industry,
          sectorIndex: peer.sector_index
        }));
        setPeersData(filteredPeers); 
      } else {
        setPeersData([]);
      }
    } catch (error) {
      console.error("Error fetching peers:", error);
      setPeersData([]);
    } finally {
      setIsLoadingPeers(false);
    }
  };

  useEffect(() => {
    fetchStockDetails();
    fetchStockNews();
    fetchAnnouncements();
    fetchEvents(); // Call fetchEvents
    fetchTopGainersLosers();
    fetchPeers();
    const interval = setInterval(fetchStockDetails, 60000);
    return () => {
      clearInterval(interval);
    };
  }, [stockCode]);

  const handleStockClick = (symbol) => {
    if (symbol) {
      navigate(`/stock/${symbol}`);
      window.scrollTo(0, 0);
    } else {
      console.error("Attempted to navigate with an undefined stock symbol.");
    }
  };

  if (!stockData) {
    return (
      <Box sx={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh", 
        bgcolor: colors.background,
        fontFamily: "Poppins, sans-serif"
      }}>
        <CircularProgress sx={{ color: colors.headerAccent }} />
        <Typography variant="h6" sx={{ ml: 2, color: colors.textPrimary }}>
          Loading stock data...
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Navbar /> 
      
      <Container 
        maxWidth={false} 
        sx={{ 
          fontFamily: "Poppins, sans-serif", 
          pt: { xs: 2, sm: 4 }, 
          pb: { xs: 2, sm: 4 }, 
          px: { xs: 2, sm: 6 }, 
          bgcolor: colors.background, 
          minHeight: "calc(100vh - 64px)", 
          color: colors.textPrimary 
        }}
      >
        <StockHeader stockData={stockData} colors={colors} />
        
        <Grid container spacing={3} sx={{ mt: 4 }}>
          <Grid item xs={12} md={8}>
            <Card sx={{ 
              p: { xs: 2, sm: 3 }, 
              borderRadius: 3,
              bgcolor: colors.background, 
              boxShadow: 0, 
            }}> 
              <StockChart stockCode={stockCode} chartBg={colors.background} /> 
            </Card>
          </Grid>

          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column' }}>
            <PeersSection 
              peersData={peersData} 
              isLoadingPeers={isLoadingPeers} 
              colors={colors} 
              handleStockClick={handleStockClick} 
            />
            <GainersLosersTabs 
              topGainers={topGainers} 
              topLosers={topLosers} 
              isLoadingGainersLosers={isLoadingGainersLosers} 
              colors={colors} 
              handleStockClick={handleStockClick} 
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: { xs: 3, sm: 4 }, borderColor: colors.background }} />

        {/* Business Summary and Key Metrics side-by-side (swapped positions) */}
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}> {/* Added flex container styles */}
            <BusinessSummarySection stockData={stockData} colors={colors} />
          </Grid>
          
          <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}> {/* Added flex container styles */}
            <KeyMetricsOverview stockData={stockData} colors={colors} />
          </Grid>
        </Grid>

        <Divider sx={{ my: { xs: 3, sm: 4 }, borderColor: colors.background }} />

        <FinancialOverviewSection 
          allFinancialMetrics={allFinancialMetrics} 
          colors={colors} 
        />
        
        <Divider sx={{ my: { xs: 3, sm: 4 }, borderColor: colors.background }} />

        <FinancialChartsSection stockCode={stockCode} colors={colors} /> {/* NEW COMPONENT */}

        <NewsAndAnnouncementsSection 
          newsData={newsData} 
          announcementsData={announcementsData}
          eventsData={eventsData} 
          isLoadingNews={isLoadingNews} 
          isLoadingAnnouncements={isLoadingAnnouncements} 
          isLoadingEvents={isLoadingEvents} 
          stockCode={stockCode} 
          colors={colors} 
          dividendsData={stockData.dividends || []} // Pass dividends data
          splitsData={stockData.splits || []}      // Pass splits data
        />
        
        <AIAnalysisSection stockCode={stockCode} colors={colors} /> 
        
        <Divider sx={{ my: { xs: 3, sm: 4 }, borderColor: colors.divider, borderWidth: 2 }} />

        <Box sx={{ 
          textAlign: 'left',
          py: 2, 
          color: colors.textSecondary, 
          fontSize: '0.8rem',
          mt: 4 
        }}>
          Created by{" "}
          <a 
            href="https://airzac.com/" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ color: colors.headerAccent, textDecoration: 'none', fontWeight: 'bold' }}
          >
            Airzac Ltd.
          </a>
        </Box>
      </Container>
    </>
  );
};

export default StockDetailsPage;
