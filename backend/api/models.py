from django.db import models

class Stock(models.Model):
    code = models.CharField(max_length=10, unique=True)  # Security Code
    name = models.CharField(max_length=255)  # Issuer Name
    security_id = models.CharField(max_length=5, null=True, blank=True) 

    def __str__(self):
        return f"{self.name} ({self.code})"
