import os

class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "NFT Ticketing API")
    POLYGON_AMOY_RPC_URL: str = os.getenv("POLYGON_AMOY_RPC_URL", "https://rpc-amoy.polygon.technology/")

settings = Settings()
