export const TicketNFTABI = [
  {"type":"function","name":"balanceOf","inputs":[{"name":"owner","type":"address"}],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"tokenOfOwnerByIndex","inputs":[{"name":"owner","type":"address"},{"name":"index","type":"uint256"}],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"createEvent","inputs":[{"name":"name","type":"string"},{"name":"_basePrice","type":"uint256"},{"name":"totalSupply","type":"uint256"},{"name":"eventDate","type":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"mintTicket","inputs":[{"name":"eventId","type":"uint256"}],"outputs":[],"stateMutability":"payable"},
  {"type":"function","name":"listForResale","inputs":[{"name":"tokenId","type":"uint256"},{"name":"price","type":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"delistFromResale","inputs":[{"name":"tokenId","type":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"resaleTicket","inputs":[{"name":"tokenId","type":"uint256"},{"name":"maxPrice","type":"uint256"},{"name":"deadline","type":"uint256"},{"name":"nonce","type":"uint256"},{"name":"signature","type":"bytes"}],"outputs":[],"stateMutability":"payable"},
  {"type":"function","name":"name","inputs":[],"outputs":[{"name":"","type":"string"}],"stateMutability":"view"},
  {"type":"function","name":"symbol","inputs":[],"outputs":[{"name":"","type":"string"}],"stateMutability":"view"},
  {"type":"function","name":"ownerOf","inputs":[{"name":"tokenId","type":"uint256"}],"outputs":[{"name":"","type":"address"}],"stateMutability":"view"},
  {"type":"function","name":"getTicketEvent","inputs":[{"name":"tokenId","type":"uint256"}],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"basePrice","inputs":[{"name":"eventId","type":"uint256"}],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"totalSupply","inputs":[],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"authorizedSigner","inputs":[],"outputs":[{"name":"","type":"address"}],"stateMutability":"view"},
  {"type":"function","name":"events","inputs":[{"name":"eventId","type":"uint256"}],"outputs":[{"name":"uri","type":"string"},{"name":"price","type":"uint256"},{"name":"maxSupply","type":"uint256"},{"name":"startTime","type":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"resaleListings","inputs":[{"name":"tokenId","type":"uint256"}],"outputs":[{"name":"isListed","type":"bool"},{"name":"price","type":"uint256"}],"stateMutability":"view"},
  {"type":"event","name":"EventCreated","inputs":[{"indexed":true,"name":"eventId","type":"uint256"},{"indexed":false,"name":"uri","type":"string"}],"anonymous":false},
  {"type":"event","name":"TicketMinted","inputs":[{"indexed":true,"name":"tokenId","type":"uint256"},{"indexed":true,"name":"eventId","type":"uint256"},{"indexed":true,"name":"buyer","type":"address"}],"anonymous":false},
  {"type":"event","name":"TicketListed","inputs":[{"indexed":true,"name":"tokenId","type":"uint256"},{"indexed":false,"name":"price","type":"uint256"}],"anonymous":false},
  {"type":"event","name":"TicketDelisted","inputs":[{"indexed":true,"name":"tokenId","type":"uint256"}],"anonymous":false},
  {"type":"event","name":"TicketResold","inputs":[{"indexed":true,"name":"tokenId","type":"uint256"},{"indexed":true,"name":"seller","type":"address"},{"indexed":true,"name":"buyer","type":"address"},{"indexed":false,"name":"price","type":"uint256"},{"indexed":false,"name":"royalty","type":"uint256"}],"anonymous":false},
  {"type":"event","name":"Transfer","inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":true,"name":"tokenId","type":"uint256"}],"anonymous":false},
  {"type":"event","name":"Approval","inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"approved","type":"address"},{"indexed":true,"name":"tokenId","type":"uint256"}],"anonymous":false},
  {"type":"event","name":"ApprovalForAll","inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"operator","type":"address"},{"indexed":false,"name":"approved","type":"bool"}],"anonymous":false}
];

export const CrowdfundEscrowABI = [
  {"type":"function","name":"createCampaign","inputs":[{"name":"targetAmount","type":"uint256"},{"name":"deadline","type":"uint256"},{"name":"minimumContribution","type":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"backCampaign","inputs":[{"name":"campaignId","type":"uint256"}],"outputs":[],"stateMutability":"payable"},
  {"type":"function","name":"finalizeCampaign","inputs":[{"name":"campaignId","type":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"claimRefund","inputs":[{"name":"campaignId","type":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"getCampaign","inputs":[{"name":"campaignId","type":"uint256"}],"outputs":[{"name":"creator","type":"address"},{"name":"targetAmount","type":"uint256"},{"name":"totalCollected","type":"uint256"},{"name":"deadline","type":"uint256"},{"name":"state","type":"uint8"}],"stateMutability":"view"},
  {"type":"function","name":"contributions","inputs":[{"name":"campaignId","type":"uint256"},{"name":"contributor","type":"address"}],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"},
  {"type":"event","name":"CampaignCreated","inputs":[{"indexed":true,"name":"campaignId","type":"uint256"},{"indexed":true,"name":"creator","type":"address"},{"indexed":false,"name":"targetAmount","type":"uint256"}],"anonymous":false},
  {"type":"event","name":"CampaignBacked","inputs":[{"indexed":true,"name":"campaignId","type":"uint256"},{"indexed":true,"name":"contributor","type":"address"},{"indexed":false,"name":"amount","type":"uint256"}],"anonymous":false},
  {"type":"event","name":"CampaignFinalized","inputs":[{"indexed":true,"name":"campaignId","type":"uint256"}],"anonymous":false},
  {"type":"event","name":"CampaignStateChanged","inputs":[{"indexed":true,"name":"campaignId","type":"uint256"},{"indexed":false,"name":"newState","type":"uint8"}],"anonymous":false},
  {"type":"event","name":"RefundClaimed","inputs":[{"indexed":true,"name":"campaignId","type":"uint256"},{"indexed":true,"name":"contributor","type":"address"},{"indexed":false,"name":"amount","type":"uint256"}],"anonymous":false}
];

export const TICKET_NFT_ABI = TicketNFTABI;
