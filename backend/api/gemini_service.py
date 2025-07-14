import google.generativeai as genai  
import os  

# Load API Key
GEMINI_API_KEY = "AIzaSyBND4e8aapz0MkEa2cX_aRl37kAY4DnBDI"  
genai.configure(api_key=GEMINI_API_KEY)  

def analyze_stock(stock_name):  
    """Fetches stock analysis using Gemini AI"""  
    prompt = f"Provide an in-depth analysis of {stock_name} stock, including technical and fundamental insights."  
    model = genai.GenerativeModel("gemini-pro")  
    response = model.generate_content(prompt)  
    return response.text  

# Example usage  
if __name__ == "__main__":  
    print(analyze_stock("Tata Motors"))
