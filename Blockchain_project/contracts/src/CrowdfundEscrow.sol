// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CrowdfundEscrow {
    address public organizer;

    constructor() {
        organizer = msg.sender;
    }
}
