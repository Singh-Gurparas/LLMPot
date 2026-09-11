FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Bake GeoLite2-City database into image (avoids runtime download; git.io source is dead)
COPY data/GeoLite2-City.mmdb /app/data/GeoLite2-City.mmdb

# Create non-root user
RUN adduser --disabled-password --gecos '' apirunner && chown -R apirunner:apirunner /app
USER apirunner
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
