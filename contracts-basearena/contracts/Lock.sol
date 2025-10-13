// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
 GameHubUpgradeable

 - 5 games (0..4) each has its own leaderboard (top N)
 - 1 global leaderboard (top N) aggregated from players' total scores across games
 - Uses an ERC20 entry/payment token (USDC typically, 6 decimals)
 - Upgradeable (UUPS) and Ownable (via OpenZeppelin upgradeable)
 - SafeERC20 for token transfers
*/

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

contract GameHubUpgradeable is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    uint8 public constant TOTAL_GAMES = 5;

    // Top N stored per leaderboard
    uint256 public topLimit;

    // Entry fee per game (in token smallest units, e.g., USDC has 6 decimals)
    mapping(uint8 => uint256) public entryFee;

    // ERC20 token used (e.g., USDC)
    IERC20Upgradeable public paymentToken;

    // --- Leaderboard structures ---
    struct Entry {
        address player;
        uint256 score;
    }

    struct Leaderboard {
        Entry[] entries; // sorted descending by score, length <= topLimit
        mapping(address => uint256) indexPlusOne; // 1-based index; 0 = not present in top list
    }

    // Per-game leaderboards (0..4)
    mapping(uint8 => Leaderboard) private gameLeaderboards;

    // Global leaderboard (aggregated totalScore across games)
    Leaderboard private globalLeaderboard;

    // Per-player totals (global totals)
    mapping(address => uint256) public playerTotalScore;
    mapping(address => uint256) public playerTotalGamesPlayed;

    // Events
    event Played(address indexed player, uint8 indexed gameId, uint256 score, uint256 entryFeePaid);
    event EntryFeeUpdated(uint8 indexed gameId, uint256 newFee);
    event PaymentTokenUpdated(address indexed newToken);
    event TopLimitUpdated(uint256 newTopLimit);
    event Withdrawn(address indexed to, uint256 amount);
    event RewardPaid(address indexed to, uint256 amount);

    // initializer
    function initialize(address _paymentToken, uint256 _topLimit, uint256 _defaultEntryFee) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();

        require(_paymentToken != address(0), "Invalid token");
        require(_topLimit > 0, "topLimit > 0");

        paymentToken = IERC20Upgradeable(_paymentToken);
        topLimit = _topLimit;

        // set default entry fee for all games initially
        for (uint8 i = 0; i < TOTAL_GAMES; i++) {
            entryFee[i] = _defaultEntryFee;
        }
    }

    // UUPS authorization
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ------------------------
    // Core: playing a game
    // ------------------------
    /// @notice Play a game. Player must have approved `entryFee[gameId]` before calling.
    /// @param gameId 0..4
    /// @param score score achieved in this play (must be validated off-chain or by other logic)
    function playGame(uint8 gameId, uint256 score) external {
        require(gameId < TOTAL_GAMES, "Invalid gameId");
        require(score > 0, "Score must be > 0");

        uint256 fee = entryFee[gameId];
        if (fee > 0) {
            paymentToken.safeTransferFrom(msg.sender, address(this), fee);
        }

        // update per-game leaderboard
        _updateLeaderboard(gameLeaderboards[gameId], msg.sender, score);

        // update global totals and global leaderboard
        playerTotalScore[msg.sender] += score;
        playerTotalGamesPlayed[msg.sender] += 1;
        _updateLeaderboard(globalLeaderboard, msg.sender, playerTotalScore[msg.sender]);

        emit Played(msg.sender, gameId, score, fee);
    }

    // ------------------------
    // Leaderboard helpers
    // ------------------------

    /// @dev Internal: update a specific leaderboard (keeps topLimit entries sorted desc)
    function _updateLeaderboard(Leaderboard storage lb, address player, uint256 newScore) internal {
        uint256 idxPlusOne = lb.indexPlusOne[player];

        if (idxPlusOne == 0) {
            // not present: maybe insert if qualifies (or if entries < topLimit)
            if (lb.entries.length < topLimit) {
                lb.entries.push(Entry({player: player, score: newScore}));
                uint256 newIndex = lb.entries.length; // 1-based
                lb.indexPlusOne[player] = newIndex;
                _bubbleUp(lb, newIndex - 1);
            } else {
                // compare with last (lowest in top list)
                uint256 lastIndex = lb.entries.length - 1;
                if (newScore > lb.entries[lastIndex].score) {
                    // replace last with new player
                    address oldPlayer = lb.entries[lastIndex].player;
                    lb.indexPlusOne[oldPlayer] = 0;
                    lb.entries[lastIndex] = Entry({player: player, score: newScore});
                    lb.indexPlusOne[player] = lb.entries.length; // 1-based
                    _bubbleUp(lb, lastIndex);
                }
                // otherwise doesn't make top list -> no action in top list
            }
        } else {
            // present: update score and bubble up/down as required
            uint256 idx = idxPlusOne - 1;
            lb.entries[idx].score = newScore;
            // After raising score, bubble up; if lowering score, bubble down
            _bubbleUp(lb, idx);
            _bubbleDown(lb, idx);
        }
    }

    /// @dev bubble up entry at index `i` if its score greater than parent(s)
    function _bubbleUp(Leaderboard storage lb, uint256 i) internal {
        while (i > 0) {
            uint256 parent = i - 1;
            // Actually for a simple sorted array we just compare with previous element and swap if needed
            // (we maintain descending order, so if entries[i].score > entries[i-1].score, swap)
            if (lb.entries[i].score > lb.entries[parent].score) {
                // swap
                Entry memory tmp = lb.entries[parent];
                lb.entries[parent] = lb.entries[i];
                lb.entries[i] = tmp;

                // update indices
                lb.indexPlusOne[lb.entries[parent].player] = parent + 1;
                lb.indexPlusOne[lb.entries[i].player] = i + 1;

                i = parent;
            } else {
                break;
            }
        }
    }

    /// @dev bubble down from index i (if its score is lower than following elements)
    function _bubbleDown(Leaderboard storage lb, uint256 i) internal {
        uint256 len = lb.entries.length;
        while (i + 1 < len) {
            uint256 next = i + 1;
            if (lb.entries[i].score < lb.entries[next].score) {
                // swap
                Entry memory tmp = lb.entries[next];
                lb.entries[next] = lb.entries[i];
                lb.entries[i] = tmp;

                // update indices
                lb.indexPlusOne[lb.entries[next].player] = next + 1;
                lb.indexPlusOne[lb.entries[i].player] = i + 1;

                i = next;
            } else {
                break;
            }
        }
    }

    // ------------------------
    // View functions: get leaderboards & player stats
    // ------------------------

    /// @notice Get top entries for a specific game leaderboard
    /// @param gameId 0..4
    /// @return players array of addresses (length <= topLimit)
    /// @return scores corresponding scores
    function getGameTop(uint8 gameId) external view returns (address[] memory players, uint256[] memory scores) {
        require(gameId < TOTAL_GAMES, "Invalid gameId");
        Leaderboard storage lb = gameLeaderboards[gameId];
        uint256 len = lb.entries.length;
        players = new address[](len);
        scores = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            players[i] = lb.entries[i].player;
            scores[i] = lb.entries[i].score;
        }
    }

    /// @notice Get global top entries
    function getGlobalTop() external view returns (address[] memory players, uint256[] memory scores) {
        Leaderboard storage lb = globalLeaderboard;
        uint256 len = lb.entries.length;
        players = new address[](len);
        scores = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            players[i] = lb.entries[i].player;
            scores[i] = lb.entries[i].score;
        }
    }

    /// @notice Get a player's aggregated global stats
    function getPlayerGlobalStats(address player) external view returns (uint256 totalScore, uint256 gamesPlayed) {
        totalScore = playerTotalScore[player];
        gamesPlayed = playerTotalGamesPlayed[player];
    }

    /// @notice Get a player's score for a particular game top-list presence (if in top list)
    /// Note: If player isn't in top list but has a score tracked off-chain, this returns 0 for not-in-top.
    function getPlayerGameTopPresence(uint8 gameId, address player) external view returns (bool inTop, uint256 score, uint256 rank) {
        require(gameId < TOTAL_GAMES, "Invalid gameId");
        Leaderboard storage lb = gameLeaderboards[gameId];
        uint256 ip = lb.indexPlusOne[player];
        if (ip == 0) return (false, 0, 0);
        uint256 idx = ip - 1;
        return (true, lb.entries[idx].score, idx + 1);
    }

    // ------------------------
    // Admin functions
    // ------------------------

    function setEntryFee(uint8 gameId, uint256 fee) external onlyOwner {
        require(gameId < TOTAL_GAMES, "Invalid gameId");
        entryFee[gameId] = fee;
        emit EntryFeeUpdated(gameId, fee);
    }

    function setPaymentToken(address newToken) external onlyOwner {
        require(newToken != address(0), "zero");
        paymentToken = IERC20Upgradeable(newToken);
        emit PaymentTokenUpdated(newToken);
    }

    /// @notice Set top limit. WARNING: lowering topLimit truncates leaderboards to new limit.
    function setTopLimit(uint256 newLimit) external onlyOwner {
        require(newLimit > 0, "topLimit > 0");
        topLimit = newLimit;
        // truncate per-game leaderboards if needed
        for (uint8 i = 0; i < TOTAL_GAMES; i++) {
            _truncateLeaderboard(gameLeaderboards[i]);
        }
        _truncateLeaderboard(globalLeaderboard);
        emit TopLimitUpdated(newLimit);
    }

    // withdraw token balance from contract (owner)
    function withdraw(uint256 amount, address to) external onlyOwner {
        require(to != address(0), "zero");
        paymentToken.safeTransfer(to, amount);
        emit Withdrawn(to, amount);
    }

    // internal: truncate leaderboard to current topLimit
    function _truncateLeaderboard(Leaderboard storage lb) internal {
        uint256 len = lb.entries.length;
        if (len <= topLimit) return;
        // remove indices for dropped players
        for (uint256 i = topLimit; i < len; i++) {
            lb.indexPlusOne[lb.entries[i].player] = 0;
        }
        // reduce array
        while (lb.entries.length > topLimit) {
            lb.entries.pop();
        }
    }

    // emergency: allow owner to clear a leaderboard (use carefully)
    function clearGameTop(uint8 gameId) external onlyOwner {
        require(gameId < TOTAL_GAMES, "Invalid gameId");
        Leaderboard storage lb = gameLeaderboards[gameId];
        for (uint256 i = 0; i < lb.entries.length; i++) {
            lb.indexPlusOne[lb.entries[i].player] = 0;
        }
        delete lb.entries;
    }

    function clearGlobalTop() external onlyOwner {
        Leaderboard storage lb = globalLeaderboard;
        for (uint256 i = 0; i < lb.entries.length; i++) {
            lb.indexPlusOne[lb.entries[i].player] = 0;
        }
        delete lb.entries;
    }

    // ------------------------
    // Optional: Admin reward distribution (example)
    // ------------------------
    /// @notice Pay a reward in paymentToken to a player (owner only).
    function payReward(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "zero");
        paymentToken.safeTransfer(to, amount);
        emit RewardPaid(to, amount);
    }

    // ------------------------
    // Storage gap for upgradeability safety
    // ------------------------
    uint256[48] private __gap;
}
