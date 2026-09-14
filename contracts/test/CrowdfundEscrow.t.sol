// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {CrowdfundEscrow} from "../src/CrowdfundEscrow.sol";

contract CrowdfundEscrowTest is Test {
    CrowdfundEscrow public escrow;
    
    address public organizer = address(1);
    address public backer1 = address(2);
    address public backer2 = address(3);

    function setUp() public {
        escrow = new CrowdfundEscrow();
        
        vm.deal(backer1, 100 ether);
        vm.deal(backer2, 100 ether);
    }

    function testCreateCampaign() public {
        vm.prank(organizer);
        escrow.createCampaign(1, 10 ether, block.timestamp + 10 days);
        
        (uint256 eventId, uint256 goal, uint256 funded, uint256 deadline, uint8 state) = escrow.getCampaign(1);
        assertEq(eventId, 1);
        assertEq(goal, 10 ether);
        assertEq(funded, 0);
        assertEq(deadline, block.timestamp + 10 days);
        assertEq(state, 0); // Active
    }

    function testBackCampaign() public {
        vm.prank(organizer);
        escrow.createCampaign(1, 10 ether, block.timestamp + 10 days);
        
        vm.prank(backer1);
        escrow.backCampaign{value: 5 ether}(1);
        
        (,, uint256 funded,, uint8 state) = escrow.getCampaign(1);
        assertEq(funded, 5 ether);
        assertEq(state, 0); // Active
        assertEq(escrow.contributions(1, backer1), 5 ether);
    }

    function testFinalizeCampaign() public {
        vm.prank(organizer);
        escrow.createCampaign(1, 10 ether, block.timestamp + 10 days);
        
        vm.prank(backer1);
        escrow.backCampaign{value: 10 ether}(1); // reaches goal
        
        (,,,, uint8 state) = escrow.getCampaign(1);
        assertEq(state, 1); // Successful
        
        uint256 orgBalanceBefore = organizer.balance;
        
        vm.prank(organizer);
        escrow.finalizeCampaign(1);
        
        (,,,, uint8 state2) = escrow.getCampaign(1);
        assertEq(state2, 2); // Finalized
        assertEq(organizer.balance, orgBalanceBefore + 10 ether);
    }

    function testClaimRefund() public {
        vm.prank(organizer);
        escrow.createCampaign(1, 10 ether, block.timestamp + 10 days);
        
        vm.prank(backer1);
        escrow.backCampaign{value: 5 ether}(1);
        
        vm.warp(block.timestamp + 11 days); // Past deadline
        
        uint256 backerBalanceBefore = backer1.balance;
        
        vm.prank(backer1);
        escrow.claimRefund(1);
        
        assertEq(backer1.balance, backerBalanceBefore + 5 ether);
        
        (,,,, uint8 state) = escrow.getCampaign(1);
        assertEq(state, 3); // Failed
    }

    function testCannotFinalizeBeforeGoal() public {
        vm.prank(organizer);
        escrow.createCampaign(1, 10 ether, block.timestamp + 10 days);
        
        vm.prank(backer1);
        escrow.backCampaign{value: 5 ether}(1);
        
        vm.prank(organizer);
        vm.expectRevert(CrowdfundEscrow.CampaignNotSuccessful.selector);
        escrow.finalizeCampaign(1);
    }

    function testCannotBackExpiredCampaign() public {
        vm.prank(organizer);
        escrow.createCampaign(1, 10 ether, block.timestamp + 10 days);
        
        vm.warp(block.timestamp + 11 days);
        
        vm.prank(backer1);
        vm.expectRevert(CrowdfundEscrow.CampaignExpired.selector);
        escrow.backCampaign{value: 5 ether}(1);
    }
}
