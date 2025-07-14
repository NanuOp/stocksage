import React, { useState, useEffect } from "react";
import { 
  Card, CardContent, Typography, Box, CircularProgress, 
  Divider, Chip, Grid, Alert, Button, LinearProgress, Avatar,
  Paper, List, ListItem, ListItemIcon, ListItemText
} from "@mui/material";
import {
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Insights as InsightsIcon,
  ShowChart as ChartIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Timeline as TimelineIcon,
  ExpandMore as ExpandMoreIcon
} from "@mui/icons-material";
import axios from "axios";
import { useSnackbar } from "notistack";

const AIPredictionSection = ({ stockCode, colors }) => {
  const [predictionData, setPredictionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const { enqueueSnackbar } = useSnackbar();
  const API_BASE_URL = "http://localhost:5000";
  const PREDICTION_TIMEOUT = 50000; // 50 seconds

  useEffect(() => {
    let progressInterval;
    let timeoutId;

    const fetchPrediction = async () => {
      setIsLoading(true);
      setError(null);
      setProgress(0);
      setPredictionData(null);

      // Start progress simulation
      progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + Math.random() * 10, 90));
      }, 1000);

      timeoutId = setTimeout(() => {
        clearInterval(progressInterval);
        setError("Prediction took too long to complete");
        setIsLoading(false);
      }, PREDICTION_TIMEOUT);

      try {
        // Format the ticker correctly (ensure .NS suffix)
        const formattedTicker = stockCode.includes('.') ? stockCode : `${stockCode}.NS`;
        
        const response = await axios.get(`${API_BASE_URL}/predict`, {
          params: { ticker: formattedTicker },
          timeout: PREDICTION_TIMEOUT
        });

        clearTimeout(timeoutId);
        clearInterval(progressInterval);
        setProgress(100);

        if (response.data.status === 'success') {
          setPredictionData(response.data);
          enqueueSnackbar('Prediction completed successfully', { variant: 'success' });
        } else {
          setError(response.data.message || "Failed to fetch prediction data");
          enqueueSnackbar('Prediction failed', { variant: 'error' });
        }
      } catch (err) {
        clearInterval(progressInterval);
        setProgress(0);
        
        if (axios.isCancel(err)) {
          setError("Prediction request was cancelled");
        } else if (err.code === 'ECONNABORTED') {
          setError("Prediction took too long to complete");
        } else {
          setError(err.response?.data?.message || "Error connecting to prediction service");
          console.error("Error fetching prediction:", err);
        }
        enqueueSnackbar('Error getting prediction', { variant: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    if (stockCode) {
      fetchPrediction();
    }

    return () => {
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
    };
  }, [stockCode, enqueueSnackbar]);

  const getTrendIcon = (predicted, current) => {
    const difference = predicted - current;
    if (difference > 0) {
      return <TrendingUpIcon color="success" />;
    } else if (difference < 0) {
      return <TrendingDownIcon color="error" />;
    }
    return <TimelineIcon color="info" />;
  };

  const getRecommendationColor = (recommendation) => {
    const colors = {
      'Buy': '#4caf50',
      'Strong Buy': '#2e7d32',
      'Hold': '#ff9800',
      'Sell': '#f44336',
      'Strong Sell': '#c62828'
    };
    return colors[recommendation] || '#6a1b9a';
  };

  const renderLoadingState = () => (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography variant="h6" gutterBottom>
        Analyzing Market Data for {stockCode}...
      </Typography>
      <LinearProgress 
        variant="determinate" 
        value={progress} 
        sx={{ height: 10, mb: 3, borderRadius: 5 }}
      />
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {Math.round(progress)}% complete
      </Typography>
      <CircularProgress size={60} thickness={4} />
      <Typography variant="caption" display="block" sx={{ mt: 2 }}>
        Processing historical patterns and technical indicators...
      </Typography>
    </Box>
  );

  const renderErrorState = () => (
    <Box sx={{ p: 3 }}>
      <Alert severity="error" sx={{ mb: 2 }}>
        {error || "Failed to load prediction data"}
      </Alert>
      <Button 
        variant="contained" 
        onClick={() => window.location.reload()}
        startIcon={<PsychologyIcon />}
        sx={{ mt: 1 }}
      >
        Retry Prediction
      </Button>
    </Box>
  );

  const renderPredictionCard = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: '#6a1b9a', mr: 2 }}>
            <ChartIcon />
          </Avatar>
          <Typography variant="h6">Price Prediction for {stockCode}</Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Current Market</Typography>
              <Typography variant="h4" color="primary" fontWeight="bold">
                ₹{predictionData.prediction.current_price.toFixed(2)}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ 
              p: 2, 
              mb: 2,
              backgroundColor: predictionData.prediction.predicted_price > predictionData.prediction.current_price 
                ? 'rgba(76, 175, 80, 0.1)' 
                : 'rgba(244, 67, 54, 0.1)'
            }}>
              <Typography variant="subtitle1" gutterBottom>AI Prediction</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {getTrendIcon(
                  predictionData.prediction.predicted_price,
                  predictionData.prediction.current_price
                )}
                <Typography variant="h4" fontWeight="bold" sx={{ ml: 1 }}>
                  ₹{predictionData.prediction.predicted_price.toFixed(2)}
                </Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Confidence Level</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%', mr: 2 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={predictionData.prediction.confidence}
                    color={
                      predictionData.prediction.confidence > 70 ? 'success' :
                      predictionData.prediction.confidence > 40 ? 'warning' : 'error'
                    }
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
                <Typography variant="body1" fontWeight="bold">
                  {predictionData.prediction.confidence.toFixed(1)}%
                </Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>AI Recommendation</Typography>
              <Chip
                label={predictionData.analysis.recommendation.recommendation}
                sx={{
                  bgcolor: getRecommendationColor(predictionData.analysis.recommendation.recommendation),
                  color: 'white',
                  fontSize: '1rem',
                  height: 36,
                  fontWeight: 'bold'
                }}
              />
              <Typography variant="body2" sx={{ mt: 1 }}>
                {predictionData.analysis.recommendation.rationale}
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>
                <CheckCircleIcon color="success" sx={{ verticalAlign: 'middle', mr: 1 }} />
                Key Strengths
              </Typography>
              <List dense>
                {predictionData.analysis.recommendation.drivers.map((item, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckCircleIcon color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={item} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>
                <WarningIcon color="error" sx={{ verticalAlign: 'middle', mr: 1 }} />
                Potential Risks
              </Typography>
              <List dense>
                {predictionData.analysis.recommendation.risks.map((item, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <WarningIcon color="error" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={item} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
          
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Market Context</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                {predictionData.analysis.market_context}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ mt: 4 }}>
      {isLoading && renderLoadingState()}
      {error && renderErrorState()}
      {predictionData && renderPredictionCard()}
      
      {!isLoading && !error && !predictionData && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No prediction data available for {stockCode}
        </Alert>
      )}
    </Box>
  );
};

export default AIPredictionSection;
