import pandas as pd

csv_path = "/home/kali/Internship-Airzac/stocksage/backend/api/data/ind_nifty.csv"
df = pd.read_csv(csv_path, on_bad_lines='skip')

print(df['Industry'].unique())  # List all industries
