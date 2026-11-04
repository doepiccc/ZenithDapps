// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ZenithPrimitives.sol";

/// @notice Fixed-rate swap between native ZTH and whitelisted ERC-20 tokens.
/// rate = token base units received for 1 ZTH (1e18 wei). Liquidity is provided by the owner.
contract ZenithSwap is Managed, ReentrancyLock {
    using SafeToken for IERC20Zenith;

    struct Listing {
        bool enabled;
        uint256 rate;
    }

    mapping(address => Listing) public listings;
    address[] private _tokens;

    event TokenListed(address indexed token, uint256 rate, bool enabled);
    event Swapped(address indexed account, address indexed token, bool zthIn, uint256 amountIn, uint256 amountOut);
    event ZthFunded(address indexed from, uint256 amount);

    function tokens() external view returns (address[] memory) {
        return _tokens;
    }

    function setListing(address token, uint256 rate, bool enabled) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        require(rate > 0, "bad rate");
        if (listings[token].rate == 0) _tokens.push(token);
        listings[token] = Listing(enabled, rate);
        emit TokenListed(token, rate, enabled);
    }

    function quoteZthToToken(address token, uint256 zthAmount) public view returns (uint256) {
        Listing memory item = listings[token];
        require(item.enabled, "token disabled");
        return zthAmount * item.rate / 1 ether;
    }

    function quoteTokenToZth(address token, uint256 tokenAmount) public view returns (uint256) {
        Listing memory item = listings[token];
        require(item.enabled, "token disabled");
        return tokenAmount * 1 ether / item.rate;
    }

    function swapZthForToken(address token, uint256 minOut) external payable whenNotPaused nonReentrant returns (uint256 out) {
        out = quoteZthToToken(token, msg.value);
        require(out > 0 && out >= minOut, "slippage");
        IERC20Zenith(token).safeTransfer(msg.sender, out);
        emit Swapped(msg.sender, token, true, msg.value, out);
    }

    function swapTokenForZth(address token, uint256 amount, uint256 minOut) external whenNotPaused nonReentrant returns (uint256 out) {
        out = quoteTokenToZth(token, amount);
        require(out > 0 && out >= minOut, "slippage");
        require(address(this).balance >= out, "no ZTH liquidity");
        IERC20Zenith(token).safeTransferFrom(msg.sender, address(this), amount);
        (bool ok, ) = msg.sender.call{value: out}("");
        require(ok, "ZTH transfer failed");
        emit Swapped(msg.sender, token, false, amount, out);
    }

    function withdrawZth(address payable to, uint256 amount) external onlyOwner {
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "ZTH transfer failed");
    }

    function withdrawToken(address token, address to, uint256 amount) external onlyOwner {
        IERC20Zenith(token).safeTransfer(to, amount);
    }

    receive() external payable {
        emit ZthFunded(msg.sender, msg.value);
    }
}
