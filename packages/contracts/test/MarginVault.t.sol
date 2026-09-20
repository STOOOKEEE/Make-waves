// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {MarginVault} from "../src/MarginVault.sol";
import {MockERC20, FeeOnTransferERC20} from "./mocks/MockERC20.sol";

contract MarginVaultTest is Test {
    MarginVault internal vault;
    MockERC20 internal token;

    address internal owner = makeAddr("owner");
    address internal operator = makeAddr("operator");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    uint256 internal constant UNIT = 1e18;

    event PositionOpened(address indexed account, bytes32 indexed settlementId, uint256 margin, uint256 fee);
    event PositionClosed(address indexed account, bytes32 indexed settlementId, uint256 marginReleased, int256 pnl);

    /// @dev Génère un settlementId frais à chaque appel (compteur interne). Fonction
    ///      interne : n'affecte pas le `vm.prank` posé pour l'appel externe suivant.
    uint256 internal idSeq;

    function _id() internal returns (bytes32) {
        return keccak256(abi.encode("settle", idSeq++));
    }

    function setUp() public {
        token = new MockERC20();
        vault = new MarginVault(token, operator, owner);
        _fund(alice, 1_000 * UNIT);
        _fund(bob, 1_000 * UNIT);
        _fund(owner, 1_000 * UNIT);
    }

    function _fund(address who, uint256 amount) internal {
        token.mint(who, amount);
        vm.prank(who);
        token.approve(address(vault), type(uint256).max);
    }

    function _deposit(address who, uint256 amount) internal {
        vm.prank(who);
        vault.deposit(amount);
    }

    // --------------------------- Deposit / Withdraw --------------------------- //

    function test_DepositCreditsCollateral() public {
        _deposit(alice, 100 * UNIT);
        assertEq(vault.collateral(alice), 100 * UNIT);
        assertEq(vault.totalAccounted(), 100 * UNIT);
        assertEq(vault.freeCollateral(alice), 100 * UNIT);
        assertEq(token.balanceOf(address(vault)), 100 * UNIT);
    }

    function test_DepositZeroReverts() public {
        vm.prank(alice);
        vm.expectRevert(MarginVault.ZeroAmount.selector);
        vault.deposit(0);
    }

    function test_WithdrawReturnsTokens() public {
        _deposit(alice, 100 * UNIT);
        uint256 balBefore = token.balanceOf(alice);
        vm.prank(alice);
        vault.withdraw(40 * UNIT);
        assertEq(vault.collateral(alice), 60 * UNIT);
        assertEq(vault.totalAccounted(), 60 * UNIT);
        assertEq(token.balanceOf(alice), balBefore + 40 * UNIT);
    }

    function test_WithdrawMoreThanFreeReverts() public {
        _deposit(alice, 100 * UNIT);
        vm.prank(operator);
        vault.openAccounting(_id(), alice, 80 * UNIT, 0); // verrouille 80, libre = 20
        vm.prank(alice);
        vm.expectRevert(MarginVault.InsufficientFreeCollateral.selector);
        vault.withdraw(21 * UNIT);
    }

    function test_WithdrawZeroReverts() public {
        _deposit(alice, 100 * UNIT);
        vm.prank(alice);
        vm.expectRevert(MarginVault.ZeroAmount.selector);
        vault.withdraw(0);
    }

    function test_DepositMeasuresRealReceivedAmount() public {
        FeeOnTransferERC20 feeToken = new FeeOnTransferERC20(100); // 1%
        MarginVault v = new MarginVault(feeToken, operator, owner);
        feeToken.mint(alice, 100 * UNIT);
        vm.startPrank(alice);
        feeToken.approve(address(v), type(uint256).max);
        v.deposit(100 * UNIT);
        vm.stopPrank();
        // 1% prélevé au transfert → 99 crédités, compta cohérente avec le solde réel.
        assertEq(v.collateral(alice), 99 * UNIT);
        assertEq(v.totalAccounted(), 99 * UNIT);
        assertEq(feeToken.balanceOf(address(v)), 99 * UNIT);
    }

    // ----------------------------- Accès opérateur ---------------------------- //

    function test_OnlyOperatorCanOpen() public {
        _deposit(alice, 100 * UNIT);
        vm.prank(alice);
        vm.expectRevert(MarginVault.NotOperator.selector);
        vault.openAccounting(_id(), alice, 10 * UNIT, 0);
    }

    function test_OnlyOperatorCanClose() public {
        vm.prank(bob);
        vm.expectRevert(MarginVault.NotOperator.selector);
        vault.closeAccounting(_id(), alice, 0, 0);
    }

    function test_OnlyOperatorCanApplyFunding() public {
        vm.prank(bob);
        vm.expectRevert(MarginVault.NotOperator.selector);
        vault.applyFunding(_id(), alice, 1);
    }

    // ----------------------------- Open / Close ------------------------------- //

    function test_OpenLocksMarginAndDebitsFee() public {
        _deposit(alice, 100 * UNIT);
        vm.prank(operator);
        vault.openAccounting(_id(), alice, 50 * UNIT, 2 * UNIT); // marge 50, fee 2
        assertEq(vault.collateral(alice), 98 * UNIT); // fee débité
        assertEq(vault.lockedMargin(alice), 50 * UNIT);
        assertEq(vault.freeCollateral(alice), 48 * UNIT);
        assertEq(vault.protocolPool(), 2 * UNIT); // fee → pool
        assertEq(vault.totalAccounted(), 100 * UNIT); // inchangé (transfert interne)
    }

    function test_OpenMarginExceedsFreeReverts() public {
        _deposit(alice, 100 * UNIT);
        vm.prank(operator);
        vm.expectRevert(MarginVault.InsufficientFreeCollateral.selector);
        vault.openAccounting(_id(), alice, 101 * UNIT, 0);
    }

    function test_CloseReleasesMarginAndAppliesGain() public {
        _deposit(alice, 100 * UNIT);
        _fundPool(50 * UNIT);
        vm.prank(operator);
        vault.openAccounting(_id(), alice, 50 * UNIT, 0);
        vm.prank(operator);
        vault.closeAccounting(_id(), alice, 50 * UNIT, int256(10 * UNIT)); // gain de 10
        assertEq(vault.lockedMargin(alice), 0);
        assertEq(vault.collateral(alice), 110 * UNIT); // +10 gain
        assertEq(vault.protocolPool(), 40 * UNIT); // -10 du pool
        assertEq(vault.totalAccounted(), 150 * UNIT); // 100 dépôt + 50 pool, inchangé
    }

    function test_CloseGainPoolInsolventReverts() public {
        _deposit(alice, 100 * UNIT);
        vm.startPrank(operator);
        vault.openAccounting(_id(), alice, 50 * UNIT, 0);
        vm.expectRevert(MarginVault.PoolInsolvent.selector);
        vault.closeAccounting(_id(), alice, 50 * UNIT, int256(1 * UNIT)); // pool vide
        vm.stopPrank();
    }

    function test_CloseLossGoesToPool() public {
        _deposit(alice, 100 * UNIT);
        vm.startPrank(operator);
        vault.openAccounting(_id(), alice, 50 * UNIT, 0);
        vault.closeAccounting(_id(), alice, 50 * UNIT, -int256(30 * UNIT)); // perte de 30
        vm.stopPrank();
        assertEq(vault.collateral(alice), 70 * UNIT);
        assertEq(vault.protocolPool(), 30 * UNIT);
        assertEq(vault.totalAccounted(), 100 * UNIT);
    }

    function test_CloseLossCappedAtCollateral() public {
        _deposit(alice, 40 * UNIT);
        vm.startPrank(operator);
        vault.openAccounting(_id(), alice, 40 * UNIT, 0);
        // Perte annoncée 1000 mais plafonnée au collatéral (40) : jamais négatif.
        vault.closeAccounting(_id(), alice, 40 * UNIT, -int256(1_000 * UNIT));
        vm.stopPrank();
        assertEq(vault.collateral(alice), 0);
        assertEq(vault.protocolPool(), 40 * UNIT);
        assertEq(vault.totalAccounted(), 40 * UNIT);
    }

    function test_CloseMarginExceedsLockedReverts() public {
        _deposit(alice, 100 * UNIT);
        vm.startPrank(operator);
        vault.openAccounting(_id(), alice, 30 * UNIT, 0);
        vm.expectRevert(MarginVault.MarginExceedsLocked.selector);
        vault.closeAccounting(_id(), alice, 31 * UNIT, 0);
        vm.stopPrank();
    }

    // ------------------------------- Funding ---------------------------------- //

    function test_ApplyFundingNegativeAndPositive() public {
        _deposit(alice, 100 * UNIT);
        _fundPool(20 * UNIT);
        vm.startPrank(operator);
        vault.applyFunding(_id(), alice, -int256(5 * UNIT)); // alice paie 5
        assertEq(vault.collateral(alice), 95 * UNIT);
        assertEq(vault.protocolPool(), 25 * UNIT);
        vault.applyFunding(_id(), alice, int256(3 * UNIT)); // alice reçoit 3
        assertEq(vault.collateral(alice), 98 * UNIT);
        assertEq(vault.protocolPool(), 22 * UNIT);
        vm.stopPrank();
        assertEq(vault.totalAccounted(), 120 * UNIT); // inchangé
    }

    function test_FundingCanPushFreeToZeroWithoutRevert() public {
        _deposit(alice, 100 * UNIT);
        vm.prank(operator);
        vault.openAccounting(_id(), alice, 100 * UNIT, 0); // tout verrouillé, libre = 0
        vm.prank(operator);
        vault.applyFunding(_id(), alice, -int256(10 * UNIT)); // collatéral 90 < locked 100
        assertEq(vault.collateral(alice), 90 * UNIT);
        assertEq(vault.lockedMargin(alice), 100 * UNIT);
        assertEq(vault.freeCollateral(alice), 0); // saturant, pas de revert
    }

    // ------------------------------ Anti-rejeu -------------------------------- //

    function test_ReplaySettlementReverts() public {
        _deposit(alice, 100 * UNIT);
        bytes32 id = _id();
        vm.prank(operator);
        vault.openAccounting(id, alice, 10 * UNIT, 0);
        // Rejouer le MÊME id (retry réseau après timeout) → revert, pas de double-lock.
        vm.prank(operator);
        vm.expectRevert(MarginVault.AlreadySettled.selector);
        vault.openAccounting(id, alice, 10 * UNIT, 0);
        // L'id est cross-fonction : le même id ne passe pas non plus sur closeAccounting.
        vm.prank(operator);
        vm.expectRevert(MarginVault.AlreadySettled.selector);
        vault.closeAccounting(id, alice, 0, 0);
        // La marge n'a été verrouillée qu'une seule fois.
        assertEq(vault.lockedMargin(alice), 10 * UNIT);
        assertEq(vault.usedSettlementId(id), true);
    }

    function test_ZeroSettlementIdReverts() public {
        _deposit(alice, 100 * UNIT);
        vm.prank(operator);
        vm.expectRevert(MarginVault.ZeroSettlementId.selector);
        vault.openAccounting(bytes32(0), alice, 10 * UNIT, 0);
    }

    function test_FundingReplayReverts() public {
        _deposit(alice, 100 * UNIT);
        _fundPool(20 * UNIT);
        bytes32 id = _id();
        vm.prank(operator);
        vault.applyFunding(id, alice, int256(3 * UNIT));
        vm.prank(operator);
        vm.expectRevert(MarginVault.AlreadySettled.selector);
        vault.applyFunding(id, alice, int256(3 * UNIT));
    }

    // --------------------------------- Pool ----------------------------------- //

    function _fundPool(uint256 amount) internal {
        vm.prank(owner);
        vault.fundPool(amount);
    }

    function test_FundAndDefundPool() public {
        _fundPool(100 * UNIT);
        assertEq(vault.protocolPool(), 100 * UNIT);
        assertEq(vault.totalAccounted(), 100 * UNIT);
        vm.prank(owner);
        vault.defundPool(40 * UNIT);
        assertEq(vault.protocolPool(), 60 * UNIT);
        assertEq(vault.totalAccounted(), 60 * UNIT);
    }

    function test_DefundMoreThanPoolReverts() public {
        _fundPool(10 * UNIT);
        vm.prank(owner);
        vm.expectRevert(MarginVault.InsufficientPool.selector);
        vault.defundPool(11 * UNIT);
    }

    function test_FundPoolOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vault.fundPool(1 * UNIT);
    }

    // --------------------------------- Admin ---------------------------------- //

    function test_SetOperatorOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vault.setOperator(bob);
    }

    function test_SetOperatorZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert(MarginVault.ZeroAddress.selector);
        vault.setOperator(address(0));
    }

    function test_SetOperatorRotatesKey() public {
        vm.prank(owner);
        vault.setOperator(bob);
        assertEq(vault.operator(), bob);
        _deposit(alice, 10 * UNIT);
        vm.prank(bob);
        vault.openAccounting(_id(), alice, 5 * UNIT, 0); // nouveau opérateur autorisé
        assertEq(vault.lockedMargin(alice), 5 * UNIT);
        vm.prank(operator);
        vm.expectRevert(MarginVault.NotOperator.selector);
        vault.openAccounting(_id(), alice, 1 * UNIT, 0); // ancien opérateur rejeté
    }

    function test_Ownable2StepTransfer() public {
        vm.prank(owner);
        vault.transferOwnership(alice);
        assertEq(vault.owner(), owner); // pas encore transféré
        vm.prank(alice);
        vault.acceptOwnership();
        assertEq(vault.owner(), alice);
    }

    function test_RenounceOwnershipDisabled() public {
        vm.prank(owner);
        vm.expectRevert(MarginVault.RenounceDisabled.selector);
        vault.renounceOwnership();
        assertEq(vault.owner(), owner); // gouvernance intacte
    }

    // -------------------- Events = montants réellement appliqués -------------- //

    function test_PositionOpenedEmitsDebitedFeeNotRequested() public {
        _deposit(alice, 10 * UNIT);
        bytes32 id = _id();
        vm.expectEmit(true, true, false, true, address(vault));
        emit PositionOpened(alice, id, 0, 10 * UNIT); // débité = collatéral (10), pas le fee demandé (100)
        vm.prank(operator);
        vault.openAccounting(id, alice, 0, 100 * UNIT);
        assertEq(vault.collateral(alice), 0);
        assertEq(vault.protocolPool(), 10 * UNIT);
    }

    function test_PositionClosedEmitsAppliedLossNotRequested() public {
        _deposit(alice, 40 * UNIT);
        vm.startPrank(operator);
        vault.openAccounting(_id(), alice, 40 * UNIT, 0);
        bytes32 id = _id();
        vm.expectEmit(true, true, false, true, address(vault));
        emit PositionClosed(alice, id, 40 * UNIT, -int256(40 * UNIT)); // perte plafonnée à 40, pas -1000
        vault.closeAccounting(id, alice, 40 * UNIT, -int256(1_000 * UNIT));
        vm.stopPrank();
    }

    // --------------------------------- Pause ---------------------------------- //

    function test_PauseBlocksDepositAndOpenButNotWithdraw() public {
        _deposit(alice, 100 * UNIT);
        vm.prank(owner);
        vault.pause();

        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.deposit(1 * UNIT);

        vm.prank(operator);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.openAccounting(_id(), alice, 1 * UNIT, 0);

        // Retrait du libre toujours possible en pause.
        vm.prank(alice);
        vault.withdraw(50 * UNIT);
        assertEq(vault.collateral(alice), 50 * UNIT);
    }

    function test_PauseOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        vault.pause();
    }

    // --------------------------------- Skim ----------------------------------- //

    function test_SkimRecoversDonationOnly() public {
        address recipient = makeAddr("recipient"); // solde initial nul
        _deposit(alice, 100 * UNIT);
        // Don direct (hors deposit) : non comptabilisé.
        token.mint(address(vault), 7 * UNIT);
        assertEq(token.balanceOf(address(vault)), 107 * UNIT);
        vm.prank(owner);
        vault.skim(recipient);
        assertEq(token.balanceOf(recipient), 7 * UNIT);
        assertEq(vault.collateral(alice), 100 * UNIT); // intact
        assertEq(token.balanceOf(address(vault)), 100 * UNIT);
    }

    function test_SkimNothingReverts() public {
        _deposit(alice, 100 * UNIT);
        vm.prank(owner);
        vm.expectRevert(MarginVault.NothingToSkim.selector);
        vault.skim(bob);
    }

    // -------------------------------- Fuzz ------------------------------------ //

    function testFuzz_DepositWithdrawConserves(uint256 dep, uint256 wd) public {
        dep = bound(dep, 1, 1_000 * UNIT);
        wd = bound(wd, 0, dep);
        _deposit(alice, dep);
        if (wd > 0) {
            vm.prank(alice);
            vault.withdraw(wd);
        }
        assertEq(vault.collateral(alice), dep - wd);
        assertEq(vault.totalAccounted(), vault.collateral(alice) + vault.protocolPool());
        assertGe(token.balanceOf(address(vault)), vault.totalAccounted());
    }

    function testFuzz_SettleConserves(uint256 dep, uint256 poolSeed, int256 pnl) public {
        dep = bound(dep, 1, 1_000 * UNIT);
        uint256 pool = bound(poolSeed, 0, 1_000 * UNIT);
        pnl = bound(pnl, -int256(2_000 * UNIT), int256(pool)); // gain ≤ pool dispo
        _deposit(alice, dep);
        if (pool > 0) _fundPool(pool);
        vm.prank(operator);
        vault.applyFunding(_id(), alice, pnl);
        // Conservation : la compta interne reste cohérente, solvabilité préservée.
        assertEq(vault.totalAccounted(), vault.collateral(alice) + vault.protocolPool());
        assertGe(token.balanceOf(address(vault)), vault.totalAccounted());
    }
}
