// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MarginVault} from "../../src/MarginVault.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

/**
 * @dev Pilote le vault sous fuzzing d'invariant. Le handler est À LA FOIS
 *      l'opérateur et l'owner du vault (cf. setUp du test d'invariant), il peut
 *      donc exercer toutes les fonctions. Chaque action borne ses entrées pour
 *      maximiser la couverture utile (les revects restent tolérés via
 *      `fail_on_revert = false`).
 */
contract MarginVaultHandler is Test {
    MarginVault public vault;
    MockERC20 public token;
    address[] public actors;

    uint256 internal constant MAX = 1_000_000e18;

    constructor(MarginVault vault_, MockERC20 token_, address[] memory actors_) {
        vault = vault_;
        token = token_;
        actors = actors_;
    }

    /// @dev Accepte le transfert d'ownership (Ownable2Step). Appelé une fois en setUp.
    function init() external {
        vault.acceptOwnership();
    }

    function getActors() external view returns (address[] memory) {
        return actors;
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % actors.length];
    }

    function deposit(uint256 actorSeed, uint256 amount) public {
        address a = _actor(actorSeed);
        amount = bound(amount, 1, MAX);
        token.mint(a, amount);
        vm.startPrank(a);
        token.approve(address(vault), amount);
        vault.deposit(amount);
        vm.stopPrank();
    }

    function withdraw(uint256 actorSeed, uint256 amount) public {
        address a = _actor(actorSeed);
        uint256 free = vault.freeCollateral(a);
        if (free == 0) return;
        amount = bound(amount, 1, free);
        vm.prank(a);
        vault.withdraw(amount);
    }

    function openAccounting(uint256 actorSeed, uint256 margin, uint256 fee) public {
        address a = _actor(actorSeed);
        uint256 col = vault.collateral(a);
        if (col == 0) return;
        fee = bound(fee, 0, col);
        uint256 locked = vault.lockedMargin(a);
        uint256 freeAfterFee = col - fee > locked ? col - fee - locked : 0;
        margin = bound(margin, 0, freeAfterFee);
        vault.openAccounting(a, margin, fee);
    }

    function closeAccounting(uint256 actorSeed, uint256 marginRel, int256 pnl) public {
        address a = _actor(actorSeed);
        uint256 locked = vault.lockedMargin(a);
        if (locked == 0) return;
        marginRel = bound(marginRel, 0, locked);
        // Borne le gain au pool disponible (sinon PoolInsolvent, sans intérêt ici).
        pnl = bound(pnl, -int256(MAX), int256(vault.protocolPool()));
        vault.closeAccounting(a, marginRel, pnl);
    }

    function applyFunding(uint256 actorSeed, int256 amount) public {
        address a = _actor(actorSeed);
        amount = bound(amount, -int256(MAX), int256(vault.protocolPool()));
        vault.applyFunding(a, amount);
    }

    function fundPool(uint256 amount) public {
        amount = bound(amount, 1, MAX);
        token.mint(address(this), amount);
        token.approve(address(vault), amount);
        vault.fundPool(amount);
    }

    function defundPool(uint256 amount) public {
        uint256 pool = vault.protocolPool();
        if (pool == 0) return;
        amount = bound(amount, 1, pool);
        vault.defundPool(amount);
    }

    /// @dev Don direct (hors compta) puis skim : exerce le chemin skim sous invariant.
    function donateAndSkim(uint256 amount) public {
        amount = bound(amount, 1, MAX);
        token.mint(address(vault), amount);
        vault.skim(address(this)); // excédent garanti > 0
    }

    /// @dev Bascule pause/unpause : exerce les deux états sous invariant.
    function pauseToggle() public {
        if (vault.paused()) {
            vault.unpause();
        } else {
            vault.pause();
        }
    }
}
