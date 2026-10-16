FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 10001 --create-home kult
COPY server ./server
COPY web ./web
COPY scripts/check_web_export.py ./scripts/check_web_export.py
RUN python scripts/check_web_export.py
RUN mkdir /data && chown kult:kult /data
USER kult
ENV HOST=0.0.0.0 PORT=8787 SYNDICATES_DATA=/data SYNDICATES_DEMO=no
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8787/api/health')" || exit 1
CMD ["python","server/app.py"]
