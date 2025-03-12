from django.db import models

class Stock(models.Model):
    code = models.CharField(max_length=10, unique=True)  # Security Code
    name = models.CharField(max_length=255)  # Issuer Name
    security_id = models.CharField(max_length=40, unique=True, null=True, blank=True)  # Ensure security_id is unique

    def _str_(self):
        return f"{self.name} ({self.code})"