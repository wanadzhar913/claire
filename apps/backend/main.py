from typing import Dict

import uvicorn
from fastapi import FastAPI, status, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings

app = FastAPI(
    title="Claire API",
    description="API for the Claire project",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Monitoring"])
async def root(request: Request):
    """Root endpoint returning basic API information."""
    return {
        'name': settings.BACKEND_PROJECT_NAME,
        'description': settings.BACKEND_API_DESCRIPTION,
        'version': settings.BACKEND_API_VERSION,
        'environment': settings.BACKEND_API_ENVIRONMENT,
        'status': 'healthy',
        'swagger_url': '/docs',
        'redoc_url': '/redoc',
    }

@app.get("/services_health", tags=["Monitoring"])
async def health_check(request: Request):
    """Health check endpoint."""
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)