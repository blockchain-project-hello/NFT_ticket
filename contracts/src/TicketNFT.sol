// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/// @title TicketNFT
/// @notice NFT Ticketing platform with EIP-712 resale authorization
contract TicketNFT is ERC721Enumerable, Ownable, ReentrancyGuard, EIP712 {
    struct EventInfo {
        string name;
        uint256 basePrice;
        uint256 totalSupply;
        uint256 ticketsMinted;
        address organizer;
        uint256 eventDate;
        bool exists;
    }

    struct ResaleListing {
        bool isListed;
        uint256 askPrice;
    }

    mapping(uint256 => EventInfo) public events;
    mapping(uint256 => uint256) public ticketToEvent;
    mapping(uint256 => ResaleListing) public resaleListings;
    mapping(uint256 => bool) public usedNonces;

    address public authorizedSigner;
    uint256 public nextTokenId = 1;
    uint256 public nextEventId = 1;
    uint256 public constant ROYALTY_BPS = 1000;

    bytes32 private constant RESALE_TYPEHASH = keccak256("ResaleAuth(address seller,address buyer,uint256 tokenId,uint256 maxPrice,uint256 nonce,uint256 deadline)");

    error EventDoesNotExist();
    error EventSoldOut();
    error InsufficientPayment();
    error NotTicketOwner();
    error TicketNotListed();
    error InvalidSignature();
    error ExpiredDeadline();
    error NonceAlreadyUsed();
    error InvalidPrice();
    error TransferFailed();

    event EventCreated(uint256 indexed eventId, string name, address indexed organizer, uint256 basePrice, uint256 totalSupply);
    event TicketMinted(uint256 indexed tokenId, uint256 indexed eventId, address indexed minter);
    event TicketListed(uint256 indexed tokenId, address indexed owner, uint256 price);
    event TicketDelisted(uint256 indexed tokenId);
    event TicketResold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 royalty);

    /// @notice Constructor
    /// @param _signer The backend authorized signer for resale logic
    constructor(address _signer) ERC721("Event Ticket NFT", "TKT") Ownable(msg.sender) EIP712("TicketNFT", "1") {
        authorizedSigner = _signer;
    }

    /// @notice Create a new event
    /// @param name The name of the event
    /// @param _basePrice The initial ticket price
    /// @param totalSupply The max number of tickets
    /// @param eventDate Timestamp of the event
    function createEvent(string calldata name, uint256 _basePrice, uint256 totalSupply, uint256 eventDate) external {
        uint256 eventId = nextEventId++;
        events[eventId] = EventInfo({
            name: name,
            basePrice: _basePrice,
            totalSupply: totalSupply,
            ticketsMinted: 0,
            organizer: msg.sender,
            eventDate: eventDate,
            exists: true
        });

        emit EventCreated(eventId, name, msg.sender, _basePrice, totalSupply);
    }

    /// @notice Get base price of an event
    /// @param eventId The event id
    /// @return The base price
    function basePrice(uint256 eventId) external view returns (uint256) {
        if (!events[eventId].exists) revert EventDoesNotExist();
        return events[eventId].basePrice;
    }

    /// @notice Mint a ticket for a given event
    /// @param eventId The event id
    function mintTicket(uint256 eventId) external payable nonReentrant {
        EventInfo storage eventInfo = events[eventId];
        if (!eventInfo.exists) revert EventDoesNotExist();
        if (eventInfo.ticketsMinted >= eventInfo.totalSupply) revert EventSoldOut();
        if (msg.value < eventInfo.basePrice) revert InsufficientPayment();

        uint256 tokenId = nextTokenId++;
        eventInfo.ticketsMinted++;
        ticketToEvent[tokenId] = eventId;

        _safeMint(msg.sender, tokenId);

        (bool success, ) = eventInfo.organizer.call{value: msg.value}("");
        if (!success) revert TransferFailed();

        emit TicketMinted(tokenId, eventId, msg.sender);
    }

    /// @notice Get the event id for a given ticket
    /// @param tokenId The ticket token id
    /// @return The event id
    function getTicketEvent(uint256 tokenId) external view returns (uint256) {
        return ticketToEvent[tokenId];
    }

    /// @notice List a ticket for resale
    /// @param tokenId The ticket token id
    /// @param askPrice The asking price
    function listForResale(uint256 tokenId, uint256 askPrice) external {
        if (ownerOf(tokenId) != msg.sender) revert NotTicketOwner();

        resaleListings[tokenId] = ResaleListing({
            isListed: true,
            askPrice: askPrice
        });

        emit TicketListed(tokenId, msg.sender, askPrice);
    }

    /// @notice Delist a ticket from resale
    /// @param tokenId The ticket token id
    function delistFromResale(uint256 tokenId) external {
        if (ownerOf(tokenId) != msg.sender) revert NotTicketOwner();

        delete resaleListings[tokenId];

        emit TicketDelisted(tokenId);
    }

    /// @notice Resale a ticket matching seller and buyer criteria with EIP-712 authorization
    /// @param tokenId The ticket token id
    /// @param maxPrice The maximum price the buyer is willing to pay
    /// @param nonce Replay protection nonce
    /// @param deadline Signature expiry deadline
    /// @param signature EIP-712 signature from backend
    function resaleTicket(uint256 tokenId, uint256 maxPrice, uint256 nonce, uint256 deadline, bytes calldata signature) external payable nonReentrant {
        if (block.timestamp > deadline) revert ExpiredDeadline();
        if (usedNonces[nonce]) revert NonceAlreadyUsed();
        if (!resaleListings[tokenId].isListed) revert TicketNotListed();
        if (msg.value > maxPrice) revert InvalidPrice();
        if (msg.value < resaleListings[tokenId].askPrice) revert InsufficientPayment();

        address seller = ownerOf(tokenId);

        // Scoped block for EIP-712 verification to free stack slots
        {
            bytes32 structHash = keccak256(abi.encode(
                RESALE_TYPEHASH,
                seller,
                msg.sender,
                tokenId,
                maxPrice,
                nonce,
                deadline
            ));
            address signer = ECDSA.recover(_hashTypedDataV4(structHash), signature);
            if (signer != authorizedSigner) revert InvalidSignature();
        }

        usedNonces[nonce] = true;
        delete resaleListings[tokenId];

        _transfer(seller, msg.sender, tokenId);

        uint256 royalty = (msg.value * ROYALTY_BPS) / 10000;

        (bool sellerSuccess, ) = seller.call{value: msg.value - royalty}("");
        if (!sellerSuccess) revert TransferFailed();

        (bool orgSuccess, ) = events[ticketToEvent[tokenId]].organizer.call{value: royalty}("");
        if (!orgSuccess) revert TransferFailed();

        emit TicketResold(tokenId, seller, msg.sender, msg.value, royalty);
    }

    /// @notice Set a new authorized signer
    /// @param _signer The new signer address
    function setAuthorizedSigner(address _signer) external onlyOwner {
        authorizedSigner = _signer;
    }

    /// @notice ERC721Enumerable update override
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        if (resaleListings[tokenId].isListed) {
            delete resaleListings[tokenId];
        }
        return super._update(to, tokenId, auth);
    }

    /// @notice Supports Interface override
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
