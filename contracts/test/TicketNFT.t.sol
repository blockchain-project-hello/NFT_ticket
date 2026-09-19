// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {TicketNFT} from "../src/TicketNFT.sol";

contract TicketNFTTest is Test {
    TicketNFT public nft;
    
    uint256 public signerPk;
    address public signerAddr;
    
    address public organizer = address(1);
    address public user1 = address(2);
    address public user2 = address(3);

    bytes32 private constant RESALE_TYPEHASH = keccak256("ResaleAuth(address seller,address buyer,uint256 tokenId,uint256 maxPrice,uint256 nonce,uint256 deadline)");

    function setUp() public {
        signerPk = 0x1234;
        signerAddr = vm.addr(signerPk);
        
        nft = new TicketNFT(signerAddr);
        
        vm.prank(organizer);
        nft.createEvent("Test Event", 1 ether, 10, block.timestamp + 10 days);
        
        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
    }

    function testCreateEvent() public {
        vm.prank(address(4));
        nft.createEvent("Event 2", 2 ether, 50, block.timestamp + 20 days);
        assertEq(nft.basePrice(2), 2 ether);
    }

    function testMintTicket() public {
        vm.prank(user1);
        nft.mintTicket{value: 1 ether}(1);
        
        assertEq(nft.ownerOf(1), user1);
        assertEq(nft.getTicketEvent(1), 1);
        assertEq(organizer.balance, 1 ether);
    }

    function testMintSoldOut() public {
        vm.startPrank(user1);
        for(uint i = 0; i < 10; i++) {
            nft.mintTicket{value: 1 ether}(1);
        }
        
        vm.expectRevert(TicketNFT.EventSoldOut.selector);
        nft.mintTicket{value: 1 ether}(1);
        vm.stopPrank();
    }

    function testListForResale() public {
        vm.prank(user1);
        nft.mintTicket{value: 1 ether}(1);
        
        vm.prank(user1);
        nft.listForResale(1, 1.5 ether);
        
        (bool isListed, uint256 askPrice) = nft.resaleListings(1);
        assertTrue(isListed);
        assertEq(askPrice, 1.5 ether);
    }

    function testListForResaleRejectsNonOwner() public {
        vm.prank(user1);
        nft.mintTicket{value: 1 ether}(1);

        vm.prank(user2);
        vm.expectRevert(TicketNFT.NotTicketOwner.selector);
        nft.listForResale(1, 1.5 ether);
    }

    function testListForResaleRejectsZeroPrice() public {
        vm.prank(user1);
        nft.mintTicket{value: 1 ether}(1);

        vm.prank(user1);
        vm.expectRevert(TicketNFT.InvalidPrice.selector);
        nft.listForResale(1, 0);
    }

    function testDelistForResale() public {
        vm.prank(user1);
        nft.mintTicket{value: 1 ether}(1);
        vm.prank(user1);
        nft.listForResale(1, 1.5 ether);

        vm.prank(user1);
        nft.delistFromResale(1);

        (bool isListed,) = nft.resaleListings(1);
        assertFalse(isListed);
    }

    function testResaleWithValidSignature() public {
        vm.prank(user1);
        nft.mintTicket{value: 1 ether}(1);
        
        vm.prank(user1);
        nft.listForResale(1, 1.5 ether);

        uint256 maxPrice = 2 ether;
        uint256 nonce = 1;
        uint256 deadline = block.timestamp + 1 hours;
        
        bytes32 structHash = keccak256(abi.encode(
            RESALE_TYPEHASH,
            user1,
            user2,
            1,
            maxPrice,
            nonce,
            deadline
        ));
        
        bytes32 domainSeparator = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("TicketNFT")),
            keccak256(bytes("1")),
            block.chainid,
            address(nft)
        ));
        
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        uint256 user1BalanceBefore = user1.balance;
        uint256 organizerBalanceBefore = organizer.balance;
        
        vm.prank(user2);
        nft.resaleTicket{value: 1.5 ether}(1, maxPrice, nonce, deadline, signature);
        
        assertEq(nft.ownerOf(1), user2);
        
        uint256 royalty = (1.5 ether * 1000) / 10000;
        uint256 sellerAmount = 1.5 ether - royalty;
        
        assertEq(user1.balance, user1BalanceBefore + sellerAmount);
        assertEq(organizer.balance, organizerBalanceBefore + royalty);
    }

    function testResaleRejectsInvalidSignature() public {
        vm.prank(user1);
        nft.mintTicket{value: 1 ether}(1);
        
        vm.prank(user1);
        nft.listForResale(1, 1.5 ether);

        uint256 maxPrice = 2 ether;
        uint256 nonce = 1;
        uint256 deadline = block.timestamp + 1 hours;
        
        bytes32 structHash = keccak256(abi.encode(
            RESALE_TYPEHASH,
            user1,
            user2,
            1,
            maxPrice,
            nonce,
            deadline
        ));
        
        bytes32 domainSeparator = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("TicketNFT")),
            keccak256(bytes("1")),
            block.chainid,
            address(nft)
        ));
        
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        
        uint256 wrongSignerPk = 0x9999;
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongSignerPk, digest);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        vm.prank(user2);
        vm.expectRevert(TicketNFT.InvalidSignature.selector);
        nft.resaleTicket{value: 1.5 ether}(1, maxPrice, nonce, deadline, signature);
    }

    function testResaleRejectsExpiredDeadline() public {
        vm.prank(user1);
        nft.mintTicket{value: 1 ether}(1);
        
        vm.prank(user1);
        nft.listForResale(1, 1.5 ether);

        uint256 maxPrice = 2 ether;
        uint256 nonce = 1;
        uint256 deadline = block.timestamp - 1; // Expired
        
        vm.prank(user2);
        vm.expectRevert(TicketNFT.ExpiredDeadline.selector);
        nft.resaleTicket{value: 1.5 ether}(1, maxPrice, nonce, deadline, "");
    }

    function testResaleRejectsReplayedNonce() public {
        vm.prank(user1);
        nft.mintTicket{value: 1 ether}(1);
        
        vm.prank(user1);
        nft.listForResale(1, 1.5 ether);

        uint256 maxPrice = 2 ether;
        uint256 nonce = 1;
        uint256 deadline = block.timestamp + 1 hours;
        
        bytes32 structHash = keccak256(abi.encode(
            RESALE_TYPEHASH,
            user1,
            user2,
            1,
            maxPrice,
            nonce,
            deadline
        ));
        
        bytes32 domainSeparator = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("TicketNFT")),
            keccak256(bytes("1")),
            block.chainid,
            address(nft)
        ));
        
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        vm.prank(user2);
        nft.resaleTicket{value: 1.5 ether}(1, maxPrice, nonce, deadline, signature);
        
        // Setup again for user2 to sell to user1
        vm.prank(user2);
        nft.listForResale(1, 1.5 ether);
        
        vm.prank(user1);
        vm.expectRevert(TicketNFT.NonceAlreadyUsed.selector);
        nft.resaleTicket{value: 1.5 ether}(1, maxPrice, nonce, deadline, signature);
    }

    function testCannotBuyOwnTicket() public {
        vm.prank(user1);
        nft.mintTicket{value: 1 ether}(1);
        vm.prank(user1);
        nft.listForResale(1, 1.5 ether);

        vm.prank(user1);
        vm.expectRevert(TicketNFT.InvalidSignature.selector);
        nft.resaleTicket{value: 1.5 ether}(1, 1.5 ether, 9, block.timestamp + 1 hours, "");
    }

    function testCannotBuyNonexistentListing() public {
        vm.prank(user2);
        vm.expectRevert(TicketNFT.TicketNotListed.selector);
        nft.resaleTicket{value: 1 ether}(999, 1 ether, 10, block.timestamp + 1 hours, "");
    }

    function testCancelledListingCannotBePurchased() public {
        vm.prank(user1);
        nft.mintTicket{value: 1 ether}(1);
        vm.prank(user1);
        nft.listForResale(1, 1.5 ether);
        vm.prank(user1);
        nft.delistFromResale(1);

        vm.prank(user2);
        vm.expectRevert(TicketNFT.TicketNotListed.selector);
        nft.resaleTicket{value: 1.5 ether}(1, 1.5 ether, 11, block.timestamp + 1 hours, "");
    }
}
