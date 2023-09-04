// SPDX-License-Identifier: GPL-2.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../interfaces/IReyieldPermission.sol";
import "../interfaces/IERC20Burnable.sol";
import "../interfaces/IERC721Burnable.sol";

contract ReyieldPermission is IReyieldPermission {
    using SafeERC20 for IERC20;

    uint256 public constant PRIVILEGE_STAKE_AMOUNT = 138_800;

    address public governance;
    address public officialAccount;
    address public immutable governanceToken;
    address public immutable reyieldNFT;
    uint256 public immutable daysTimeLimitedPrivilege;
    uint32 public immutable licenseAmountForPermanentPrivilegeNFT;
    mapping(uint32 => uint256) public licenseNoToBurnedTokenAmount;
    mapping(address => PermissionInfo) public userToPermissionInfo;
    mapping(uint256 => bool) public tokenIdToIsPermanent;

    ///@notice emitted when a user burn erc20 tokens to get the right of listing tools
    ///@param user address of user
    ///@param burnedAmount amount of burned governance token
    ///@param licenseAmount license amount of user
    event BurnedGovernanceToken(
        address indexed user,
        uint256 burnedAmount,
        uint32 licenseAmount
    );

    ///@notice emitted when a user stake erc20 tokens to get the privilege
    ///@param user address of user
    ///@param stakedAmount amount of staked governance token
    event StakedGovernanceToken(address indexed user, uint256 stakedAmount);

    ///@notice emitted when a user unstake erc20 tokens
    ///@param user address of user
    ///@param unstakedAmount amount of unstaked governance token
    event UnstakedGovernanceToken(address indexed user, uint256 unstakedAmount);

    ///@notice emitted when a user burn erc721 tokens to get time-limited right of privilege
    ///@param user address of user
    ///@param tokenId tokenId of time-limited NFT
    ///@param expiredAt expired time of time-limited privilege
    event BurnedTimeLimitedPrivilegeNFT(
        address indexed user,
        uint256 tokenId,
        uint256 expiredAt
    );

    ///@notice emitted when a user burn erc721 tokens to get permanent right of privilege & listing tools
    ///@param user address of user
    ///@param tokenId tokenId of permanent NFT
    ///@param licenseAmount license amount of user
    event BurnedPermanentPrivilegeNFT(
        address indexed user,
        uint256 tokenId,
        uint32 licenseAmount
    );

    modifier onlyGovernance() {
        require(msg.sender == governance, "RPOG");
        _;
    }

    modifier onlyNFTOwner(uint256 tokenId) {
        require(IERC721(reyieldNFT).ownerOf(tokenId) == msg.sender, "RPON");
        _;
    }

    constructor(
        address _governance,
        address _officialAccount,
        address _governanceToken,
        address _reyieldNFT,
        uint256 _daysTimeLimitedPrivilege,
        uint32 _licenseAmountForPermanentPrivilegeNFT
    ) {
        require(_governance != address(0), "RPG");
        require(_governanceToken != address(0), "RPCGT");
        require(_reyieldNFT != address(0), "RPCRN");

        governance = _governance;
        officialAccount = _officialAccount;
        governanceToken = _governanceToken;
        reyieldNFT = _reyieldNFT;
        daysTimeLimitedPrivilege = _daysTimeLimitedPrivilege;
        licenseAmountForPermanentPrivilegeNFT = _licenseAmountForPermanentPrivilegeNFT;

        initLicenseNoToBurnedTokenAmount();
        initOfficialAccountPermission();
    }

    function initLicenseNoToBurnedTokenAmount() private {
        licenseNoToBurnedTokenAmount[1] = 138_800;
        licenseNoToBurnedTokenAmount[2] = 185_092;
        licenseNoToBurnedTokenAmount[3] = 246_824;
        licenseNoToBurnedTokenAmount[4] = 329_145;
        licenseNoToBurnedTokenAmount[5] = 438_921;
        licenseNoToBurnedTokenAmount[6] = 585_310;
        licenseNoToBurnedTokenAmount[7] = 780_522;
        licenseNoToBurnedTokenAmount[8] = 1_040_841;
        licenseNoToBurnedTokenAmount[9] = 1_387_981;
        licenseNoToBurnedTokenAmount[10] = 1_850_899;
        licenseNoToBurnedTokenAmount[11] = 2_468_210;
        licenseNoToBurnedTokenAmount[12] = 3_291_405;
        licenseNoToBurnedTokenAmount[13] = 4_389_152;
        licenseNoToBurnedTokenAmount[14] = 5_853_018;
        licenseNoToBurnedTokenAmount[15] = 7_805_111;
        licenseNoToBurnedTokenAmount[16] = 10_408_265;
        licenseNoToBurnedTokenAmount[17] = 13_879_621;
        licenseNoToBurnedTokenAmount[18] = 18_508_741;
        licenseNoToBurnedTokenAmount[19] = 24_681_761;
        licenseNoToBurnedTokenAmount[20] = 32_913_601;
    }

    function initOfficialAccountPermission() private {
        userToPermissionInfo[officialAccount].isPermanentPrivilege = true;
        userToPermissionInfo[officialAccount].licenseAmount = type(uint32).max;
    }

    function changeGovernance(address _governance) external onlyGovernance {
        require(_governance != address(0), "RPG");
        governance = _governance;
    }

    function changeOfficialAccount(
        address _newOfficialAccount
    ) external onlyGovernance {
        require(_newOfficialAccount != address(0), "RPOA");
        userToPermissionInfo[officialAccount].isPermanentPrivilege = false;
        userToPermissionInfo[officialAccount].licenseAmount = 0;
        officialAccount = _newOfficialAccount;
        initOfficialAccountPermission();
    }

    function updatePermanentNFTWhitelist(
        uint256[] calldata tokenIds
    ) external onlyGovernance {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            tokenIdToIsPermanent[tokenIds[i]] = true;
        }
    }

    function privilege(address user) external view override returns (bool) {
        require(user != address(0), "RPU0");

        PermissionInfo memory permissionInfo = userToPermissionInfo[user];

        uint256 currentTime = block.timestamp;
        return
            permissionInfo.isPermanentPrivilege ||
            permissionInfo.isStakedPrivilege ||
            permissionInfo.privilegeExpiredAt > currentTime;
    }

    function getPermissionInfo(
        address user
    ) external view returns (PermissionInfo memory) {
        return userToPermissionInfo[user];
    }

    function tryBurnERC20ForLicense(
        uint32 licenseAmount
    )
        external
        view
        returns (
            uint32 origLicenseAmount,
            uint32 currentlicenseAmount,
            uint256 burnedTokenAmount
        )
    {
        require(licenseAmount > 0, "RPLA0");
        origLicenseAmount = userToPermissionInfo[msg.sender].licenseAmount;

        burnedTokenAmount = _calBurnedAmount(origLicenseAmount, licenseAmount);

        unchecked {
            currentlicenseAmount = origLicenseAmount + licenseAmount;
        }
    }

    ///@notice burn erc20 tokens to get the right of listing tools
    ///@param licenseAmount license amount of user
    function burnERC20ForLicense(uint32 licenseAmount) external {
        require(licenseAmount > 0, "RPLA0");
        PermissionInfo storage permissionInfo = userToPermissionInfo[
            msg.sender
        ];
        uint32 origLicenseAmount = permissionInfo.licenseAmount;

        uint256 burnedAmount = _calBurnedAmount(
            origLicenseAmount,
            licenseAmount
        );

        ///@dev transfer governance token to this contract
        IERC20(governanceToken).safeTransferFrom(
            msg.sender,
            address(this),
            burnedAmount
        );

        ///@dev burn governance token
        _burnERC20(governanceToken, burnedAmount);

        unchecked {
            //update license amount
            permissionInfo.licenseAmount = origLicenseAmount + licenseAmount;
        }

        emit BurnedGovernanceToken(
            msg.sender,
            burnedAmount,
            permissionInfo.licenseAmount
        );
    }

    ///@notice stake erc20 tokens to get the privilege
    function stakeERC20ForPrivilege() external {
        PermissionInfo storage permissionInfo = userToPermissionInfo[
            msg.sender
        ];
        require(!permissionInfo.isStakedPrivilege, "RPSP");

        ///@dev transfer governance token to this contract
        IERC20(governanceToken).safeTransferFrom(
            msg.sender,
            address(this),
            PRIVILEGE_STAKE_AMOUNT
        );

        //update staked amount
        permissionInfo.stakedAmount = PRIVILEGE_STAKE_AMOUNT;

        //update staked time
        permissionInfo.lastStakedAt = block.timestamp;

        //update privilege
        permissionInfo.isStakedPrivilege = true;

        emit StakedGovernanceToken(msg.sender, permissionInfo.stakedAmount);
    }

    ///@notice unstake erc20 tokens
    function unstakeERC20() external {
        PermissionInfo storage permissionInfo = userToPermissionInfo[
            msg.sender
        ];
        require(permissionInfo.stakedAmount > 0, "RPSA0");

        uint256 unstakedAmount = permissionInfo.stakedAmount;

        //transfer governance token to user
        IERC20(governanceToken).safeTransfer(msg.sender, unstakedAmount);

        //update staked amount
        unchecked {
            permissionInfo.stakedAmount =
                permissionInfo.stakedAmount -
                unstakedAmount;
        }
        //update staked time
        permissionInfo.lastStakedAt = 0;

        //update privilege
        permissionInfo.isStakedPrivilege = false;

        emit UnstakedGovernanceToken(msg.sender, unstakedAmount);
    }

    function burnERC721(uint256 tokenId) external onlyNFTOwner(tokenId) {
        bool isPermanent = tokenIdToIsPermanent[tokenId];
        isPermanent
            ? _burnERC721ForPermanentPrivilegeAndLicenses(tokenId)
            : _burnERC721ForTimeLimitedPrivilege(tokenId);
    }

    function tryBurnERC721ForTimeLimitedPrivilege()
        external
        view
        returns (
            uint256 expiredAt,
            bool isPermanentPrivilege,
            bool isStakedPrivilege
        )
    {
        isPermanentPrivilege = userToPermissionInfo[msg.sender]
            .isPermanentPrivilege;

        isStakedPrivilege = userToPermissionInfo[msg.sender].isStakedPrivilege;

        if (isPermanentPrivilege || isStakedPrivilege) {
            return (0, isPermanentPrivilege, isStakedPrivilege);
        }

        expiredAt = userToPermissionInfo[msg.sender].privilegeExpiredAt;

        unchecked {
            uint256 currentBlockTime = block.timestamp;
            if (expiredAt < currentBlockTime) {
                expiredAt =
                    currentBlockTime +
                    (daysTimeLimitedPrivilege * 1 days);
            } else {
                expiredAt = expiredAt + (daysTimeLimitedPrivilege * 1 days);
            }
        }
    }

    ///@notice burn erc721 token to get time-limited right of privilege
    ///@param tokenId tokenId of time-limited NFT
    function _burnERC721ForTimeLimitedPrivilege(uint256 tokenId) internal {
        PermissionInfo storage permissionInfo = userToPermissionInfo[
            msg.sender
        ];

        require(!permissionInfo.isPermanentPrivilege, "RPPP");

        ///@dev burn time-limited NFT
        _burnERC721(reyieldNFT, tokenId);

        //update time-limited privilege expired time
        unchecked {
            uint256 currentBlockTime = block.timestamp;
            if (permissionInfo.privilegeExpiredAt < currentBlockTime) {
                permissionInfo.privilegeExpiredAt =
                    currentBlockTime +
                    (daysTimeLimitedPrivilege * 1 days);
            } else {
                permissionInfo.privilegeExpiredAt =
                    permissionInfo.privilegeExpiredAt +
                    (daysTimeLimitedPrivilege * 1 days);
            }
        }

        emit BurnedTimeLimitedPrivilegeNFT(
            msg.sender,
            tokenId,
            permissionInfo.privilegeExpiredAt
        );
    }

    // burn erc721 token to get permanent right of privilege & listing 3 tools
    function tryBurnERC721ForPermanentPrivilegeAndLicenses()
        external
        view
        returns (uint32 origLicenseAmount, uint32 currentlicenseAmount)
    {
        origLicenseAmount = userToPermissionInfo[msg.sender].licenseAmount;
        unchecked {
            currentlicenseAmount =
                origLicenseAmount +
                licenseAmountForPermanentPrivilegeNFT;
        }
    }

    ///@notice burn erc721 token to get permanent right of privilege & listing tools
    ///@param tokenId tokenId of permanent NFT
    function _burnERC721ForPermanentPrivilegeAndLicenses(
        uint256 tokenId
    ) internal {
        PermissionInfo storage permissionInfo = userToPermissionInfo[
            msg.sender
        ];

        require(!permissionInfo.isPermanentPrivilege, "RPPP");

        ///@dev burn permanent NFT
        _burnERC721(reyieldNFT, tokenId);

        //update time-limited privilege expired time & set isPermanentPrivilege to true
        permissionInfo.privilegeExpiredAt = 0;
        permissionInfo.isPermanentPrivilege = true;

        uint32 origLicenseAmount = permissionInfo.licenseAmount;

        //update license amount
        unchecked {
            permissionInfo.licenseAmount =
                origLicenseAmount +
                licenseAmountForPermanentPrivilegeNFT;
        }

        emit BurnedPermanentPrivilegeNFT(
            msg.sender,
            tokenId,
            permissionInfo.licenseAmount
        );
    }

    function _calBurnedAmount(
        uint32 _origLicenseAmount,
        uint256 _licenseAmount
    ) internal view returns (uint256 burnedAmount) {
        unchecked {
            uint32 nextNo = _origLicenseAmount + 1;
            for (uint32 i = nextNo; i < nextNo + _licenseAmount; i++) {
                if (i < 20) {
                    burnedAmount =
                        burnedAmount +
                        licenseNoToBurnedTokenAmount[i];
                } else {
                    burnedAmount =
                        burnedAmount +
                        licenseNoToBurnedTokenAmount[20];
                }
            }
        }
    }

    function _burnERC20(address tokenAddress, uint256 burnedAmount) internal {
        IERC20Burnable(tokenAddress).burn(burnedAmount);
    }

    function _burnERC721(address nftAddress, uint256 tokenId) internal {
        IERC721Burnable(nftAddress).burn(tokenId);
    }
}
