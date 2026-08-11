# Use official lightweight Python image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860

# Set working directory
WORKDIR /app

# Install system dependencies needed for compiling packages or PyMuPDF
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Create directory for Chroma database and uploads
RUN mkdir -p chroma_db uploads

# Expose port (Hugging Face Spaces uses 7860, Render uses PORT env var)
EXPOSE ${PORT}

# Run with uvicorn (exactly 1 worker, no --reload to keep memory footprint under 250MB)
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1
