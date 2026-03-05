import geoip2.database
from geoip2.errors import AddressNotFoundError
import os
import logging
import urllib.request
import tarfile

from app.config import settings

logger = logging.getLogger(__name__)

class GeoIPService:
    def __init__(self):
        self.db_path = settings.GEOIP_DB_PATH
        self._ensure_db_exists()
        self.reader = None
        try:
            self.reader = geoip2.database.Reader(self.db_path)
            logger.info("GeoIP database loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load GeoIP database: {e}")

    def _ensure_db_exists(self):
        if not os.path.exists(self.db_path):
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            logger.info(f"Downloading GeoLite2-City database to {self.db_path}...")
            # For demonstration, this uses a public mirror of the free GeoLite2 DB.
            # In production, use MaxMind license key download URL.
            url = "https://git.io/GeoLite2-City.mmdb"
            try:
                urllib.request.urlretrieve(url, self.db_path)
            except Exception as e:
                logger.warning(f"Could not download GeoIP db automatically: {e}. GeoIP enrichment will be skipped.")

    def lookup(self, ip_address: str) -> dict:
        if not self.reader:
            return {}
        
        # Don't try to lookup private IPs
        if ip_address.startswith("127.") or ip_address.startswith("192.168.") or ip_address.startswith("10.") or ip_address.startswith("172."):
            return {}

        try:
            response = self.reader.city(ip_address)
            return {
                "country": response.country.name,
                "city": response.city.name,
                "lat": response.location.latitude,
                "lon": response.location.longitude
            }
        except AddressNotFoundError:
            return {}
        except Exception as e:
            logger.debug(f"GeoIP error for {ip_address}: {e}")
            return {}

geoip_service = GeoIPService()
