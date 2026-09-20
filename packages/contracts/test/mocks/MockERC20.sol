// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev ERC20 standard mintable pour les tests (proxy de RLUSD).
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock RLUSD", "mRLUSD") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev ERC20 à frais de transfert : le destinataire reçoit moins que `value`.
///      Sert à vérifier la mesure du montant réellement reçu (deposit/fundPool)
///      et la récupération de l'excédent par `skim`.
contract FeeOnTransferERC20 is ERC20 {
    uint256 public immutable feeBps;
    address public constant SINK = address(0xdEaD);

    constructor(uint256 feeBps_) ERC20("Fee Token", "FEE") {
        feeBps = feeBps_;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0) && feeBps > 0) {
            uint256 fee = (value * feeBps) / 10_000;
            super._update(from, SINK, fee);
            super._update(from, to, value - fee);
        } else {
            super._update(from, to, value);
        }
    }
}
