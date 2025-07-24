import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom"; // Corrected import: removed extra 'router-'
import { 
  Container, Typography, Grid, Card, CardContent, Divider, 
  Box, IconButton, Button, CircularProgress, Tooltip // Import Tooltip
} from "@mui/material";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import TrendingUpIcon from "@mui/icons-material/Newspaper"; // Reusing for announcements
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TrendingDownIcon from '@mui/icons-material/TrendingDown'; // Icon for losers
import BarChartIcon from '@mui/icons-material/BarChart'; // Icon for gainers
import Navbar from "../components/Navbar"; // Assuming Navbar is styled separately
import StockChart from "../components/StockChart"; // Assuming StockChart handles its own dark theme internally
import AIAnalysisSection from "../components/AIAnalysisSection"; // Assuming AIAnalysisSection adapts to colors prop
import "@fontsource/poppins"; // Ensure Poppins font is loaded
import { format, parseISO } from "date-fns"; // Import format and parseISO for date handling

const StockDetailsPage = () => {
  const { stockCode } = useParams();
  const navigate = useNavigate(); // Initialize useNavigate hook
  const [stockData, setStockData] = useState(null);
  const [newsData, setNewsData] = useState([]);
  const [announcementsData, setAnnouncementsData] = useState([]); // State for announcements
  const [topGainers, setTopGainers] = useState([]);
  const [topLosers, setTopLosers] = useState([]);
  const [peersData, setPeersData] = useState([]); // New state for peers data
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true); // State for announcements loading
  const [activeTab, setActiveTab] = useState('gainers'); // Initialize activeTab state for Gainers/Losers
  const [activeContentTab, setActiveContentTab] = useState('news'); // New state for News/Announcements tabs
  const [isLoadingGainersLosers, setIsLoadingGainersLosers] = useState(true);
  const [isLoadingPeers, setIsLoadingPeers] = useState(true); // New state for peers loading
  const newsContainerRef = useRef(null);
  const announcementsContainerRef = useRef(null); // Ref for announcements scroll

  const API_BASE_URL = "http://localhost:8000/api"; // Your backend API base URL

  // Refined Color Palette to match the first image's dark, sleek aesthetic
  const colors = {
    background: "#1A1A1D", // Very dark charcoal/black for main background
    cardBg: "#2C2C30",     // Slightly lighter dark grey for cards
    headerAccent: "#6A5ACD", // Slate Blue for accents (e.g., section headers, active elements)
    textPrimary: "#E0E0E0",  // Light grey for primary text
    textSecondary: "#A0A0A0",// Medium grey for secondary text
    positiveTrend: "#4CAF50", // Green for positive trends
    negativeTrend: "#F44336", // Red for negative trends
    divider: "#404045",      // Darker grey for dividers
    buttonBg: "#6A5ACD",    // Same as headerAccent for buttons
    buttonHoverBg: "#7B68EE",// Lighter accent for button hover
    newsCardBorder: "#404045", // Subtle border for news cards
  };

  // State for all financial metrics, now combined
  const [allFinancialMetrics, setAllFinancialMetrics] = useState([]);

  // Explanations for financial metrics (for tooltips)
  const metricExplanations = {
    "Prev Close": "The closing price of the stock on the previous trading day.",
    "Open": "The price at which the stock started trading at the beginning of the trading day.",
    "24H Volume": "The total number of shares traded for the stock within the last 24 hours.",
    "Market Cap": "Market Capitalization: The total value of a company's outstanding shares, calculated by multiplying the current share price by the number of shares outstanding.",
    "P/E Ratio": "Price-to-Earnings Ratio: A valuation ratio that compares a company's current share price to its earnings per share (EPS).",
    "Dividend Yield": "The dividend per share divided by the share price, expressed as a percentage. It indicates the return on investment from dividends.",
    "Day Range": "The highest and lowest prices at which a stock has traded during the current trading day.",
    "52W Range": "The highest and lowest prices at which a stock has traded over the past 52 weeks (one year).",
    "EPS": "Earnings Per Share: The portion of a company's profit allocated to each outstanding share of common stock.",
    "Beta": "A measure of a stock's volatility in relation to the overall market. A beta of 1 means the stock's price moves with the market.",
    "Book Value": "The total assets of a company minus its total liabilities, representing the net asset value of the company.",
    "Price to Book": "Price-to-Book Ratio: Compares a company's current market price to its book value per share.",
    "Operating Cash Flow": "The cash generated by a company's normal business operations.",
    "Free Cash Flow": "The cash a company generates after accounting for cash outflows to support operations and maintain its capital assets.",
    "Total Cash": "The total amount of cash and cash equivalents a company holds.",
    "Borrowing (Total Debt)": "The total amount of financial obligations owed by a company to its creditors.",
    "Total Revenue": "The total amount of income generated by the sale of goods or services related to the company's primary operations.",
    "Gross Profits": "The profit a company makes after deducting the costs associated with making and selling its products, or providing its services.",
    "EBITDA": "Earnings Before Interest, Taxes, Depreciation, and Amortization: A measure of a company's overall financial performance.",
    "Net Income": "The total profit of a company after all expenses, including taxes and interest, have been deducted from revenue.",
    "Shares Outstanding": "The total number of a company's shares of stock that are currently held by all its shareholders.",
    "Book Value per Share": "The book value of a company divided by the number of shares outstanding.",
    "Debt to Equity": "A financial ratio indicating the relative proportion of shareholders' equity and debt used to finance a company's assets.",
    "Current Ratio": "A liquidity ratio that measures a company's ability to pay off its short-term liabilities with its current assets.",
    "Quick Ratio": "A more stringent liquidity ratio that measures a company's ability to meet its short-term obligations with its most liquid assets.",
    "Return on Assets (%)": "A financial ratio that indicates how profitable a company is in relation to its total assets.",
    "Return on Equity (%)": "A financial ratio that measures the rate of return on the ownership interest (shareholders' equity) of the common stock owners.",
    "Profit Margins (%)": "The percentage of revenue that a company retains as profit. It indicates how many cents of profit are generated for each dollar of revenue.",
    "Operating Margins (%)": "A profitability ratio that measures how much profit a company makes from its operations, after paying for variable costs of production.",
    "EBITDA Margins (%)": "EBITDA divided by revenue, indicating a company's operating profitability as a percentage of its revenue."
  };

  const getMetricExplanation = (label) => metricExplanations[label] || `No detailed explanation available for ${label}.`;

  const fetchStockDetails = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/stock/${stockCode}/`);
      if (response.data.success) {
        const data = response.data.data;
        setStockData(data);

        // Consolidated financial metrics for the "Financial Overview" section
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
          // Cash Flow Metrics
          { label: "Operating Cash Flow", value: data.operatingCashflow ? `₹ ${data.operatingCashflow.toLocaleString()}` : 'N/A' },
          { label: "Free Cash Flow", value: data.freeCashflow ? `₹ ${data.freeCashflow.toLocaleString()}` : 'N/A' },
          { label: "Total Cash", value: data.totalCash ? `₹ ${data.totalCash.toLocaleString()}` : 'N/A' },
          // Balance Sheet Metrics
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
        ].filter(item => item.value !== 'N/A' && item.value !== '₹ NaN'); // Filter out N/A or NaN values

        setAllFinancialMetrics(metrics);
      }
    } catch (error) {
      console.error("Error fetching stock details:", error);
      setStockData(null); // Ensure stockData is null on error to show loading state
      setAllFinancialMetrics([]); // Clear financial data on error
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

  const fetchTopGainersLosers = async () => {
    setIsLoadingGainersLosers(true);
    try {
      // Fetch Top Gainers
      const gainersResponse = await axios.get(`${API_BASE_URL}/top-gainers/`);
      if (gainersResponse.data.success && gainersResponse.data.data) {
        setTopGainers(gainersResponse.data.data);
      } else {
        setTopGainers([]);
      }

      // Fetch Top Losers
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
        // Filter out peers that might not be "popular" or relevant based on some criteria
        // For now, let's just take the first few, or those with meaningful names/industries
        // In a real application, you might filter by market cap, trading volume, etc.
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
    fetchStockDetails(); // This function now handles setting financialStatementData
    fetchStockNews();
    fetchAnnouncements(); // Fetch announcements using the API
    fetchTopGainersLosers(); // Fetch gainers/losers on component mount
    fetchPeers(); // Fetch peers data
    const interval = setInterval(fetchStockDetails, 60000); // Refresh stock details every minute
    // Consider refreshing gainers/losers less frequently if data doesn't change often
    // const gainersLosersInterval = setInterval(fetchTopGainersLosers, 300000); // e.g., every 5 minutes
    return () => {
      clearInterval(interval);
      // clearInterval(gainersLosersInterval);
    };
  }, [stockCode]); // Dependency array ensures effect runs when stockCode changes

  const formatTimestamp = (dateString) => {
    // Expected formats:
    // 1. "YYYY-MM-DDTHH:MM:SSZ" (for news)
    // 2. "DD-Mon-YYYY HH:MM:SS" (for announcements)
    // 3. "YYYY-MM-DD HH:MM:SS" (for stockData.updatedOn)
    try {
      const date = parseISO(dateString); // Attempt to parse ISO format first
      if (isNaN(date.getTime())) { // If ISO parsing fails, try custom parsing
        const parts = dateString.match(/(\d{2})-(\w{3})-(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
        if (parts) {
          const months = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
          };
          // Construct date as YYYY, MonthIndex, DD, HH, MM, SS
          const d = new Date(parts[3], months[parts[2]], parts[1], parts[4], parts[5], parts[6]);
          return format(d, 'MMM dd, yyyy HH:mm:ss zzz'); // Format with local timezone
        }
        // Fallback for "YYYY-MM-DD HH:MM:SS" if parseISO didn't catch it (less common)
        const simpleDateTimeParts = dateString.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
        if (simpleDateTimeParts) {
            const d = new Date(simpleDateTimeParts[1]);
            return format(d, 'MMM dd, yyyy HH:mm:ss zzz');
        }
        return dateString; // Return original string if parsing fails
      }
      return format(date, 'MMM dd, yyyy HH:mm:ss zzz'); // Format with local timezone
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return dateString; // Fallback to original string on error
    }
  };

  const scrollNews = (direction) => {
    if (newsContainerRef.current) {
      const scrollAmount = 350; // Adjusted scroll amount for news cards
      const scrollPosition = direction === 'right' 
        ? newsContainerRef.current.scrollLeft + scrollAmount 
        : newsContainerRef.current.scrollLeft - scrollAmount;
      
      newsContainerRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  };

  const scrollAnnouncements = (direction) => { // New scroll function for announcements
    if (announcementsContainerRef.current) {
      const scrollAmount = 350; 
      const scrollPosition = direction === 'right' 
        ? announcementsContainerRef.current.scrollLeft + scrollAmount 
        : announcementsContainerRef.current.scrollLeft - scrollAmount;
      
      announcementsContainerRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  };

  // Function to handle stock item click and navigate
  const handleStockClick = (symbol) => {
    if (symbol) {
      navigate(`/stock/${symbol}`);
      window.scrollTo(0, 0); // Scroll to top of the new page
    } else {
      console.error("Attempted to navigate with an undefined stock symbol.");
      // Optionally, show a user-friendly message
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
        fontFamily: "Poppins, sans-serif" // Apply font globally here
      }}>
        <CircularProgress sx={{ color: colors.headerAccent }} />
        <Typography variant="h6" sx={{ ml: 2, color: colors.textPrimary }}>
          Loading stock data...
        </Typography>
      </Box>
    );
  }

  // Helper component to render Gainer/Loser lists with high, low, last price, and % change
  const GainerLoserList = ({ data, isGainer, onStockClick }) => ( // Accept onStockClick prop
    <Box sx={{ 
      maxHeight: 400, 
      overflowY: 'auto',
      "&::-webkit-scrollbar": { width: "8px" },
      "&::-webkit-scrollbar-track": { 
        backgroundColor: colors.background, 
        borderRadius: "10px"
      },
      "&::-webkit-scrollbar-thumb": {
        backgroundColor: colors.divider, 
        borderRadius: "10px",
        "&:hover": { backgroundColor: colors.headerAccent } 
      },
      py: 1, 
      px: 1 
    }}>
      {data.length > 0 ? (
        data.map((stock, index) => (
          <Box 
            key={index}
            onClick={() => onStockClick(stock.symbol)} // Use stock.symbol directly
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              py: 1.5, 
              px: 2, 
              mb: 1, 
              bgcolor: colors.background, // Changed from colors.cardBg to colors.background
              borderRadius: 3, // Changed from 0 to 2
              boxShadow: 0, // Subtle shadow
              border: `1px solid ${colors.divider}`, // Add a border
              cursor: 'pointer', // Add cursor pointer
              transition: 'background-color 0.2s, transform 0.2s, box-shadow 0.2s, border-color 0.2s', // Add border-color to transition
              '&:hover': { 
                bgcolor: colors.background, // Ensures it stays colors.background on hover
                transform: 'translateY(-2px)', 
                boxShadow: 3,
                border: `1px solid ${colors.headerAccent}` // Accent border on hover
              }
            }}
          >
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body2" fontWeight="medium" sx={{ color: colors.textPrimary }}>
                {stock.symbol} 
              </Typography>
              {/* Only display highPrice and lowPrice if they are not null and not NaN */}
              {(stock.highPrice !== null && !isNaN(stock.highPrice) && stock.lowPrice !== null && !isNaN(stock.lowPrice)) && (
                <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                  H: ₹{Number(stock.highPrice).toFixed(2)} | L: ₹{Number(stock.lowPrice).toFixed(2)}
                </Typography>
              )}
            </Box>
            <Box sx={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 1 }}> {/* Added gap for icon */}
              <Typography variant="body2" fontWeight="bold" sx={{ color: colors.textPrimary }}>
                {/* Use stock.lastPrice for gainers, stock.ltp for losers */}
                ₹{Number(isGainer ? stock.lastPrice : stock.ltp).toFixed(2)} 
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  // Use stock.pChange for gainers, stock.perChange for losers
                  color: (isGainer && parseFloat(stock.pChange) > 0) || (!isGainer && parseFloat(stock.perChange) > 0) ? colors.positiveTrend : colors.negativeTrend, 
                  fontWeight: 'bold' 
                }}
              >
                {/* Add '+' prefix for positive percentage changes */}
                {parseFloat(isGainer ? stock.pChange : stock.perChange) > 0 ? `+${isGainer ? stock.pChange : stock.perChange}` : (isGainer ? stock.pChange : stock.perChange)}
              </Typography>
              <ArrowForwardIcon sx={{ color: colors.textSecondary, fontSize: 'small' }} /> {/* Forward arrow icon */}
            </Box>
          </Box>
        ))
      ) : (
        <Typography variant="body2" sx={{ textAlign: 'center', py: 2, color: colors.textSecondary }}>
          No data available.
        </Typography>
      )}
    </Box>
  );

  return (
    <>
      {/* Navbar is assumed to be dark themed and consistent */}
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
        {/* Stock Header */}
        <Box sx={{ 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "flex-start", 
          mb: 4, 
          p: { xs: 2, sm: 3 }, 
          bgcolor: colors.background, 
          borderRadius: 3, // Changed from 0 to 2
        }}>
          <Typography variant="h3" fontWeight="bold" gutterBottom sx={{ color: colors.textPrimary, fontSize: { xs: '2rem', sm: '3rem' } }}>
            {stockData.longName} ({stockData.symbol})
          </Typography>
          <Typography
            variant="h5"
            sx={{ 
              color: stockData.change?.startsWith("+") ? colors.positiveTrend : colors.negativeTrend, 
              mb: 1,
              fontWeight: "bold",
              fontSize: { xs: '1.5rem', sm: '2rem' }
            }}
          >
            ₹ {Number(stockData.realTimePrice).toFixed(2)} 
            &nbsp;({stockData.change} / {stockData.pChange})
          </Typography>
          <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>
            Updated on: {formatTimestamp(stockData.updatedOn)}
          </Typography>

          {/* 52-Week High and Low */}
          <Box sx={{ display: 'flex', gap: 3, mt: 1, flexWrap: 'wrap' }}>
            {stockData.fiftyTwoWeekHigh && (
              <Typography variant="body2" sx={{ color: colors.textSecondary, fontWeight: 'medium' }}>
                52-Week High: <span style={{ color: colors.positiveTrend }}>₹ {Number(stockData.fiftyTwoWeekHigh).toFixed(2)}</span>
              </Typography>
            )}
            {stockData.fiftyTwoWeekLow && (
              <Typography variant="body2" sx={{ color: colors.textSecondary, fontWeight: 'medium' }}>
                52-Week Low: <span style={{ color: colors.negativeTrend }}>₹ {Number(stockData.fiftyTwoWeekLow).toFixed(2)}</span>
              </Typography>
            )}
          </Box>
        </Box>
        
        {/* Stock Price Chart and Peers + Gainers/Losers Section (Side-by-Side) */}
        <Grid container spacing={3} sx={{ mt: 4 }}>
          {/* Stock Price Chart - Left Side */}
          <Grid item xs={12} md={8}> {/* Chart takes 8 of 12 columns on medium+ screens */}
            <Card sx={{ 
              p: { xs: 2, sm: 3 }, 
              borderRadius: 3, // Changed from 0 to 2
              bgcolor: colors.background, 
              boxShadow: 0, 
              
            }}> 
              <StockChart stockCode={stockCode} chartBg={colors.background} /> 
            </Card>
          </Grid>

          {/* Right Side: Peers and Top Gainers & Losers (Stacked) */}
          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column' }}> {/* Added flex properties */}
            {/* Peers Section */}
            <Typography variant="h6" fontWeight="bold" color="white" sx={{px: 2, mb: 1.5}}>
              Peers
            </Typography>
            <Card sx={{ 
              mb: 3, // Add margin bottom to separate from gainers/losers
              overflow: "hidden",
              bgcolor: colors.cardBg, 
              borderRadius: 3, // Changed from 0 to 2
              boxShadow: 0, 
              border: `1px solid ${colors.divider}`,
              flexGrow: 1 // Allow this card to grow
            }}>
              <CardContent sx={{ p: 3, borderRadius: 3, minHeight: 150 }}> {/* Changed from 0 to 2 */}
                {isLoadingPeers ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress sx={{ color: colors.headerAccent }} />
                  </Box>
                ) : peersData.length > 0 ? (
                  <Grid container spacing={0} columns={{ xs: 1, sm: 2 }}> 
                    {peersData.map((peer, index) => (
                      <Grid item xs={1} sm={1} key={index}> 
                        <Box 
                          onClick={() => handleStockClick(peer.symbol)} 
                          sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            bgcolor: colors.cardBg, // Changed from colors.cardBg to colors.background
                            py: 1.5, 
                            px: 1, 
                            borderBottom: `1px solid ${colors.divider}`, 
                            color: colors.textPrimary,
                            cursor: 'pointer',
                            transition: 'background-color 0.2s, transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                            '&:hover': { 
                              bgcolor: colors.background, // Ensures it stays colors.background on hover
                              transform: 'translateY(-2px)', 
                              boxShadow: 3,
                              border: `1px solid ${colors.headerAccent}` 
                            }
                          }}
                        >
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body2" fontWeight="medium" sx={{ color: colors.textPrimary }}>{peer.symbol}</Typography>
                            <Typography variant="caption" sx={{ color: colors.textSecondary }}>{peer.name}</Typography>
                          </Box>
                          <ArrowForwardIcon sx={{ color: colors.textSecondary, fontSize: 'small' }} /> 
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" sx={{ textAlign: 'center', py: 2, color: colors.textSecondary }}>
                    No peer data available.
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Top Gainers & Losers Section - Moved here */}
            <Card sx={{ 
              mb: 3,
              overflow: "hidden",
              bgcolor: colors.cardBg, 
              borderRadius: 4, // Changed from 0 to 2
              boxShadow: 0, 
              
              flexGrow: 1 // Allow this card to grow
            }}>
              {/* Tabs Header */}
              <Box sx={{ display: 'flex', borderBottom: `1px solid ${colors.divider}`,borderRadius: 6, }}>
                <Box 
                  onClick={() => setActiveTab('gainers')}
                  sx={{
                    flex: 1,
                    textAlign: 'center',
                    py: 2,
                    cursor: 'pointer',
                    bgcolor: activeTab === 'gainers' ? colors.background : "#1A1A1D", 
                    borderBottom: activeTab === 'gainers' ? `1px solid ${colors.headerAccent}` : 'none',
                    transition: 'background-color 0.3s ease' 
                  }}
                >
                  <Typography 
                    variant="h6" 
                    fontWeight="bold" 
                    sx={{ color: activeTab === 'gainers' ? colors.headerAccent : colors.textSecondary }}
                  >
                    Gainers
                  </Typography>
                </Box>
                <Box 
                  onClick={() => setActiveTab('losers')}
                  sx={{
                    flex: 1,
                    textAlign: 'center',
                    py: 2,
                    cursor: 'pointer',
                    bgcolor: activeTab === 'losers' ? colors.background : "#1A1A1D",
                    borderBottom: activeTab === 'losers' ? `1px solid ${colors.headerAccent}` : 'none',
                    transition: 'background-color 0.3s ease' 
                  }}
                >
                  <Typography 
                    variant="h6" 
                    fontWeight="bold" 
                    sx={{ color: activeTab === 'losers' ? colors.headerAccent : colors.textSecondary }}
                  >
                    Losers
                  </Typography>
                </Box>
              </Box>

              {/* Content */}
              {isLoadingGainersLosers ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress sx={{ color: colors.headerAccent }} />
                </Box>
              ) : (
                <Box sx={{ bgcolor: colors.cardBg }}> 
                  {activeTab === 'gainers' ? (
                    <GainerLoserList data={topGainers} isGainer={true} onStockClick={handleStockClick} />
                  ) : (
                    <GainerLoserList data={topLosers} isGainer={false} onStockClick={handleStockClick} />
                  )}
                </Box>
              )}
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: { xs: 3, sm: 4 }, borderColor: colors.divider }} />

        {/* Summary Key Metrics Panel - Repositioned here */}
        <Card sx={{ 
          mb: 3, 
          p: { xs: 2, sm: 3 }, 
          bgcolor: colors.cardBg, 
          borderRadius: 3, // Changed from 0 to 2
          boxShadow: 0, 
          border: `1px solid ${colors.divider}` 
        }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: colors.headerAccent, mb: 2 }}>
            Key Metrics Overview
          </Typography>
          <Grid container spacing={{ xs: 1, sm: 2 }}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ p: 1.5, bgcolor: colors.background, borderRadius: 3, border: `1px solid ${colors.divider}` }}> {/* Changed from 0 to 2 */}
                <Typography variant="caption" sx={{ color: colors.textSecondary }}>Market Cap</Typography>
                <Typography variant="body1" fontWeight="medium" sx={{ color: colors.textPrimary }}>
                  {stockData.marketCap ? `₹ ${stockData.marketCap.toLocaleString()}` : 'N/A'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ p: 1.5, bgcolor: colors.background, borderRadius: 3, border: `1px solid ${colors.divider}` }}> {/* Changed from 0 to 2 */}
                <Typography variant="caption" sx={{ color: colors.textSecondary }}>P/E Ratio</Typography>
                <Typography variant="body1" fontWeight="medium" sx={{ color: colors.textPrimary }}>
                  {stockData.trailingPE ? stockData.trailingPE.toFixed(2) : 'N/A'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ p: 1.5, bgcolor: colors.background, borderRadius: 3, border: `1px solid ${colors.divider}` }}> {/* Changed from 0 to 2 */}
                <Typography variant="caption" sx={{ color: colors.textSecondary }}>Dividend Yield</Typography>
                <Typography variant="body1" fontWeight="medium" sx={{ color: colors.textPrimary }}>
                  {stockData.dividendYield ? `${(stockData.dividendYield * 100).toFixed(2)}%` : 'N/A'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ p: 1.5, bgcolor: colors.background, borderRadius: 3, border: `1px solid ${colors.divider}` }}> {/* Changed from 0 to 2 */}
                <Typography variant="caption" sx={{ color: colors.textSecondary }}>Profit Margins</Typography>
                <Typography variant="body1" fontWeight="medium" sx={{ color: colors.textPrimary }}>
                  {stockData.profitMargins ? `${(stockData.profitMargins * 100).toFixed(2)}%` : 'N/A'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
          {/* Removed the text: "Note: Financial statement data is fetched from the API where available; otherwise, it's marked as N/A. Hover over metrics for explanations." */}
        </Card>

        <Divider sx={{ my: { xs: 3, sm: 4 }, borderColor: colors.divider }} />

        {/* Unified Financial Overview Section */}
        <Typography variant="h6" fontWeight="bold" color="white" sx={{px: 2, mb: 1.5}}>
          Financial Overview
        </Typography>
        <Card sx={{ 
          mb: 3,
          overflow: "hidden",
          bgcolor: colors.cardBg, 
          borderRadius: 3, // Changed from 0 to 2
          boxShadow: 0, 
          border: `1px solid ${colors.divider}` 
        }}>
          <CardContent sx={{ p: 3, borderRadius: 3 }}> {/* Changed from 0 to 2 */}
            <Grid container spacing={0} columns={{ xs: 1, sm: 2, md: 4, lg: 4 }}> 
              {allFinancialMetrics.map((metric, index) => (
                <Grid item xs={1} sm={1} md={1} lg={1} key={index}> 
                  <Tooltip title={getMetricExplanation(metric.label)} arrow placement="top">
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      bgcolor: colors.cardBg, // Default background
                      py: 1.5, 
                      px: 1, 
                      borderBottom: `1px solid ${colors.divider}`, 
                      color: colors.textPrimary,
                      height: '100%', 
                      cursor: 'help', // Indicate that it's hoverable
                      '&:hover': { 
                        bgcolor: colors.background, // Changed to colors.background for hover
                      }
                    }}>
                      <Typography variant="body2" sx={{ color: colors.textSecondary, flexShrink: 0 }}>{metric.label}</Typography>
                      <Typography variant="body1" fontWeight="medium" sx={{ textAlign: 'right', flexGrow: 1, ml: 1 }}>{metric.value}</Typography>
                    </Box>
                  </Tooltip>
                </Grid>
              ))}
            </Grid>
            {/* Removed the text: "Note: Financial statement data is fetched from the API where available; otherwise, it's marked as N/A. Hover over metrics for explanations." */}
          </CardContent>
        </Card>
        {/* End Unified Financial Overview Section */}

        <Divider sx={{ my: { xs: 3, sm: 4 }, borderColor: colors.divider }} />

        {/* Main Content Area: Business Summary (Now full width on MD+) */}
        <Grid container spacing={3}>
          {/* Business Summary Section - Full Width */}
          <Grid item xs={12} md={12}> {/* Changed to md={12} */}
            <Typography variant="h6" fontWeight="bold" color="white" sx={{px: 2, mb: 1.5}}>
              Business Summary
            </Typography>
            <Card sx={{ 
              mb: 3,
              overflow: "hidden",
              p: 3, 
              bgcolor: colors.cardBg, 
              borderRadius: 3, // Changed from 0 to 2
              boxShadow: 0, 
              border: `1px solid ${colors.divider}`, 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <Typography variant="body1" sx={{ lineHeight: 1.7, color: colors.textPrimary }}>
                {stockData.longBusinessSummary || 
                  `${stockData.longName}, together with its subsidiaries, provides consulting, technology, outsourcing, and next-generation digital services.`}
              </Typography>
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12} sm={6}> 
                  <Box sx={{ bgcolor: colors.background, p: 2, borderRadius: 3, boxShadow: 0, border: `1px solid ${colors.divider}` }}> {/* Changed from 0 to 2 */}
                    <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Industry</Typography>
                    <Typography variant="body1" fontWeight="medium" sx={{ color: colors.textPrimary }}>{stockData.industry || "Information Technology Services"}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ bgcolor: colors.background, p: 2, borderRadius: 3, boxShadow: 0, border: `1px solid ${colors.divider}` }}> {/* Changed from 0 to 2 */}
                    <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Sector</Typography>
                    <Typography variant="body1" fontWeight="medium" sx={{ color: colors.textPrimary }}>{stockData.sector || "Technology"}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ bgcolor: colors.background, p: 2, borderRadius: 3, boxShadow: 0, border: `1px solid ${colors.divider}` }}> {/* Changed from 0 to 2 */}
                    <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Employees</Typography>
                    <Typography variant="body1" fontWeight="medium" sx={{ color: colors.textPrimary }}>{stockData.fullTimeEmployees?.toLocaleString() || "Unknown"}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ bgcolor: colors.background, p: 2, borderRadius: 3, boxShadow: 0, border: `1px solid ${colors.divider}` }}> {/* Changed from 0 to 2 */}
                    <Typography variant="subtitle2" sx={{ color: colors.textSecondary }}>Website</Typography>
                    <Typography variant="body1" fontWeight="medium" sx={{ 
                      overflow: "hidden", 
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      <a href={stockData.website} target="_blank" rel="noopener noreferrer" style={{ color: colors.headerAccent }}>
                        {stockData.website || "https://www.company.com"}
                      </a>
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Card>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: { xs: 3, sm: 4 }, borderColor: colors.divider }} />

        {/* News and Announcements Section (Tabbed) */}
        <Box sx={{ 
          mb: 3,
          overflow: "hidden",
          bgcolor: "#1A1A1D", 
          borderRadius: 3, // Changed from 0 to 2
          boxShadow: 0, 
          
        }}>
          {/* Tabs Header for News and Announcements */}
          <Box sx={{ display: 'flex', }}>
            <Box 
              onClick={() => setActiveContentTab('news')}
              sx={{
                flex: 1,
                textAlign: 'center',
                py: 2,
                cursor: 'pointer',
                
                borderBottom: activeContentTab === 'news' ? `1px solid ${colors.headerAccent}` : 'none',
                transition: 'background-color 0.3s ease' 
              }}
            >
              <Typography 
                variant="h6" 
                fontWeight="bold" 
                sx={{ color: activeContentTab === 'news' ? colors.headerAccent : colors.textSecondary }}
              >
                Latest News
              </Typography>
            </Box>
            <Box 
              onClick={() => setActiveContentTab('announcements')}
              sx={{
                flex: 1,
                textAlign: 'center',
                py: 2,
                cursor: 'pointer',
                
                borderBottom: activeContentTab === 'announcements' ? `1px solid ${colors.headerAccent}` : 'none',
                transition: 'background-color 0.3s ease' 
              }}
            >
              <Typography 
                variant="h6" 
                fontWeight="bold" 
                sx={{ color: activeContentTab === 'announcements' ? colors.headerAccent : colors.textSecondary }}
              >
                Corporate Announcements
              </Typography>
            </Box>
          </Box>

          {/* Content based on activeContentTab */}
          <CardContent sx={{ p: 3 }}>
            {activeContentTab === 'news' && (
              isLoadingNews ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress sx={{ color: colors.headerAccent }} />
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
                        backgroundColor: colors.background, 
                        borderRadius: "10px"
                      },
                      "&::-webkit-scrollbar-thumb": {
                        backgroundColor: "#2C2C30", 
                        borderRadius: "10px",
                        "&:hover": { backgroundColor: colors.headerAccent } 
                      }
                    }}
                    ref={newsContainerRef}
                  >
                    <Box sx={{ display: "flex", gap: 3, minWidth: 400 }}> 
                      {newsData.map((news) => (
                        <Card key={news.id} sx={{ 
                          minWidth: 350,
                          height: 250, 
                          display: "flex", 
                          flexDirection: "column", 
                          borderRadius: 3, // Changed from 0 to 2
                          boxShadow: 0, 
                          bgcolor: "black", 
                          
                          transition: "all 0.3s ease",
                          "&:hover": {
                            transform: "translateY(-2px)", 
                            boxShadow: 3, 
                            
                          }
                        }}>
                          <CardContent sx={{ flexGrow: 1, p: 2, color: colors.textPrimary }}>
                            <Typography 
                              variant="subtitle1" 
                              fontWeight="bold" 
                              gutterBottom 
                              sx={{ 
                                color: colors.headerAccent, 
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
                                color: colors.textSecondary, 
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
                              borderTop: `1px solid ${colors.divider}` 
                            }}>
                              <Typography variant="caption" fontWeight="medium" sx={{ color: colors.textSecondary }}>
                                {news.source}
                              </Typography>
                              <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                {formatTimestamp(news.publishedDate)}
                              </Typography>
                            </Box>
                          </CardContent>
                          <Box sx={{ mt: "auto", p: 1, bgcolor: colors.background, borderTop: `1px solid ${colors.divider}` }}>
                            <Button 
                              variant="text" 
                              size="small" 
                              sx={{ color: colors.headerAccent, fontWeight: "medium" }}
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
                  {/* Removed the text: "Scroll horizontally to view all news articles" */}
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                    <IconButton 
                      size="small" 
                      sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.15)', 
                        color: colors.textPrimary,
                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' },
                        mr: 1
                      }}
                      onClick={() => scrollNews('left')}
                    >
                      <ArrowBackIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.15)', 
                        color: colors.textPrimary,
                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' } 
                      }}
                      onClick={() => scrollNews('right')}
                    >
                      <ArrowForwardIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </>
              ) : (
                <Typography variant="body1" sx={{ textAlign: 'center', py: 3, color: colors.textSecondary }}>
                  No news articles available for {stockCode}.
                </Typography>
              )
            )}

            {activeContentTab === 'announcements' && (
              isLoadingAnnouncements ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress sx={{ color: colors.headerAccent }} />
                </Box>
              ) : announcementsData.length > 0 ? (
                <>
                  <Box 
                    sx={{ 
                      display: "flex", 
                      overflowX: "auto", 
                      pb: 3,
                      scrollbarWidth: "thin",
                      "&::-webkit-scrollbar": { height: "8px" },
                      "&::-webkit-scrollbar-track": { 
                        backgroundColor: "black", 
                        borderRadius: "10px"
                      },
                      "&::-webkit-scrollbar-thumb": {
                        backgroundColor: "black", 
                        borderRadius: "10px",
                        "&:hover": { backgroundColor: colors.headerAccent } 
                      }
                    }}
                    ref={announcementsContainerRef}
                  >
                    <Box sx={{ display: "flex", gap: 3, minWidth: 400 }}> 
                      {announcementsData.map((announcement, index) => (
                        <Card key={announcement.id || index} sx={{ 
                          minWidth: 350,
                          height: 250, 
                          display: "flex", 
                          flexDirection: "column", 
                          borderRadius: 3, // Changed from 0 to 2
                          boxShadow: 0, 
                          bgcolor: "black", 
                          border: `1px solid ${colors.divider}`, 
                          transition: "all 0.3s ease",
                          "&:hover": {
                            transform: "translateY(-2px)", 
                            boxShadow: 3, 
                            borderColor: colors.headerAccent 
                          }
                        }}>
                          <CardContent sx={{ flexGrow: 1, p: 2, color: colors.textPrimary }}>
                            <Typography 
                              variant="subtitle1" 
                              fontWeight="bold" 
                              gutterBottom 
                              sx={{ 
                                color: colors.headerAccent, 
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                height: "48px"
                              }}
                            >
                              {announcement.title}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                mb: 2, 
                                color: colors.textSecondary, 
                                display: "-webkit-box",
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                height: "72px"
                              }}
                            >
                              {announcement.summary}
                            </Typography>
                            <Box sx={{ 
                              display: "flex", 
                              justifyContent: "space-between", 
                              mt: "auto", 
                              pt: 1,
                              borderTop: `1px solid ${colors.divider}` 
                            }}>
                              <Typography variant="caption" fontWeight="medium" sx={{ color: colors.textSecondary }}>
                                {announcement.source || "Corporate"}
                              </Typography>
                              <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                {formatTimestamp(announcement.publishedDate)}
                              </Typography>
                            </Box>
                          </CardContent>
                          <Box sx={{ mt: "auto", p: 1, bgcolor: colors.background, borderTop: `1px solid ${colors.divider}` }}>
                            <Button 
                              variant="text" 
                              size="small" 
                              sx={{ color: colors.headerAccent, fontWeight: "medium" }}
                              href={announcement.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View Document
                            </Button>
                          </Box>
                        </Card>
                      ))}
                    </Box>
                  </Box>
                  {/* Removed the text: "Scroll horizontally to view all announcements" */}
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                    <IconButton 
                      size="small" 
                      sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.15)', 
                        color: colors.textPrimary,
                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' },
                        mr: 1
                      }}
                      onClick={() => scrollAnnouncements('left')}
                    >
                      <ArrowBackIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.15)', 
                        color: colors.textPrimary,
                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' } 
                      }}
                      onClick={() => scrollAnnouncements('right')}
                    >
                      <ArrowForwardIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </>
              ) : (
                <Typography variant="body1" sx={{ textAlign: 'center', py: 3, color: colors.textSecondary }}>
                  No corporate announcements available for {stockCode}.
                </Typography>
              )
            )}
          </CardContent>
        </Box>
        
        {/* AI Analysis Section */}
        <AIAnalysisSection stockCode={stockCode} colors={colors} /> 
        
        <Divider sx={{ my: { xs: 3, sm: 4 }, borderColor: colors.divider, borderWidth: 2 }} />

        {/* Footer */}
        <Box sx={{ 
          textAlign: 'left', // Changed from 'center' to 'left'
          py: 2, 
          color: colors.textSecondary, 
          fontSize: '0.8rem',
          mt: 4 // Add some top margin to separate from content
        }}>
          Created by{" "}
          <a 
            href="https://airzac.com/" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ color: colors.headerAccent, textDecoration: 'none', fontWeight: 'bold' }}
          >
            Airzac
          </a>
        </Box>
      </Container>
    </>
  );
};

export default StockDetailsPage;
