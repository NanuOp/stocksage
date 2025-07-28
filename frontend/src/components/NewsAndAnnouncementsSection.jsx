import React, { useState, useRef, useEffect } from 'react';
import { Box, Card, CardContent, Typography, IconButton, Button, CircularProgress } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { format, parseISO } from 'date-fns';
import axios from 'axios'; // Import axios for API calls

const NewsAndAnnouncementsSection = ({ 
  newsData, 
  announcementsData, 
  isLoadingNews, 
  isLoadingAnnouncements, 
  stockCode, 
  colors,
  dividendsData, // New prop for dividends
  splitsData // New prop for splits
}) => {
  const [activeContentTab, setActiveContentTab] = useState('news');
  const [eventsData, setEventsData] = useState([]); // New state for events
  const [isLoadingEvents, setIsLoadingEvents] = useState(true); // New state for events loading
  const newsContainerRef = useRef(null);
  const announcementsContainerRef = useRef(null);
  const eventsContainerRef = useRef(null); // New ref for events scroll

  const API_BASE_URL = "https://d8b089cf382c.ngrok-free.app/api";

  // Helper function for date parsing to normalize for comparison
  const parseDateString = (dateString) => {
    try {
      // Try parsing as ISO first (e.g., YYYY-MM-DD)
      let date = parseISO(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }
      // Try parsing DD-Mon-YYYY HH:mm:ss
      const parts = dateString.match(/(\d{2})-(\w{3})-(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
      if (parts) {
        const months = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        return new Date(parts[3], months[parts[2]], parts[1], parts[4], parts[5], parts[6]);
      }
      // Fallback for YYYY-MM-DD HH:mm:ss
      const simpleDateTimeParts = dateString.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
      if (simpleDateTimeParts) {
          return new Date(simpleDateTimeParts[1]);
      }
      return null;
    } catch (e) {
      console.error("Error parsing date in helper:", dateString, e);
      return null;
    }
  };

  // Fetch events data on component mount or stockCode change
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoadingEvents(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/stock/${stockCode}/events/`);
        if (response.data.success && response.data.events) {
          const filteredAndFormattedEvents = response.data.events
            .filter(event => 
              event.subject && 
              (event.subject.toLowerCase().includes('split') || event.subject.toLowerCase().includes('dividend'))
            )
            .map((event, index) => {
                let title = event.subject;
                let summary = event.subject;
                const eventDate = parseDateString(event.date); // Parse event date for comparison

                if (event.subject.toLowerCase().includes('dividend') && dividendsData) {
                    // Try to find a matching dividend in the dividendsData prop
                    const matchingDividend = dividendsData.find(div => {
                        const divDate = parseISO(div.date); // Dividends date is YYYY-MM-DD
                        // Compare only date parts for a match
                        return eventDate && divDate && eventDate.toDateString() === divDate.toDateString();
                    });

                    if (matchingDividend) {
                        title = `Dividend Declared`; // More generic title for display
                        summary = `${event.subject} (Amount: ₹${Number(matchingDividend.amount).toFixed(2)})`;
                    }
                } else if (event.subject.toLowerCase().includes('split') && splitsData) {
                    // Try to find a matching split in the splitsData prop
                    const matchingSplit = splitsData.find(spl => {
                        const splitDate = parseISO(spl.date); // Splits date is YYYY-MM-DD
                        return eventDate && splitDate && eventDate.toDateString() === splitDate.toDateString();
                    });
                    if (matchingSplit) {
                        title = `Stock Split`; // More generic title for display
                        summary = `${event.subject} (Ratio: ${matchingSplit.split_ratio})`;
                    }
                }

                return {
                    id: index,
                    title: title,
                    summary: summary,
                    publishedDate: event.date,
                    url: event.attachment,
                    source: "Corporate Event"
                };
            });
          setEventsData(filteredAndFormattedEvents);
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

    fetchEvents();
  }, [stockCode, dividendsData, splitsData]); // Add dividendsData and splitsData to dependency array

  const formatTimestamp = (dateString) => {
    try {
      const date = parseISO(dateString);
      if (isNaN(date.getTime())) {
        const parts = dateString.match(/(\d{2})-(\w{3})-(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
        if (parts) {
          const months = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
          };
          const d = new Date(parts[3], months[parts[2]], parts[1], parts[4], parts[5], parts[6]);
          return format(d, 'MMM dd, yyyy HH:mm:ss zzz');
        }
        const simpleDateTimeParts = dateString.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
        if (simpleDateTimeParts) {
            const d = new Date(simpleDateTimeParts[1]);
            return format(d, 'MMM dd, yyyy HH:mm:ss zzz');
        }
        return dateString;
      }
      return format(date, 'MMM dd, yyyy HH:mm:ss zzz');
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return dateString;
    }
  };

  const scrollNews = (direction) => {
    if (newsContainerRef.current) {
      const scrollAmount = 350;
      const scrollPosition = direction === 'right' 
        ? newsContainerRef.current.scrollLeft + scrollAmount 
        : newsContainerRef.current.scrollLeft - scrollAmount;
      
      newsContainerRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  };

  const scrollAnnouncements = (direction) => {
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

  const scrollEvents = (direction) => { // New scroll function for events
    if (eventsContainerRef.current) {
      const scrollAmount = 350; 
      const scrollPosition = direction === 'right' 
        ? eventsContainerRef.current.scrollLeft + scrollAmount 
        : eventsContainerRef.current.scrollLeft - scrollAmount;
      
      eventsContainerRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <Box sx={{ 
      mb: 3,
      overflow: "hidden",
      bgcolor: colors.background, // Changed to colors.background
      borderRadius: 2, // Changed to 8 for more rounded look
      boxShadow: 0, 
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', px: 3, pt: 2 }}> {/* Changed to flex-start and added px, pt */}
        <Box 
          onClick={() => setActiveContentTab('news')}
          sx={{
            textAlign: 'left', // Align text to left
            py: 2,
            px: 3, // Add horizontal padding
            cursor: 'pointer',
            bgcolor: activeContentTab === 'news' ? colors.background : colors.background, // Adjusted bgcolor
            borderBottom: activeContentTab === 'news' ? `1px solid ${colors.headerAccent}` : 'none',
            transition: 'background-color 0.3s ease',
            mr: 1 // Add margin right for spacing between tabs
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
          onClick={() => setActiveContentTab('events')} 
          sx={{
            textAlign: 'left', // Align text to left
            py: 2,
            px: 3, // Add horizontal padding
            cursor: 'pointer',
            bgcolor: activeContentTab === 'events' ? colors.background: colors.background, // Adjusted bgcolor
            borderBottom: activeContentTab === 'events' ? `1px solid ${colors.headerAccent}` : 'none',
            transition: 'background-color 0.3s ease',
            mr: 1 // Add margin right for spacing between tabs
          }}
        >
          <Typography 
            variant="h6" 
            fontWeight="bold" 
            sx={{ color: activeContentTab === 'events' ? colors.headerAccent : colors.textSecondary }}
          >
            Corporate Events
          </Typography>
        </Box>
        <Box 
          onClick={() => setActiveContentTab('announcements')}
          sx={{
            textAlign: 'left', // Align text to left
            py: 2,
            px: 3, // Add horizontal padding
            cursor: 'pointer',
            bgcolor: activeContentTab === 'announcements' ? colors.background : colors.background, // Adjusted bgcolor
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

      <CardContent sx={{ p: 3, bgcolor: colors.cardBg }}> {/* Changed bgcolor to colors.cardBg */}
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
                      borderRadius: 2, /* Added borderRadius: 2 */
                      boxShadow: 0, 
                      bgcolor: '#000000', /* Changed to black */
                      border: `1px solid ${colors.divider}`, /* Added border for consistency */
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-2px)", 
                        boxShadow: 3, 
                        borderColor: colors.headerAccent /* Added border color on hover */
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

        {activeContentTab === 'events' && ( // New Events Content
          isLoadingEvents ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: colors.headerAccent }} />
            </Box>
          ) : eventsData.length > 0 ? (
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
                ref={eventsContainerRef}
              >
                <Box sx={{ display: "flex", gap: 3, minWidth: 400 }}> 
                  {eventsData.map((event, index) => (
                    <Card key={event.id || index} sx={{ 
                      minWidth: 350,
                      height: 250, 
                      display: "flex", 
                      flexDirection: "column", 
                      borderRadius: 2, /* Added borderRadius: 2 */
                      boxShadow: 0, 
                      bgcolor: '#000000', /* Changed to black */
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
                          {event.title}
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
                          {event.summary}
                        </Typography>
                        <Box sx={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          mt: "auto", 
                          pt: 1,
                          borderTop: `1px solid ${colors.divider}` 
                        }}>
                          <Typography variant="caption" fontWeight="medium" sx={{ color: colors.textSecondary }}>
                            {event.source}
                          </Typography>
                          <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                            {formatTimestamp(event.publishedDate)}
                          </Typography>
                        </Box>
                      </CardContent>
                      <Box sx={{ mt: "auto", p: 1, bgcolor: colors.background, borderTop: `1px solid ${colors.divider}` }}>
                        <Button 
                          variant="text" 
                          size="small" 
                          sx={{ color: colors.headerAccent, fontWeight: "medium" }}
                          href={event.url}
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
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <IconButton 
                  size="small" 
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.15)', 
                    color: colors.textPrimary,
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' },
                    mr: 1
                  }}
                  onClick={() => scrollEvents('left')}
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
                  onClick={() => scrollEvents('right')}
                >
                  <ArrowForwardIcon fontSize="small" />
                </IconButton>
              </Box>
            </>
          ) : (
            <Typography variant="body1" sx={{ textAlign: 'center', py: 3, color: colors.textSecondary }}>
              No corporate events available for {stockCode}.
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
                    backgroundColor: colors.background, 
                    borderRadius: "10px"
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "#2C2C30", 
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
                      borderRadius: 2, /* Added borderRadius: 2 */
                      boxShadow: 0, 
                      bgcolor: '#000000', /* Changed to black */
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
  );
};

export default NewsAndAnnouncementsSection;
