// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title TicketNFT — ERC-721 event ticket with EIP-2981 royalties and EIP-712 verified resale
/// @author NFT Ticketing Platform
/// @notice Organizer mints tickets; secondary resale is price-capped and signature-verified
/// @dev Follows CEI pattern throughout. Uses OpenZeppelin v5 contracts.
contract TicketNFT is ERC721URIStorage, ERC2981, EIP712, Ownable {
    // ──────────────────────────────────────────────
    //  Constants & Immutables
    // ──────────────────────────────────────────────

    /// @notice Hard supply cap for tickets
    uint256 public constant MAX_SUPPLY = 10_000;

    /// @notice EIP-712 typehash for the ResaleAuth struct
    bytes32 public constant RESALE_TYPEHASH = keccak256(
        "ResaleAuth(address seller,address buyer,uint256 tokenId,uint256 maxPrice,uint256 nonce,uint256 deadline)"
    );

    // ──────────────────────────────────────────────
    //  State Variables
    // ──────────────────────────────────────────────

    /// @notice Auto-incrementing token ID counter (starts at 1)
    uint256 private _nextTokenId = 1;

    /// @notice Backend signer that authorises secondary resales
    address public backendSignerAddress;

    /// @notice Tracks used nonces to prevent signature replay
    mapping(uint256 => bool) public usedNonces;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    /// @notice Emitted when a new ticket is minted
    event TicketMinted(uint256 indexed tokenId, address indexed to, string uri);

    /// @notice Emitted when a ticket is resold via EIP-712 verified sale
    event TicketResold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 salePrice,
        uint256 royaltyAmount
    );

    /// @notice Emitted when the backend signer address is updated
    event BackendSignerUpdated(address indexed oldSigner, address indexed newSigner);

    // ──────────────────────────────────────────────
    //  Errors
    // ──────────────────────────────────────────────

    error MaxSupplyReached();
    error SignatureExpired();
    error PriceExceedsMaximum(uint256 salePrice, uint256 maxPrice);
    error NonceAlreadyUsed(uint256 nonce);
    error InvalidSignature();
    error InsufficientPayment(uint256 sent, uint256 required);
    error TransferFailed();
    error ZeroAddress();

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    /// @param _backendSigner Address of the backend signer for resale authorisation
    /// @param _royaltyReceiver Address that receives royalty payments (organizer)
    /// @param _royaltyBps Royalty basis points (e.g. 750 = 7.5%)
    constructor(
        address _backendSigner,
        address _royaltyReceiver,
        uint96 _royaltyBps
    )
        ERC721("Event Ticket NFT", "TKT")
        EIP712("NFTTicketingPlatform", "1")
        Ownable(msg.sender)
    {
        if (_backendSigner == address(0)) revert ZeroAddress();
        if (_royaltyReceiver == address(0)) revert ZeroAddress();

        backendSignerAddress = _backendSigner;
        _setDefaultRoyalty(_royaltyReceiver, _royaltyBps);
    }

    // ──────────────────────────────────────────────
    //  Primary Minting
    // ──────────────────────────────────────────────

    /// @notice Mint a new ticket NFT (owner-only)
    /// @param to Recipient address
    /// @param uri Token metadata URI
    /// @return tokenId The newly minted token ID
    function mintTicket(address to, string calldata uri) external onlyOwner returns (uint256 tokenId) {
        tokenId = _nextTokenId;
        if (tokenId > MAX_SUPPLY) revert MaxSupplyReached();

        // Effects
        unchecked {
            _nextTokenId = tokenId + 1;
        }

        // Interactions
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        emit TicketMinted(tokenId, to, uri);
    }

    // ──────────────────────────────────────────────
    //  EIP-712 Secondary Resale
    // ──────────────────────────────────────────────

    /// @notice Execute a verified secondary resale of a ticket
    /// @dev Buyer calls this function with payment. Backend signature authorises the trade.
    /// @param tokenId Token being resold
    /// @param salePrice Agreed sale price in native currency (MATIC)
    /// @param maxPrice Maximum price authorised by the backend
    /// @param nonce Unique nonce for replay protection
    /// @param deadline Timestamp after which the signature expires
    /// @param signature EIP-712 signature from the backend signer
    function resaleTicket(
        uint256 tokenId,
        uint256 salePrice,
        uint256 maxPrice,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external payable {
        address seller = ownerOf(tokenId);
        address buyer = msg.sender;

        // ── Checks ──
        if (block.timestamp > deadline) revert SignatureExpired();
        if (salePrice > maxPrice) revert PriceExceedsMaximum(salePrice, maxPrice);
        if (usedNonces[nonce]) revert NonceAlreadyUsed(nonce);
        if (msg.value < salePrice) revert InsufficientPayment(msg.value, salePrice);

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(RESALE_TYPEHASH, seller, buyer, tokenId, maxPrice, nonce, deadline)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recoveredSigner = ECDSA.recover(digest, signature);
        if (recoveredSigner != backendSignerAddress) revert InvalidSignature();

        // ── Effects ──
        usedNonces[nonce] = true;

        // Calculate royalty via ERC-2981
        (address royaltyReceiver, uint256 royaltyAmount) = royaltyInfo(tokenId, salePrice);
        uint256 sellerProceeds = salePrice - royaltyAmount;

        // ── Interactions ──
        // Transfer NFT from seller to buyer (requires prior approval)
        _transfer(seller, buyer, tokenId);

        // Route funds: royalty to organizer, remainder to seller
        if (royaltyAmount > 0) {
            (bool royaltySuccess,) = payable(royaltyReceiver).call{value: royaltyAmount}("");
            if (!royaltySuccess) revert TransferFailed();
        }

        if (sellerProceeds > 0) {
            (bool sellerSuccess,) = payable(seller).call{value: sellerProceeds}("");
            if (!sellerSuccess) revert TransferFailed();
        }

        // Refund excess payment
        uint256 excess = msg.value - salePrice;
        if (excess > 0) {
            (bool refundSuccess,) = payable(buyer).call{value: excess}("");
            if (!refundSuccess) revert TransferFailed();
        }

        emit TicketResold(tokenId, seller, buyer, salePrice, royaltyAmount);
    }

    // ──────────────────────────────────────────────
    //  Admin
    // ──────────────────────────────────────────────

    /// @notice Update the backend signer address
    /// @param newSigner New backend signer address
    function setBackendSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        address oldSigner = backendSignerAddress;
        backendSignerAddress = newSigner;
        emit BackendSignerUpdated(oldSigner, newSigner);
    }

    // ──────────────────────────────────────────────
    //  View Helpers
    // ──────────────────────────────────────────────

    /// @notice Returns the total number of tickets minted so far
    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    /// @notice Returns the EIP-712 domain separator (exposed for frontend convenience)
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    // ──────────────────────────────────────────────
    //  Interface Overrides
    // ──────────────────────────────────────────────

    /// @dev Resolve diamond inheritance between ERC721URIStorage and ERC2981
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /// @dev Required override for ERC721URIStorage
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
}
