// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MarginVault} from "../src/MarginVault.sol";

/**
 * @dev Déploie `MarginVault` sur la XRPL EVM Sidechain (testnet 1449000 / mainnet 1440000).
 *      Paramètres via variables d'environnement (jamais en dur) :
 *        - TIDE_RLUSD_EVM : adresse du token de collatéral (RLUSD).
 *        - TIDE_OPERATOR  : clé opérateur (Safe) qui applique la compta.
 *        - TIDE_OWNER     : gouvernance (Safe froid).
 *      Exécuter : forge script script/DeployMarginVault.s.sol --rpc-url <url> --broadcast
 */
contract DeployMarginVault is Script {
    function run() external returns (MarginVault vault) {
        address token = vm.envAddress("TIDE_RLUSD_EVM");
        address operator = vm.envAddress("TIDE_OPERATOR");
        address owner = vm.envAddress("TIDE_OWNER");
        vm.startBroadcast();
        vault = new MarginVault(IERC20(token), operator, owner);
        vm.stopBroadcast();
    }
}
