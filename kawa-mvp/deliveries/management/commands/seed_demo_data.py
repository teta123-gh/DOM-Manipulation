from datetime import date

from django.core.management.base import BaseCommand

from deliveries.models import Cooperative, Farmer, PriceSchedule, Station


class Command(BaseCommand):
    help = (
        "Seed minimal reference data (cooperative, station, price schedule, "
        "one farmer) so the API can be exercised manually via REST Client "
        "or curl without going through the Django admin first."
    )

    def handle(self, *args: object, **options: object) -> None:
        coop, _ = Cooperative.objects.get_or_create(name="Huye Cooperative")
        station, _ = Station.objects.get_or_create(
            name="Nyaruguru Station", sector="Kibeho"
        )
        PriceSchedule.objects.get_or_create(
            effective_date=date.today(), defaults={"price_per_kg": "350.00"}
        )
        farmer, _ = Farmer.objects.get_or_create(
            full_name="Jean Bosco",
            phone="+250780000001",
            cooperative=coop,
            defaults={"status": Farmer.Status.ACTIVE},
        )

        self.stdout.write(self.style.SUCCESS("Seeded demo data:"))
        self.stdout.write(f"  cooperative_id = {coop.id}")
        self.stdout.write(f"  station_id     = {station.id}")
        self.stdout.write(f"  farmer_id      = {farmer.id}")
        self.stdout.write("Use these IDs in requests.http to test the API end to end.")
