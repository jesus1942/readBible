FROM python:3.12-slim

WORKDIR /app
COPY proxy_server.py /app/proxy_server.py

EXPOSE 8080
CMD ["python3", "/app/proxy_server.py"]
