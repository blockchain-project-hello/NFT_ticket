// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/TicketNFT.sol";
import "../src/CrowdfundEscrow.sol";

/// @title CrowdfundEscrow Test Suite
/// @notice 10 tests covering campaign lifecycle: creation, contribution, success/payout, failure/refund
contract CrowdfundEscrowTest is Test {
    TicketNFT public ticketNFT;
    CrowdfundEscrow public escrow;

    // Test accounts
    address public organizer;
    address public contributor1;
    address public contributor2;
    address public backendSigner;

    // Campaign defaults
    uint256 public constant FUNDING_GOAL = 10 ether;
    uint256 public constant CAMPAIGN_DURATION = 7 days;

    function setUp() public {
        organizer = makeAddr("organizer");
        contributor1 = makeAddr("contributor1");
        contributor2 = makeAddr("contributor2");
        backendSigner = makeAddr("backendSigner");

        // Deploy TicketNFT with organizer as owner
        vm.prank(organizer);
        ticketNFT = new TicketNFT(backendSigner, organizer, 750);

        // Deploy CrowdfundEscrow
        escrow = new CrowdfundEscrow(address(ticketNFT));

        // Transfer TicketNFT ownership to escrow so it can mint Founder Pass NFTs
        vm.prank(organizer);
        ticketNFT.transferOwnership(address(escrow));

        // Fund contributors
        vm.deal(contributor1, 100 ether);
        vm.deal(contributor2, 100 ether);
    }

    // ──────────────────────────────────────────────
    //  Helpers
    // ──────────────────────────────────────────────

    /// @dev Creates a standard campaign and returns its ID
    function _createCampaign() internal returns (uint256) {
        vm.prank(organizer);
        return escrow.createCampaign(
            FUNDING_GOAL,
            block.timestamp + CAMPAIGN_DURATION,
            "ipfs://founder-pass"
        );
    }

    // ══════════════════════════════════════════════
    //  TEST 1: Campaign creation
    // ══════════════════════════════════════════════

    function test_CreateCampaign() public {
        vm.prank(organizer);
        uint256 campaignId = escrow.createCampaign(
            FUNDING_GOAL,
            block.timestamp + CAMPAIGN_DURATION,
            "ipfs://founder-pass-meta"
        );

        assertEq(campaignId, 1, "First campaign ID should be 1");

        (
            address org,
            uint256 goal,
            uint256 deadline,
            uint256 raised,
            string memory uri,
            CrowdfundEscrow.CampaignState state
        ) = escrow.campaigns(campaignId);

        assertEq(org, organizer, "Organizer should match");
        assertEq(goal, FUNDING_GOAL, "Goal should match");
        assertEq(deadline, block.timestamp + CAMPAIGN_DURATION, "Deadline should match");
        assertEq(raised, 0, "Total raised should be 0");
        assertEq(keccak256(bytes(uri)), keccak256(bytes("ipfs://founder-pass-meta")), "URI should match");
        assertEq(uint256(state), uint256(CrowdfundEscrow.CampaignState.FUNDING), "State should be FUNDING");
    }

    // ══════════════════════════════════════════════
    //  TEST 2: Successful contribution
    // ══════════════════════════════════════════════

    function test_Contribute_Success() public {
        uint256 campaignId = _createCampaign();

        vm.prank(contributor1);
        escrow.contribute{value: 3 ether}(campaignId);

        assertEq(escrow.contributions(campaignId, contributor1), 3 ether, "Contribution should be tracked");

        (, , , uint256 raised, ,) = escrow.campaigns(campaignId);
        assertEq(raised, 3 ether, "Total raised should be 3 ether");

        address[] memory contributors = escrow.getContributors(campaignId);
        assertEq(contributors.length, 1, "Should have 1 contributor");
        assertEq(contributors[0], contributor1, "Contributor should be contributor1");
    }

    // ══════════════════════════════════════════════
    //  TEST 3: Revert on contribution after deadline
    // ══════════════════════════════════════════════

    function test_Contribute_RevertAfterDeadline() public {
        uint256 campaignId = _createCampaign();

        // Warp past deadline
        vm.warp(block.timestamp + CAMPAIGN_DURATION + 1);

        vm.prank(contributor1);
        vm.expectRevert(
            abi.encodeWithSelector(CrowdfundEscrow.CampaignDeadlinePassed.selector, campaignId)
        );
        escrow.contribute{value: 1 ether}(campaignId);
    }

    // ══════════════════════════════════════════════
    //  TEST 4: Revert on contribution to non-existent campaign
    // ══════════════════════════════════════════════

    function test_Contribute_RevertNonExistentCampaign() public {
        vm.prank(contributor1);
        vm.expectRevert(
            abi.encodeWithSelector(CrowdfundEscrow.CampaignDoesNotExist.selector, 999)
        );
        escrow.contribute{value: 1 ether}(999);
    }

    // ══════════════════════════════════════════════
    //  TEST 5: Full success path — contribute, payout, Founder Pass minted
    // ══════════════════════════════════════════════

    function test_FullSuccessPath() public {
        uint256 campaignId = _createCampaign();

        // Two contributors reach the goal
        vm.prank(contributor1);
        escrow.contribute{value: 6 ether}(campaignId);

        vm.prank(contributor2);
        escrow.contribute{value: 5 ether}(campaignId);

        // Total raised: 11 ether >= 10 ether goal
        uint256 organizerBalBefore = organizer.balance;

        // Anyone can trigger payout once goal is reached
        escrow.payoutOrganizer(campaignId);

        // Verify state transition
        assertEq(
            uint256(escrow.getCampaignState(campaignId)),
            uint256(CrowdfundEscrow.CampaignState.SUCCESSFUL),
            "State should be SUCCESSFUL"
        );

        // Verify organizer received funds
        assertEq(
            organizer.balance - organizerBalBefore,
            11 ether,
            "Organizer should receive all contributed funds"
        );

        // Verify Founder Pass NFTs minted to both contributors
        assertEq(ticketNFT.ownerOf(1), contributor1, "Contributor1 should own Founder Pass #1");
        assertEq(ticketNFT.ownerOf(2), contributor2, "Contributor2 should own Founder Pass #2");
        assertEq(ticketNFT.totalMinted(), 2, "Two Founder Pass NFTs should be minted");
    }

    // ══════════════════════════════════════════════
    //  TEST 6: Full refund path — contribute, deadline, claim refund
    // ══════════════════════════════════════════════

    function test_FullRefundPath() public {
        uint256 campaignId = _createCampaign();

        vm.prank(contributor1);
        escrow.contribute{value: 3 ether}(campaignId);

        uint256 balBefore = contributor1.balance;

        // Warp past deadline (goal NOT met: 3 < 10)
        vm.warp(block.timestamp + CAMPAIGN_DURATION + 1);

        vm.prank(contributor1);
        escrow.claimRefund(campaignId);

        // Verify state
        assertEq(
            uint256(escrow.getCampaignState(campaignId)),
            uint256(CrowdfundEscrow.CampaignState.FAILED),
            "State should be FAILED"
        );

        // Verify full refund
        assertEq(
            contributor1.balance - balBefore,
            3 ether,
            "Contributor1 should receive full refund"
        );

        // Verify contribution zeroed
        assertEq(
            escrow.contributions(campaignId, contributor1),
            0,
            "Contribution should be zeroed after refund"
        );
    }

    // ══════════════════════════════════════════════
    //  TEST 7: Revert on double refund
    // ══════════════════════════════════════════════

    function test_ClaimRefund_RevertDoubleRefund() public {
        uint256 campaignId = _createCampaign();

        vm.prank(contributor1);
        escrow.contribute{value: 3 ether}(campaignId);

        vm.warp(block.timestamp + CAMPAIGN_DURATION + 1);

        // First refund succeeds
        vm.prank(contributor1);
        escrow.claimRefund(campaignId);

        // Second refund reverts
        vm.prank(contributor1);
        vm.expectRevert(
            abi.encodeWithSelector(CrowdfundEscrow.NoContribution.selector, campaignId, contributor1)
        );
        escrow.claimRefund(campaignId);
    }

    // ══════════════════════════════════════════════
    //  TEST 8: Revert on payout when goal not reached
    // ══════════════════════════════════════════════

    function test_PayoutOrganizer_RevertGoalNotReached() public {
        uint256 campaignId = _createCampaign();

        vm.prank(contributor1);
        escrow.contribute{value: 3 ether}(campaignId);

        // Goal is 10 ether, only 3 raised
        vm.expectRevert(
            abi.encodeWithSelector(
                CrowdfundEscrow.CampaignGoalNotReached.selector,
                campaignId,
                3 ether,
                FUNDING_GOAL
            )
        );
        escrow.payoutOrganizer(campaignId);
    }

    // ══════════════════════════════════════════════
    //  TEST 9: Revert on refund when campaign succeeded
    // ══════════════════════════════════════════════

    function test_ClaimRefund_RevertOnSucceededCampaign() public {
        uint256 campaignId = _createCampaign();

        vm.prank(contributor1);
        escrow.contribute{value: 10 ether}(campaignId);

        // Payout triggers SUCCESSFUL state
        escrow.payoutOrganizer(campaignId);

        // Attempt refund on a successful campaign
        vm.prank(contributor1);
        vm.expectRevert(
            abi.encodeWithSelector(CrowdfundEscrow.CampaignNotFailed.selector, campaignId)
        );
        escrow.claimRefund(campaignId);
    }

    // ══════════════════════════════════════════════
    //  TEST 10: Multiple contributors lifecycle
    // ══════════════════════════════════════════════

    function test_MultipleContributorsRefund() public {
        uint256 campaignId = _createCampaign();

        // Both contribute, but total < goal
        vm.prank(contributor1);
        escrow.contribute{value: 4 ether}(campaignId);

        vm.prank(contributor2);
        escrow.contribute{value: 3 ether}(campaignId);

        // Total: 7 ether < 10 ether goal. Warp past deadline.
        vm.warp(block.timestamp + CAMPAIGN_DURATION + 1);

        uint256 bal1Before = contributor1.balance;
        uint256 bal2Before = contributor2.balance;

        // Both claim refunds
        vm.prank(contributor1);
        escrow.claimRefund(campaignId);

        vm.prank(contributor2);
        escrow.claimRefund(campaignId);

        // Verify each got their exact amount back
        assertEq(contributor1.balance - bal1Before, 4 ether, "Contributor1 should get 4 ether back");
        assertEq(contributor2.balance - bal2Before, 3 ether, "Contributor2 should get 3 ether back");

        // Verify all contributions zeroed
        assertEq(escrow.contributions(campaignId, contributor1), 0, "Contributor1 balance should be 0");
        assertEq(escrow.contributions(campaignId, contributor2), 0, "Contributor2 balance should be 0");
    }
}
