export const TICKET_NFT_ABI = [
  "function mintTicket(uint256 eventId) payable",
  "function listForResale(uint256 tokenId, uint256 askPrice)",
  "function resaleTicket(uint256 tokenId, uint256 maxPrice, uint256 nonce, uint256 deadline, bytes signature) payable",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event TicketResold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 royalty)",
  "event TicketListed(uint256 indexed tokenId, address indexed owner, uint256 price)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function getTicketEvent(uint256 tokenId) view returns (uint256)",
  "function basePrice(uint256 eventId) view returns (uint256)"
] as const;

export const ESCROW_ABI = [
  "function createCampaign(uint256 eventId, uint256 goal, uint256 deadline)",
  "function backCampaign(uint256 campaignId) payable",
  "function finalizeCampaign(uint256 campaignId)",
  "function claimRefund(uint256 campaignId)",
  "event CampaignCreated(uint256 indexed campaignId, uint256 eventId, uint256 goal, uint256 deadline)",
  "event CampaignBacked(uint256 indexed campaignId, address indexed backer, uint256 amount)",
  "event CampaignStateChanged(uint256 indexed campaignId, uint8 state)",
  "function getCampaign(uint256 campaignId) view returns (uint256 eventId, uint256 goal, uint256 funded, uint256 deadline, uint8 state)"
] as const;
