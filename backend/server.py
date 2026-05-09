from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
import logging
from pathlib import Path
from contextlib import asynccontextmanager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('firewall-console')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

from app.db import set_db
from app.seed import seed_initial_data
from app.simulator import Simulator
from app.routers import (
    auth as auth_router,
    users as users_router,
    metrics as metrics_router,
    logs as logs_router,
    firewall as firewall_router,
    nat as nat_router,
    vpn as vpn_router,
    dhcp as dhcp_router,
    dns as dns_router,
    aliases as aliases_router,
    interfaces as interfaces_router,
    export as export_router,
    attacks as attacks_router,
    block_page as block_page_router,
)

set_db(db)

simulator = Simulator(db)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await seed_initial_data(db)
    sim_task = asyncio.create_task(simulator.run_forever())
    logger.info('Firewall Console backend started')
    try:
        yield
    finally:
        sim_task.cancel()
        try:
            await sim_task
        except asyncio.CancelledError:
            pass
        client.close()


app = FastAPI(title='Firewall Console API', lifespan=lifespan)

api_router = APIRouter(prefix='/api')


@api_router.get('/')
async def root():
    return {
        'name': 'Firewall Console API',
        'status': 'ok',
        'version': '1.0.0',
    }


api_router.include_router(auth_router.router)
api_router.include_router(users_router.router)
api_router.include_router(metrics_router.router)
api_router.include_router(logs_router.router)
api_router.include_router(firewall_router.router)
api_router.include_router(nat_router.router)
api_router.include_router(vpn_router.router)
api_router.include_router(dhcp_router.router)
api_router.include_router(dns_router.router)
api_router.include_router(aliases_router.router)
api_router.include_router(interfaces_router.router)
api_router.include_router(export_router.router)
api_router.include_router(attacks_router.router)
api_router.include_router(block_page_router.router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=['*'],
    allow_headers=['*'],
)
