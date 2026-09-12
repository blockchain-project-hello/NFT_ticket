// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/TicketNFT.sol";

/// @title TicketNFT Test Suite
/// @notice 11 tests covering minting, EIP-712 resale, replay protection, and interface support
contract TicketNFTTest is Test {
    TicketNFT public ticketNFT;

    // Test accounts
    address public organizer;
    uint256 public backendSignerKey;
    address public backendSigner;
    address public buyer;
    address public seller;

    // EIP-712 constants (must match contract)
    bytes32 public constant RESALE_TYPEHASH = keccak256(
        "ResaleAuth(address seller,address buyer,uint256 tokenId,uint256 maxPrice,uint256 nonce,uint256 deadline)"
    );

    function setUp() public {
        organizer = makeAddr("organizer");
        (backendSigner, backendSignerKey) = makeAddrAndKey("backendSigner");
        buyer = makeAddr("buyer");
        seller = makeAddr("seller");

        // Deploy as organizer
        vm.prank(organizer);
        ticketNFT = new TicketNFT(
            backendSigner,  // backend signer
            organizer,      // royalty receiver
            750             // 7.5% royalty
        );

        // Fund test accounts
        vm.deal(buyer, 100 ether);
        vm.deal(seller, 10 ether);
    }

    // ──────────────────────────────────────────────
    //  Helpers
    // ──────────────────────────────────────────────

    /// @dev Generates a valid EIP-712 signature for resale
    function _signResale(
        address _seller,
        address _buyer,
        uint256 _tokenId,
        uint256 _maxPrice,
        uint256 _nonce,
        uint256 _deadline
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(RESALE_TYPEHASH, _seller, _buyer, _tokenId, _maxPrice, _nonce, _deadline)
        );
        bytes32 domainSeparator = ticketNFT.getDomainSeparator();
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(backendSignerKey, digest);
        return abi.encodePacked(r, s, v);
    }

    /// @dev Mints a ticket to the seller and sets up approval for resale
    function _mintAndApprove(uint256 tokenId) internal {
        vm.prank(organizer);
        ticketNFT.mintTicket(seller, "ipfs://ticket-metadata");

        // Seller approves the contract to transfer on their behalf
        vm.prank(seller);
        ticketNFT.approve(address(ticketNFT), tokenId);
    }

    // ══════════════════════════════════════════════
    //  TEST 1: Successful mint
    // ══════════════════════════════════════════════

    function test_MintTicket_Success() public {
        vm.prank(organizer);
        uint256 tokenId = ticketNFT.mintTicket(buyer, "ipfs://QmTest123");

        assertEq(tokenId, 1, "First token ID should be 1");
        assertEq(ticketNFT.ownerOf(1), buyer, "Buyer should own the ticket");
        assertEq(ticketNFT.tokenURI(1), "ipfs://QmTest123", "URI should match");
        assertEq(ticketNFT.totalMinted(), 1, "Total minted should be 1");
    }

    // ══════════════════════════════════════════════
    //  TEST 2: Mint cap enforcement
    // ══════════════════════════════════════════════

    function test_MintTicket_RevertOnCapExceeded() public {
        // Mint MAX_SUPPLY tickets
        vm.startPrank(organizer);
        for (uint256 i = 0; i < 10_000; i++) {
            ticketNFT.mintTicket(buyer, "ipfs://bulk");
        }

        // The next mint should revert
        vm.expectRevert(TicketNFT.MaxSupplyReached.selector);
        ticketNFT.mintTicket(buyer, "ipfs://overflow");
        vm.stopPrank();
    }

    // ══════════════════════════════════════════════
    //  TEST 3: Non-owner cannot mint
    // ══════════════════════════════════════════════

    function test_MintTicket_RevertNonOwner() public {
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, buyer)
        );
        ticketNFT.mintTicket(buyer, "ipfs://unauthorized");
    }

    // ══════════════════════════════════════════════
    //  TEST 4: Successful EIP-712 resale with royalty
    // ══════════════════════════════════════════════

    function test_ResaleTicket_Success() public {
        uint256 tokenId = 1;
        _mintAndApprove(tokenId);

        uint256 salePrice = 1 ether;
        uint256 maxPrice = 2 ether;
        uint256 nonce = 42;
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory signature = _signResale(seller, buyer, tokenId, maxPrice, nonce, deadline);

        // Calculate expected royalty (7.5% of 1 ether = 0.075 ether)
        (address royaltyReceiver, uint256 royaltyAmount) = ticketNFT.royaltyInfo(tokenId, salePrice);
        uint256 expectedSellerProceeds = salePrice - royaltyAmount;

        uint256 organizerBalBefore = organizer.balance;
        uint256 sellerBalBefore = seller.balance;

        vm.prank(buyer);
        ticketNFT.resaleTicket{value: salePrice}(tokenId, salePrice, maxPrice, nonce, deadline, signature);

        // Verify ownership transferred
        assertEq(ticketNFT.ownerOf(tokenId), buyer, "Buyer should own the ticket after resale");

        // Verify royalty payment
        assertEq(royaltyReceiver, organizer, "Royalty receiver should be organizer");
        assertEq(organizer.balance - organizerBalBefore, royaltyAmount, "Organizer should receive royalty");

        // Verify seller payment
        assertEq(seller.balance - sellerBalBefore, expectedSellerProceeds, "Seller should receive sale price minus royalty");

        // Verify nonce is used
        assertTrue(ticketNFT.usedNonces(nonce), "Nonce should be marked as used");
    }

    // ══════════════════════════════════════════════
    //  TEST 5: Revert on expired deadline
    // ══════════════════════════════════════════════

    function test_ResaleTicket_RevertExpiredDeadline() public {
        uint256 tokenId = 1;
        _mintAndApprove(tokenId);

        uint256 deadline = block.timestamp - 1; // Already expired

        bytes memory signature = _signResale(seller, buyer, tokenId, 2 ether, 1, deadline);

        vm.prank(buyer);
        vm.expectRevert(TicketNFT.SignatureExpired.selector);
        ticketNFT.resaleTicket{value: 1 ether}(tokenId, 1 ether, 2 ether, 1, deadline, signature);
    }

    // ══════════════════════════════════════════════
    //  TEST 6: Revert on salePrice > maxPrice
    // ══════════════════════════════════════════════

    function test_ResaleTicket_RevertPriceExceedsMax() public {
        uint256 tokenId = 1;
        _mintAndApprove(tokenId);

        uint256 salePrice = 3 ether;
        uint256 maxPrice = 2 ether;
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory signature = _signResale(seller, buyer, tokenId, maxPrice, 1, deadline);

        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(TicketNFT.PriceExceedsMaximum.selector, salePrice, maxPrice)
        );
        ticketNFT.resaleTicket{value: salePrice}(tokenId, salePrice, maxPrice, 1, deadline, signature);
    }

    // ══════════════════════════════════════════════
    //  TEST 7: Revert on replayed nonce
    // ══════════════════════════════════════════════

    function test_ResaleTicket_RevertReplayedNonce() public {
        uint256 tokenId = 1;
        _mintAndApprove(tokenId);

        uint256 nonce = 99;
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory sig1 = _signResale(seller, buyer, tokenId, 2 ether, nonce, deadline);

        // First resale succeeds
        vm.prank(buyer);
        ticketNFT.resaleTicket{value: 1 ether}(tokenId, 1 ether, 2 ether, nonce, deadline, sig1);

        // Buyer approves the contract for the next resale
        vm.prank(buyer);
        ticketNFT.approve(address(ticketNFT), tokenId);

        // Attempt replay with same nonce (new signature with buyer as seller this time)
        bytes memory sig2 = _signResale(buyer, seller, tokenId, 2 ether, nonce, deadline);

        vm.prank(seller);
        vm.expectRevert(abi.encodeWithSelector(TicketNFT.NonceAlreadyUsed.selector, nonce));
        ticketNFT.resaleTicket{value: 1 ether}(tokenId, 1 ether, 2 ether, nonce, deadline, sig2);
    }

    // ══════════════════════════════════════════════
    //  TEST 8: Revert on invalid/tampered signature
    // ══════════════════════════════════════════════

    function test_ResaleTicket_RevertInvalidSignature() public {
        uint256 tokenId = 1;
        _mintAndApprove(tokenId);

        uint256 deadline = block.timestamp + 1 hours;

        // Sign with a DIFFERENT private key (not the backend signer)
        (address fakeSigner, uint256 fakeKey) = makeAddrAndKey("fakeSigner");
        bytes32 structHash = keccak256(
            abi.encode(RESALE_TYPEHASH, seller, buyer, tokenId, uint256(2 ether), uint256(1), deadline)
        );
        bytes32 domainSeparator = ticketNFT.getDomainSeparator();
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(fakeKey, digest);
        bytes memory badSignature = abi.encodePacked(r, s, v);

        vm.prank(buyer);
        vm.expectRevert(TicketNFT.InvalidSignature.selector);
        ticketNFT.resaleTicket{value: 1 ether}(tokenId, 1 ether, 2 ether, 1, deadline, badSignature);

        // Suppress unused variable warning
        assertNotEq(fakeSigner, address(0));
    }

    // ══════════════════════════════════════════════
    //  TEST 9: Revert on insufficient payment
    // ══════════════════════════════════════════════

    function test_ResaleTicket_RevertInsufficientPayment() public {
        uint256 tokenId = 1;
        _mintAndApprove(tokenId);

        uint256 salePrice = 1 ether;
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory signature = _signResale(seller, buyer, tokenId, 2 ether, 1, deadline);

        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(TicketNFT.InsufficientPayment.selector, 0.5 ether, salePrice)
        );
        ticketNFT.resaleTicket{value: 0.5 ether}(tokenId, salePrice, 2 ether, 1, deadline, signature);
    }

    // ══════════════════════════════════════════════
    //  TEST 10: Backend signer update
    // ══════════════════════════════════════════════

    function test_SetBackendSigner() public {
        address newSigner = makeAddr("newSigner");

        vm.prank(organizer);
        ticketNFT.setBackendSigner(newSigner);

        assertEq(ticketNFT.backendSignerAddress(), newSigner, "Backend signer should be updated");
    }

    // ══════════════════════════════════════════════
    //  TEST 11: supportsInterface
    // ══════════════════════════════════════════════

    function test_SupportsInterface() public view {
        // ERC-721
        assertTrue(ticketNFT.supportsInterface(0x80ac58cd), "Should support ERC-721");
        // ERC-2981
        assertTrue(ticketNFT.supportsInterface(0x2a55205a), "Should support ERC-2981");
        // ERC-165
        assertTrue(ticketNFT.supportsInterface(0x01ffc9a7), "Should support ERC-165");
    }
}
