// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title CrowdfundEscrow
/// @notice Crowdfunding escrow platform for events
contract CrowdfundEscrow is ReentrancyGuard {
    enum CampaignState { Active, Successful, Finalized, Failed }

    struct Campaign {
        uint256 eventId;
        address organizer;
        uint256 goal;
        uint256 funded;
        uint256 deadline;
        CampaignState state;
    }

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    uint256 public nextCampaignId = 1;

    error InvalidDeadline();
    error InvalidGoal();
    error CampaignNotActive();
    error CampaignExpired();
    error NotOrganizer();
    error CampaignNotSuccessful();
    error RefundNotAvailable();
    error TransferFailed();

    event CampaignCreated(uint256 indexed campaignId, uint256 indexed eventId, address indexed organizer, uint256 goal, uint256 deadline);
    event CampaignBacked(uint256 indexed campaignId, address indexed backer, uint256 amount);
    event CampaignStateChanged(uint256 indexed campaignId, CampaignState newState);
    event RefundClaimed(uint256 indexed campaignId, address indexed backer, uint256 amount);

    /// @notice Create a new crowdfunding campaign
    /// @param eventId The event identifier
    /// @param goal The target funding goal
    /// @param deadline The campaign end timestamp
    function createCampaign(uint256 eventId, uint256 goal, uint256 deadline) external {
        if (deadline <= block.timestamp) revert InvalidDeadline();
        if (goal == 0) revert InvalidGoal();

        uint256 campaignId = nextCampaignId++;
        campaigns[campaignId] = Campaign({
            eventId: eventId,
            organizer: msg.sender,
            goal: goal,
            funded: 0,
            deadline: deadline,
            state: CampaignState.Active
        });

        emit CampaignCreated(campaignId, eventId, msg.sender, goal, deadline);
    }

    /// @notice Back a campaign
    /// @param campaignId The campaign to back
    function backCampaign(uint256 campaignId) external payable nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.state != CampaignState.Active) revert CampaignNotActive();
        if (block.timestamp > campaign.deadline) revert CampaignExpired();

        campaign.funded += msg.value;
        contributions[campaignId][msg.sender] += msg.value;

        emit CampaignBacked(campaignId, msg.sender, msg.value);

        if (campaign.funded >= campaign.goal) {
            campaign.state = CampaignState.Successful;
            emit CampaignStateChanged(campaignId, CampaignState.Successful);
        }
    }

    /// @notice Finalize a successful campaign and transfer funds to organizer
    /// @param campaignId The campaign to finalize
    function finalizeCampaign(uint256 campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        if (msg.sender != campaign.organizer) revert NotOrganizer();
        if (campaign.state != CampaignState.Successful) revert CampaignNotSuccessful();

        campaign.state = CampaignState.Finalized;
        emit CampaignStateChanged(campaignId, CampaignState.Finalized);

        (bool success, ) = campaign.organizer.call{value: campaign.funded}("");
        if (!success) revert TransferFailed();
    }

    /// @notice Claim refund for a failed campaign
    /// @param campaignId The campaign to claim refund from
    function claimRefund(uint256 campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        
        if (campaign.state == CampaignState.Active) {
            if (block.timestamp <= campaign.deadline || campaign.funded >= campaign.goal) {
                revert RefundNotAvailable();
            }
            campaign.state = CampaignState.Failed;
            emit CampaignStateChanged(campaignId, CampaignState.Failed);
        } else if (campaign.state != CampaignState.Failed) {
            revert RefundNotAvailable();
        }

        uint256 amount = contributions[campaignId][msg.sender];
        if (amount == 0) revert RefundNotAvailable();

        contributions[campaignId][msg.sender] = 0;
        
        emit RefundClaimed(campaignId, msg.sender, amount);

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /// @notice Get campaign details
    /// @param campaignId The campaign identifier
    /// @return eventId The event identifier
    /// @return goal The target funding goal
    /// @return funded The current funded amount
    /// @return deadline The campaign deadline
    /// @return state The current state of the campaign
    function getCampaign(uint256 campaignId) external view returns (uint256 eventId, uint256 goal, uint256 funded, uint256 deadline, uint8 state) {
        Campaign memory campaign = campaigns[campaignId];
        return (campaign.eventId, campaign.goal, campaign.funded, campaign.deadline, uint8(campaign.state));
    }
}
