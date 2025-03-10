import React, { useState } from "react";
import axios from "axios";

const StockSearch = () => {
  const [stockCode, setStockCode] = useState("");
  const [stockData, setStockData] = useState(null);
  const [error, setError] = useState("");

  const fetchStockData = async () => {
    setError("");
    setStockData(null);

    if (!stockCode) {
      setError("Please enter a stock code.");
      return;
    }

    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/stock/${stockCode}/`);
      
      if (response.data.success) {
        setStockData(response.data.data);
      } else {
        setError("Stock not found.");
      }
    } catch (err) {
      setError("Error fetching stock data.");
    }
  };

  return (
    <div className="container">
      <h2>Stock Info Lookup</h2>
      <input
        type="text"
        placeholder="Enter Stock Code (e.g., 500209)"
        value={stockCode}
        onChange={(e) => setStockCode(e.target.value)}
      />
      <button onClick={fetchStockData}>Search</button>

      {error && <p className="error">{error}</p>}

      {stockData && (
        <div className="stock-details">
          <h3>{stockData.companyName} ({stockData.securityID})</h3>
          <p><strong>Stock Code:</strong> {stockData.scripCode}</p>
          <p><strong>Current Price:</strong> ₹{stockData.currentValue}</p>
          <p><strong>Change:</strong> {stockData.change} ({stockData.pChange}%)</p>
          <p><strong>Day High:</strong> ₹{stockData.dayHigh}</p>
          <p><strong>Day Low:</strong> ₹{stockData.dayLow}</p>
          <p><strong>52-Week High:</strong> ₹{stockData["52weekHigh"]}</p>
          <p><strong>52-Week Low:</strong> ₹{stockData["52weekLow"]}</p>
          <p><strong>Market Cap:</strong> {stockData.marketCapFull}</p>
          <p><strong>Industry:</strong> {stockData.industry}</p>
          <p><strong>Face Value:</strong> ₹{stockData.faceValue}</p>
          <p><strong>Last Updated:</strong> {stockData.updatedOn}</p>
        </div>
      )}
    </div>
  );
};

export default StockSearch;
