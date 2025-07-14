# combined_runner.py

"""
Runs both stock_predictor.py and prob_predicition.py sequentially
to show results in a single execution.

Adjusts paths based on your directory structure.
"""

import subprocess

def run_stock_predictor():
    print("\n--- Running stock_predictor.py ---\n")
    subprocess.run([
        "python3",
        "/home/kali/Internship-Airzac/stocksage/backend/Stock_predictor/stock_predictor.py"
    ], check=True)

def run_prob_prediction():
    print("\n--- Running prob_predicition.py ---\n")
    subprocess.run([
        "python3",
        "/home/kali/Internship-Airzac/stocksage/backend/stock_prediction/prob_predicition.py",
        "--mode", "predict_only"
    ], check=True)

def run_price_prediction():
    print("\n--- Running prob_predicition.py ---\n")
    subprocess.run([
        "python3",
        "/home/kali/Internship-Airzac/stocksage/backend/stock_prediction/price_predicition.py",
        "--mode", "predict_only"
    ], check=True)
if __name__ == "__main__":
    run_stock_predictor()
    run_prob_prediction()
    run_price_prediction()
