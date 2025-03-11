import csv
from django.core.management.base import BaseCommand
from api.models import Stock

class Command(BaseCommand):
    help = 'Import stocks from a CSV file'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to CSV file')

    def handle(self, *args, **kwargs):
        csv_file = kwargs['csv_file']

        with open(csv_file, newline='', encoding='utf-8') as file:
            reader = csv.DictReader(file)

            stocks_to_create = []
            for row in reader:
                stock = Stock(
                    code=row.get('Security Code').strip(),
                    name=row.get('Issuer Name').strip(),
                    security_id=row.get('Security Id').strip()
                )
                stocks_to_create.append(stock)

            # Bulk insert for efficiency
            Stock.objects.bulk_create(stocks_to_create, ignore_conflicts=True)

        self.stdout.write(self.style.SUCCESS('Successfully imported stocks!'))
