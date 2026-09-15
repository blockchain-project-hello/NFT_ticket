// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {TicketNFT} from "../src/TicketNFT.sol";
import {CrowdfundEscrow} from "../src/CrowdfundEscrow.sol";

contract DeployScript is Script {
    function run() external {
        address signerAddress = vm.envAddress("SIGNER_ADDRESS");

        vm.startBroadcast();

        TicketNFT ticketNFT = new TicketNFT(signerAddress);
        // CrowdfundEscrow escrow = new CrowdfundEscrow();

        console.log("TicketNFT deployed at:", address(ticketNFT));
        // console.log("CrowdfundEscrow deployed at:", address(escrow));

        vm.stopBroadcast();
    }
}
