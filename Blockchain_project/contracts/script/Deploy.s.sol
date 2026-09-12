// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/TicketNFT.sol";
import "../src/CrowdfundEscrow.sol";

/// @title Deploy Script — Polygon Amoy Testnet
/// @notice Deploys TicketNFT and CrowdfundEscrow, then transfers NFT ownership to escrow
contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Configuration
        address backendSigner = deployer; // Replace with actual backend signer in production
        address royaltyReceiver = deployer;
        uint96 royaltyBps = 750; // 7.5%

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy TicketNFT
        TicketNFT ticketNFT = new TicketNFT(backendSigner, royaltyReceiver, royaltyBps);
        console.log("TicketNFT deployed at:", address(ticketNFT));

        // 2. Deploy CrowdfundEscrow
        CrowdfundEscrow escrow = new CrowdfundEscrow(address(ticketNFT));
        console.log("CrowdfundEscrow deployed at:", address(escrow));

        // 3. Transfer TicketNFT ownership to escrow so it can mint Founder Passes
        ticketNFT.transferOwnership(address(escrow));
        console.log("TicketNFT ownership transferred to CrowdfundEscrow");

        vm.stopBroadcast();
    }
}
