# backend/api/models.py

from django.db import models

class Stock(models.Model):
    code = models.CharField(max_length=10, unique=True)  # Security Code
    name = models.CharField(max_length=255)  # Issuer Name
    security_id = models.CharField(max_length=40, unique=True, null=True, blank=True)  # Ensure security_id is unique

    def __str__(self): # Corrected from _str_ to __str__
        return f"{self.name} ({self.code})"

# --- New Prediction Model ---
class Prediction(models.Model):
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='predictions')
    prediction_date = models.DateField(db_index=True) # The date for which the prediction is made (e.g., tomorrow's date)
    predicted_movement = models.CharField(max_length=15) # e.g., 'UP', 'DOWN/FLAT'
    probability_up = models.FloatField() # Probability of the 'UP' class
    source_date = models.DateField() # The date on which the prediction was generated (e.g., today's date)

    class Meta:
        unique_together = ('stock', 'prediction_date') # Ensure only one prediction per stock per day
        ordering = ['-prediction_date', 'stock__security_id'] # Order by most recent predictions first

    def __str__(self):
        return f"Pred for {self.stock.security_id} on {self.prediction_date}: {self.predicted_movement} ({self.probability_up:.2f})"

class StockDB(models.Model):
    id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=20, null=True)
    name = models.CharField(max_length=255, null=True)
    security_id = models.CharField(max_length=20, null=True)
    industry = models.CharField(max_length=255, null=True)
    sector_index = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        managed = False  # Do not create migrations
        db_table = 'api_stock'  # Exact table name


