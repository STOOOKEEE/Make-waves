// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MarginVault
 * @notice Coffre de collatéral pour le perp HYBRIDE de Tide sur la XRPL EVM Sidechain.
 *
 * Modèle (cf. docs/ROADMAP-PERP-V2.md) : la chaîne ne fait que **custodier le
 * collatéral et régler**. Le matching, le funding, le PnL et la liquidation sont
 * calculés OFF-CHAIN par le backend Tide (mark price = feed CEX). L'opérateur
 * (clé d'un multisig Safe) applique les mouvements financiers via des appels
 * signés. C'est donc semi-custodial et assumé comme tel.
 *
 * Les traders déposent/retirent leur collatéral de façon permissionless ; ils ne
 * peuvent jamais retirer plus que leur **collatéral libre** (`collateral - locked`).
 * Les gains sont payés depuis un **pool de garantie** (`protocolPool`, financé par
 * l'owner et alimenté par les pertes/fees) ; les pertes y retournent, plafonnées
 * au collatéral du compte (un compte ne devient jamais négatif).
 *
 * Invariants (prouvés par les tests d'invariant Foundry) :
 *  - `totalAccounted == Σ collateral[a] + protocolPool` (conservation interne) ;
 *  - `collateralToken.balanceOf(this) >= totalAccounted` (solvabilité ;
 *    l'égalité tient hors dons externes, récupérables via `skim`).
 *
 * La comptabilité repose UNIQUEMENT sur l'état interne, jamais sur `balanceOf` :
 * un don de tokens ou un token à frais de transfert ne peut pas corrompre les soldes.
 */
contract MarginVault is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Token de collatéral (RLUSD sur la XRPL EVM Sidechain). Immuable.
    IERC20 public immutable collateralToken;

    /// @notice Adresse autorisée à appliquer les mouvements de compta (clé du Safe opérateur).
    address public operator;

    /// @notice Collatéral total déposé par compte (unités brutes du token).
    mapping(address => uint256) public collateral;

    /// @notice Marge immobilisée par compte au titre des positions ouvertes off-chain.
    mapping(address => uint256) public lockedMargin;

    /// @notice Pool de garantie du protocole : finance les gains, reçoit pertes et fees.
    uint256 public protocolPool;

    /// @notice Somme comptabilisée en interne = Σ collateral + protocolPool.
    uint256 public totalAccounted;

    /**
     * @notice Ids de règlement déjà consommés. Chaque instruction opérateur
     *         (ouverture/fermeture/funding) porte un `settlementId` unique généré
     *         off-chain ; il est brûlé au premier passage. Une re-soumission (retry
     *         réseau après un timeout où la tx avait réussi) revert `AlreadySettled`
     *         au lieu de double-appliquer le mouvement. Idempotence **exactly-once**
     *         garantie on-chain, pas seulement au niveau de la couche d'appel.
     */
    mapping(bytes32 => bool) public usedSettlementId;

    event Deposit(address indexed account, uint256 amount);
    event Withdraw(address indexed account, uint256 amount);
    event PositionOpened(address indexed account, bytes32 indexed settlementId, uint256 margin, uint256 fee);
    event PositionClosed(address indexed account, bytes32 indexed settlementId, uint256 marginReleased, int256 pnl);
    event FundingApplied(address indexed account, bytes32 indexed settlementId, int256 amount);
    event PoolFunded(uint256 amount);
    event PoolDefunded(uint256 amount);
    event OperatorChanged(address indexed previousOperator, address indexed newOperator);
    event Skimmed(address indexed to, uint256 amount);

    error ZeroAddress();
    error ZeroAmount();
    error NotOperator();
    error InsufficientFreeCollateral();
    error MarginExceedsLocked();
    error PoolInsolvent();
    error InsufficientPool();
    error NothingToSkim();
    error AmountOutOfRange();
    error RenounceDisabled();
    error ZeroSettlementId();
    error AlreadySettled();

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    /**
     * @dev Brûle un `settlementId` : rejette l'id nul (force une valeur explicite
     *      côté backend) et le rejeu (id déjà consommé). Appelé en toute première
     *      ligne des instructions opérateur, avant le moindre effet, pour qu'un
     *      retry ne puisse jamais rejouer un mouvement financier.
     */
    function _consume(bytes32 settlementId) internal {
        if (settlementId == bytes32(0)) revert ZeroSettlementId();
        if (usedSettlementId[settlementId]) revert AlreadySettled();
        usedSettlementId[settlementId] = true;
    }

    /**
     * @param token Token de collatéral (RLUSD). Non nul.
     * @param operator_ Adresse opérateur (Safe). Non nulle.
     * @param owner_ Gouvernance (Safe froid) : gère operator/pause/pool/skim.
     */
    constructor(IERC20 token, address operator_, address owner_) Ownable(owner_) {
        if (address(token) == address(0) || operator_ == address(0)) revert ZeroAddress();
        collateralToken = token;
        operator = operator_;
        emit OperatorChanged(address(0), operator_);
    }

    // --------------------------------------------------------------------- //
    //                          Trader (permissionless)                      //
    // --------------------------------------------------------------------- //

    /**
     * @notice Dépose du collatéral. Le montant CRÉDITÉ est le montant réellement
     *         reçu (différence de solde), pas le paramètre — robuste aux tokens à
     *         frais de transfert. RLUSD est supposé standard (delta == amount).
     */
    function deposit(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 balanceBefore = collateralToken.balanceOf(address(this));
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = collateralToken.balanceOf(address(this)) - balanceBefore;
        collateral[msg.sender] += received;
        totalAccounted += received;
        emit Deposit(msg.sender, received);
    }

    /**
     * @notice Retire du collatéral libre. Borné par `freeCollateral` : la marge
     *         immobilisée par des positions ouvertes n'est jamais retirable.
     *         Disponible même en pause (un trader peut toujours sortir son libre).
     */
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (amount > freeCollateral(msg.sender)) revert InsufficientFreeCollateral();
        // Effets avant interaction (checks-effects-interactions).
        collateral[msg.sender] -= amount;
        totalAccounted -= amount;
        collateralToken.safeTransfer(msg.sender, amount);
        emit Withdraw(msg.sender, amount);
    }

    // --------------------------------------------------------------------- //
    //                       Opérateur (compta off-chain)                    //
    // --------------------------------------------------------------------- //

    /**
     * @notice Comptabilise l'OUVERTURE d'une position : prélève le `fee` (vers le
     *         pool, plafonné au collatéral) puis verrouille `margin` de collatéral
     *         libre. Ne touche pas au token (mouvement de compta pur).
     * @dev Le fee est prélevé sur le collatéral TOTAL (pas seulement le libre) : sur
     *      un compte ayant déjà des positions, il peut réduire la couverture d'une
     *      position ouverte (`collateral` repasse sous `lockedMargin`, `freeCollateral`
     *      saturant à 0). L'event remonte le fee RÉELLEMENT débité (pas le demandé).
     */
    function openAccounting(bytes32 settlementId, address account, uint256 margin, uint256 fee)
        external
        onlyOperator
        whenNotPaused
    {
        _consume(settlementId);
        uint256 debited;
        if (fee > 0) {
            debited = fee > collateral[account] ? collateral[account] : fee;
            collateral[account] -= debited;
            protocolPool += debited;
        }
        if (margin > freeCollateral(account)) revert InsufficientFreeCollateral();
        lockedMargin[account] += margin;
        emit PositionOpened(account, settlementId, margin, debited);
    }

    /**
     * @notice Comptabilise la FERMETURE d'une position : libère `marginRelease` de
     *         marge puis applique le `pnl` réalisé (gain depuis le pool / perte vers
     *         le pool, plafonnée au collatéral). Le plafonnement de la perte au
     *         collatéral est une ceinture de sécurité ; la sémantique *isolated*
     *         (perte ≤ marge de la position) est garantie OFF-CHAIN par le backend.
     *         L'event remonte le PnL RÉELLEMENT appliqué (perte plafonnée incluse).
     */
    function closeAccounting(bytes32 settlementId, address account, uint256 marginRelease, int256 pnl)
        external
        onlyOperator
        whenNotPaused
    {
        _consume(settlementId);
        if (marginRelease > lockedMargin[account]) revert MarginExceedsLocked();
        lockedMargin[account] -= marginRelease;
        int256 applied = _settle(account, pnl);
        emit PositionClosed(account, settlementId, marginRelease, applied);
    }

    /**
     * @notice Applique un paiement de funding (signé) sans toucher à la marge.
     *         Funding intermédié par le pool (le backend calcule le net). L'event
     *         remonte le montant réellement appliqué (perte plafonnée incluse).
     */
    function applyFunding(bytes32 settlementId, address account, int256 amount)
        external
        onlyOperator
        whenNotPaused
    {
        _consume(settlementId);
        int256 applied = _settle(account, amount);
        emit FundingApplied(account, settlementId, applied);
    }

    /**
     * @dev Transfert interne entre le collatéral d'un compte et le pool. Gain payé
     *      depuis le pool (revert si insolvable → financer le pool). Perte plafonnée
     *      au collatéral (un compte ne devient jamais négatif). `totalAccounted`
     *      reste inchangé (mouvement interne).
     * @return applied Montant SIGNÉ réellement appliqué (perte plafonnée incluse),
     *      pour que les events remontent l'effet réel et non la valeur demandée.
     */
    function _settle(address account, int256 amount) internal returns (int256 applied) {
        if (amount == type(int256).min) revert AmountOutOfRange();
        if (amount > 0) {
            // amount > 0 ici → le cast int256→uint256 ne tronque pas.
            // forge-lint: disable-next-line(unsafe-typecast)
            uint256 gain = uint256(amount);
            if (protocolPool < gain) revert PoolInsolvent();
            protocolPool -= gain;
            collateral[account] += gain;
            applied = amount; // un gain n'est jamais plafonné
        } else if (amount < 0) {
            // amount < 0 et != int256.min → -amount > 0, le cast ne tronque pas.
            // forge-lint: disable-next-line(unsafe-typecast)
            uint256 loss = uint256(-amount);
            uint256 cap = collateral[account];
            if (loss > cap) loss = cap;
            collateral[account] -= loss;
            protocolPool += loss;
            // loss ≤ collateral ≤ offre du token, le cast int256 ne tronque pas.
            // forge-lint: disable-next-line(unsafe-typecast)
            applied = -int256(loss); // perte réellement débitée (plafonnée)
        }
    }

    // --------------------------------------------------------------------- //
    //                          Gouvernance (owner)                          //
    // --------------------------------------------------------------------- //

    /// @notice Approvisionne le pool de garantie (depuis le solde de l'owner).
    function fundPool(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 balanceBefore = collateralToken.balanceOf(address(this));
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = collateralToken.balanceOf(address(this)) - balanceBefore;
        protocolPool += received;
        totalAccounted += received;
        emit PoolFunded(received);
    }

    /// @notice Retire du pool de garantie (excédent du protocole). Borné au pool.
    function defundPool(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (amount > protocolPool) revert InsufficientPool();
        protocolPool -= amount;
        totalAccounted -= amount;
        collateralToken.safeTransfer(msg.sender, amount);
        emit PoolDefunded(amount);
    }

    /// @notice Change l'adresse opérateur (ex. rotation de clé compromise).
    function setOperator(address newOperator) external onlyOwner {
        if (newOperator == address(0)) revert ZeroAddress();
        emit OperatorChanged(operator, newOperator);
        operator = newOperator;
    }

    /// @notice Met en pause : bloque dépôts et compta opérateur ; les retraits du libre restent ouverts.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Lève la pause.
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Désactivé : renoncer à l'ownership briquerait définitivement la
     *         gouvernance (plus de pause, de rotation d'opérateur ni d'alimentation
     *         du pool). On supprime ce mode de panne irréversible (custody).
     */
    function renounceOwnership() public pure override {
        revert RenounceDisabled();
    }

    /**
     * @notice Récupère l'excédent de tokens non comptabilisé (dons accidentels,
     *         restes de tokens à frais). Ne peut jamais entamer les fonds des
     *         utilisateurs ni le pool (n'opère que sur `balanceOf - totalAccounted`).
     */
    function skim(address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 excess = collateralToken.balanceOf(address(this)) - totalAccounted;
        if (excess == 0) revert NothingToSkim();
        collateralToken.safeTransfer(to, excess);
        emit Skimmed(to, excess);
    }

    // --------------------------------------------------------------------- //
    //                                Vues                                   //
    // --------------------------------------------------------------------- //

    /// @notice Collatéral retirable = collatéral total − marge immobilisée (saturant à 0).
    function freeCollateral(address account) public view returns (uint256) {
        uint256 c = collateral[account];
        uint256 l = lockedMargin[account];
        return c > l ? c - l : 0;
    }
}
