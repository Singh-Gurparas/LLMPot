import geoip2.database
from geoip2.errors import AddressNotFoundError
import os
import logging
import urllib.request
import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_PRIVATE_PREFIXES = ("127.", "192.168.", "10.", "172.", "::1", "fc", "fd")


def _is_private(ip: str) -> bool:
    return any(ip.startswith(p) for p in _PRIVATE_PREFIXES)


class GeoIPService:
    def __init__(self):
        self.db_path = settings.GEOIP_DB_PATH
        self.reader = None
        self._initialized = False

    def _init_reader(self):
        if self._initialized:
            return
        self._ensure_db_exists()
        try:
            self.reader = geoip2.database.Reader(self.db_path)
            logger.info("GeoIP database loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load GeoIP database: {e}")
        self._initialized = True

    def _ensure_db_exists(self):
        if not os.path.exists(self.db_path):
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            logger.info(f"Downloading GeoLite2-City database to {self.db_path}...")
            url = "https://git.io/GeoLite2-City.mmdb"
            try:
                urllib.request.urlretrieve(url, self.db_path)
            except Exception as e:
                logger.warning(f"Could not download GeoIP db: {e}. GeoIP enrichment skipped.")

    def lookup(self, ip_address: str) -> dict:
        self._init_reader()
        if not self.reader or _is_private(ip_address):
            return {}
        try:
            r = self.reader.city(ip_address)
            return {
                "country": r.country.name,
                "city": r.city.name,
                "lat": r.location.latitude,
                "lon": r.location.longitude,
                "continent": r.continent.name,
                "timezone": r.location.time_zone,
                "postal_code": r.postal.code,
            }
        except AddressNotFoundError:
            return {}
        except Exception as e:
            logger.debug(f"GeoIP error for {ip_address}: {e}")
            return {}

    async def enrich_ip_intelligence(self, ip_address: str) -> dict:
        """
        Async enrichment via ip-api.com — ISP, ASN, org, proxy/hosting/mobile detection.
        Free tier: 45 req/min over HTTP, no API key required.
        """
        if _is_private(ip_address):
            return {}
        fields = "status,isp,org,as,proxy,hosting,mobile,reverse"
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(
                    f"http://ip-api.com/json/{ip_address}",
                    params={"fields": fields}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("status") == "success":
                        return {
                            "isp": data.get("isp"),
                            "org": data.get("org"),
                            "asn": data.get("as"),
                            "is_proxy": bool(data.get("proxy", False)),
                            "is_hosting": bool(data.get("hosting", False)),
                            "is_mobile": bool(data.get("mobile", False)),
                            "hostname": data.get("reverse") or None,
                        }
        except Exception as e:
            logger.debug(f"IP intelligence enrichment failed for {ip_address}: {e}")
        return {}


geoip_service = GeoIPService()
