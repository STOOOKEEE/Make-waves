// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {MarginVault} from "../../src/MarginVault.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {MarginVaultHandler} from "../handlers/MarginVaultHandler.sol";

/// @dev Prouve la conservation du collatéral et la solvabilité sous séquences aléatoires.
contract MarginVaultInvariantTest is StdInvariant, Test {
    MarginVault internal vault;
    MockERC20 internal token;
    MarginVaultHandler internal handler;
    address[] internal actors;

    function setUp() public {
        token = new MockERC20();
        // Le test est d'abord operator + owner, puis délègue au handler.
        vault = new MarginVault(token, address(this), address(this));

        actors.push(makeAddr("a1"));
        actors.push(makeAddr("a2"));
        actors.push(makeAddr("a3"));
        actors.push(makeAddr("a4"));

        handler = new MarginVaultHandler(vault, token, actors);
        vault.setOperator(address(handler));
        vault.transferOwnership(address(handler));
        handler.init(); // le handler accepte l'ownership

        bytes4[] memory selectors = new bytes4[](9);
        selectors[0] = MarginVaultHandler.deposit.selector;
        selectors[1] = MarginVaultHandler.withdraw.selector;
        selectors[2] = MarginVaultHandler.openAccounting.selector;
        selectors[3] = MarginVaultHandler.closeAccounting.selector;
        selectors[4] = MarginVaultHandler.applyFunding.selector;
        selectors[5] = MarginVaultHandler.fundPool.selector;
        selectors[6] = MarginVaultHandler.defundPool.selector;
        selectors[7] = MarginVaultHandler.donateAndSkim.selector;
        selectors[8] = MarginVaultHandler.pauseToggle.selector;
        targetContract(address(handler));
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    /// Conservation : la compta interne = Σ collatéraux + pool.
    function invariant_totalAccountedEqualsSumOfCollateralPlusPool() public view {
        uint256 sum;
        for (uint256 i; i < actors.length; i++) {
            sum += vault.collateral(actors[i]);
        }
        assertEq(vault.totalAccounted(), sum + vault.protocolPool());
    }

    /// Solvabilité : le coffre détient toujours au moins ce qu'il comptabilise.
    function invariant_solvent() public view {
        assertGe(token.balanceOf(address(vault)), vault.totalAccounted());
    }

    /// freeCollateral ne déborde jamais (saturant), pour tous les comptes.
    function invariant_freeCollateralNeverReverts() public view {
        for (uint256 i; i < actors.length; i++) {
            vault.freeCollateral(actors[i]);
        }
    }
}
