FROM python:3.11-slim

# Install nftables binary + iproute2 (so backend can apply rules on host network)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        nftables \
        iproute2 \
        iputils-ping \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps first for better caching
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# App code
COPY server.py ./
COPY app ./app

# Working dir for nftables backups (mounted as volume)
RUN mkdir -p /var/lib/firewall-console/backups

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8001/api/ || exit 1

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
