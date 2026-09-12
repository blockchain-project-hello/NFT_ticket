// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TicketNFT.sol";

/// @title CrowdfundEscrow — Decentralized event financing with milestone payouts
/// @author NFT Ticketing Platform
/// @notice Contributors fund events; organizers receive funds on success, contributors get refunds on failure
/// @dev Follows CEI pattern. Mints Founder Pass NFTs to contributors via TicketNFT on campaign success.
contract CrowdfundEscrow {
    // ──────────────────────────────────────────────
    //  Types
    // ──────────────────────────────────────────────

    enum CampaignState {
        FUNDING,
        SUCCESSFUL,
        FAILED
    }

    struct Campaign {
        address organizer;
        uint256 fundingGoal;
        uint256 deadline;
        uint256 totalRaised;
        string founderPassUri;
        CampaignState state;
        address[] contributors;
    }

    // ──────────────────────────────────────────────
    //  State Variables
    // ──────────────────────────────────────────────

    /// @notice Reference to TicketNFT contract for minting Founder Pass NFTs
    TicketNFT public immutable ticketNFT;

    /// @notice Auto-incrementing campaign ID counter
    uint256 public nextCampaignId = 1;

    /// @notice Campaign ID => Campaign data
    mapping(uint256 => Campaign) public campaigns;

    /// @notice Campaign ID => contributor address => amount contributed
    mapping(uint256 => mapping(address => uint256)) public contributions;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed organizer,
        uint256 fundingGoal,
        uint256 deadline
    );

    event ContributionMade(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );

    event CampaignSucceeded(uint256 indexed campaignId, uint256 totalRaised);
    event CampaignFailed(uint256 indexed campaignId);
    event RefundClaimed(uint256 indexed campaignId, address indexed contributor, uint256 amount);
    event PayoutSent(uint256 indexed campaignId, address indexed organizer, uint256 amount);
    event FounderPassMinted(uint256 indexed campaignId, address indexed contributor, uint256 tokenId);

    // ──────────────────────────────────────────────
    //  Errors
    // ──────────────────────────────────────────────

    error CampaignDoesNotExist(uint256 campaignId);
    error CampaignNotInFundingState(uint256 campaignId);
    error CampaignDeadlinePassed(uint256 campaignId);
    error CampaignDeadlineNotPassed(uint256 campaignId);
    error CampaignGoalNotReached(uint256 campaignId, uint256 totalRaised, uint256 goal);
    error CampaignNotFailed(uint256 campaignId);
    error ZeroContribution();
    error NoContribution(uint256 campaignId, address contributor);
    error NotOrganizer(uint256 campaignId, address caller);
    error TransferFailed();
    error InvalidDeadline();
    error InvalidGoal();

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    /// @param _ticketNFT Address of the TicketNFT contract
    constructor(address _ticketNFT) {
        ticketNFT = TicketNFT(_ticketNFT);
    }

    // ──────────────────────────────────────────────
    //  Campaign Management
    // ──────────────────────────────────────────────

    /// @notice Create a new crowdfunding campaign
    /// @param fundingGoal Target amount in native currency (MATIC)
    /// @param deadline Unix timestamp by which the goal must be met
    /// @param founderPassUri Metadata URI for the Founder Pass NFT minted on success
    /// @return campaignId The created campaign's ID
    function createCampaign(
        uint256 fundingGoal,
        uint256 deadline,
        string calldata founderPassUri
    ) external returns (uint256 campaignId) {
        if (fundingGoal == 0) revert InvalidGoal();
        if (deadline <= block.timestamp) revert InvalidDeadline();

        campaignId = nextCampaignId;
        unchecked {
            nextCampaignId = campaignId + 1;
        }

        Campaign storage c = campaigns[campaignId];
        c.organizer = msg.sender;
        c.fundingGoal = fundingGoal;
        c.deadline = deadline;
        c.founderPassUri = founderPassUri;
        c.state = CampaignState.FUNDING;

        emit CampaignCreated(campaignId, msg.sender, fundingGoal, deadline);
    }

    // ──────────────────────────────────────────────
    //  Contributions
    // ──────────────────────────────────────────────

    /// @notice Contribute native currency to a campaign
    /// @param campaignId The campaign to contribute to
    function contribute(uint256 campaignId) external payable {
        Campaign storage c = campaigns[campaignId];

        // Checks
        if (c.organizer == address(0)) revert CampaignDoesNotExist(campaignId);
        if (c.state != CampaignState.FUNDING) revert CampaignNotInFundingState(campaignId);
        if (block.timestamp > c.deadline) revert CampaignDeadlinePassed(campaignId);
        if (msg.value == 0) revert ZeroContribution();

        // Effects
        bool isNewContributor = contributions[campaignId][msg.sender] == 0;
        contributions[campaignId][msg.sender] += msg.value;
        c.totalRaised += msg.value;

        if (isNewContributor) {
            c.contributors.push(msg.sender);
        }

        emit ContributionMade(campaignId, msg.sender, msg.value);
    }

    // ──────────────────────────────────────────────
    //  Payout (Success Path)
    // ──────────────────────────────────────────────

    /// @notice Payout organizer if campaign goal is reached; mints Founder Pass NFTs
    /// @param campaignId The campaign to finalize
    function payoutOrganizer(uint256 campaignId) external {
        Campaign storage c = campaigns[campaignId];

        // Checks
        if (c.organizer == address(0)) revert CampaignDoesNotExist(campaignId);
        if (c.state != CampaignState.FUNDING) revert CampaignNotInFundingState(campaignId);
        if (c.totalRaised < c.fundingGoal) {
            revert CampaignGoalNotReached(campaignId, c.totalRaised, c.fundingGoal);
        }

        // Effects — transition state BEFORE any external calls
        c.state = CampaignState.SUCCESSFUL;
        uint256 payoutAmount = c.totalRaised;

        emit CampaignSucceeded(campaignId, payoutAmount);

        // Interactions — send funds to organizer
        (bool success,) = payable(c.organizer).call{value: payoutAmount}("");
        if (!success) revert TransferFailed();
        emit PayoutSent(campaignId, c.organizer, payoutAmount);

        // Mint Founder Pass NFTs to all contributors
        uint256 contributorCount = c.contributors.length;
        for (uint256 i; i < contributorCount;) {
            address contributor = c.contributors[i];
            uint256 tokenId = ticketNFT.mintTicket(contributor, c.founderPassUri);
            emit FounderPassMinted(campaignId, contributor, tokenId);
            unchecked {
                ++i;
            }
        }
    }

    // ──────────────────────────────────────────────
    //  Refund (Failure Path)
    // ──────────────────────────────────────────────

    /// @notice Claim a refund if the campaign failed (deadline passed, goal not met)
    /// @param campaignId The campaign to claim a refund from
    function claimRefund(uint256 campaignId) external {
        Campaign storage c = campaigns[campaignId];

        // Checks
        if (c.organizer == address(0)) revert CampaignDoesNotExist(campaignId);

        // Transition to FAILED if deadline passed and goal not met
        if (c.state == CampaignState.FUNDING) {
            if (block.timestamp <= c.deadline) revert CampaignDeadlineNotPassed(campaignId);
            if (c.totalRaised >= c.fundingGoal) {
                revert CampaignGoalNotReached(campaignId, c.totalRaised, c.fundingGoal);
            }
            c.state = CampaignState.FAILED;
            emit CampaignFailed(campaignId);
        }

        if (c.state != CampaignState.FAILED) revert CampaignNotFailed(campaignId);

        uint256 amount = contributions[campaignId][msg.sender];
        if (amount == 0) revert NoContribution(campaignId, msg.sender);

        // Effects — zero balance BEFORE sending funds (CEI)
        contributions[campaignId][msg.sender] = 0;

        // Interactions
        (bool success,) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit RefundClaimed(campaignId, msg.sender, amount);
    }

    // ──────────────────────────────────────────────
    //  View Helpers
    // ──────────────────────────────────────────────

    /// @notice Get the list of contributors for a campaign
    /// @param campaignId The campaign ID
    /// @return Array of contributor addresses
    function getContributors(uint256 campaignId) external view returns (address[] memory) {
        return campaigns[campaignId].contributors;
    }

    /// @notice Get campaign state
    /// @param campaignId The campaign ID
    /// @return state The current campaign state
    function getCampaignState(uint256 campaignId) external view returns (CampaignState state) {
        return campaigns[campaignId].state;
    }
}
