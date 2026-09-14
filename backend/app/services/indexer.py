import asyncio
import json
import logging
from web3 import Web3
from app.core.config import settings
from app.services.supabase_client import upsert_ticket, insert_sale

logger = logging.getLogger(__name__)

TICKET_NFT_EVENTS_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "uint256", "name": "tokenId", "type": "uint256"},
            {"indexed": True, "internalType": "uint256", "name": "eventId", "type": "uint256"},
            {"indexed": True, "internalType": "address", "name": "buyer", "type": "address"}
        ],
        "name": "TicketMinted",
        "type": "event"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "uint256", "name": "tokenId", "type": "uint256"},
            {"indexed": True, "internalType": "address", "name": "seller", "type": "address"},
            {"indexed": True, "internalType": "address", "name": "buyer", "type": "address"},
            {"indexed": False, "internalType": "uint256", "name": "price", "type": "uint256"},
            {"indexed": False, "internalType": "uint256", "name": "royalty", "type": "uint256"}
        ],
        "name": "TicketResold",
        "type": "event"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "address", "name": "from", "type": "address"},
            {"indexed": True, "internalType": "address", "name": "to", "type": "address"},
            {"indexed": True, "internalType": "uint256", "name": "tokenId", "type": "uint256"}
        ],
        "name": "Transfer",
        "type": "event"
    }
]

class Web3Indexer:
    def __init__(self, contract_address: str):
        self.w3 = Web3(Web3.HTTPProvider(settings.POLYGON_AMOY_RPC_URL))
        self.contract = self.w3.eth.contract(address=contract_address, abi=TICKET_NFT_EVENTS_ABI)
        self.last_processed_block = None
        self.POLL_INTERVAL = 10
        self.BLOCK_RANGE = 100

    async def start(self):
        logger.info(f"Connecting to Web3 at {settings.POLYGON_AMOY_RPC_URL}")
        if not self.w3.is_connected():
            logger.warning("Web3 is not connected. Will retry in loop.")
        else:
            self.last_processed_block = self.w3.eth.block_number
            
        while True:
            try:
                if self.w3.is_connected():
                    if self.last_processed_block is None:
                        self.last_processed_block = self.w3.eth.block_number - self.BLOCK_RANGE
                    
                    self.poll_events()
            except Exception as e:
                logger.error(f"Error polling events: {e}")
            
            await asyncio.sleep(self.POLL_INTERVAL)

    def poll_events(self):
        try:
            latest = self.w3.eth.block_number
            from_block = self.last_processed_block + 1
            to_block = min(from_block + self.BLOCK_RANGE, latest)
            
            if from_block > to_block:
                return

            mint_logs = self.contract.events.TicketMinted.get_logs(fromBlock=from_block, toBlock=to_block)
            resale_logs = self.contract.events.TicketResold.get_logs(fromBlock=from_block, toBlock=to_block)

            for event in mint_logs:
                self._process_mint_event(event)

            for event in resale_logs:
                self._process_resale_event(event)

            self.last_processed_block = to_block
            logger.info(f"Processed blocks {from_block} to {to_block}")
        except Exception as e:
            logger.error(f"Failed to poll events: {e}")

    def _process_mint_event(self, event):
        try:
            args = event.args
            token_id = args.tokenId
            event_id = args.eventId
            buyer = args.buyer
            upsert_ticket(token_id=token_id, event_id=str(event_id), owner=buyer, status='held')
            logger.info(f"Processed Mint Event - Token: {token_id}, Event: {event_id}, Buyer: {buyer}")
        except Exception as e:
            logger.error(f"Error processing mint event: {e}")

    def _process_resale_event(self, event):
        try:
            args = event.args
            token_id = args.tokenId
            seller = args.seller
            buyer = args.buyer
            price = args.price
            royalty = args.royalty
            
            event_id = None
            try:
                # Attempt to get event_id if we fetch it via contract or it is handled internally
                # For now falling back to None if not explicitly available, assuming insert_sale can accept it or upsert_ticket handles it
                pass
            except Exception:
                pass

            insert_sale(
                event_id=str(event_id) if event_id is not None else None, 
                token_id=token_id, 
                seller=seller, 
                buyer=buyer, 
                price=str(price), 
                royalty_paid=str(royalty), 
                tx_hash=event.transactionHash.hex(), 
                block_number=event.blockNumber
            )
            upsert_ticket(token_id=token_id, event_id=str(event_id) if event_id is not None else None, owner=buyer, status='held')
            logger.info(f"Processed Resale Event - Token: {token_id}, Seller: {seller}, Buyer: {buyer}, Price: {price}")
        except Exception as e:
            logger.error(f"Error processing resale event: {e}")
