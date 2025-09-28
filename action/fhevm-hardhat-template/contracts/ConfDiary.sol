// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8, euint32, euint256, ebool, externalEuint8, externalEuint32, externalEuint256} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ConfDiary - Anonymous Diary with FHEVM
/// @author ConfDiary Team
/// @notice A privacy-preserving diary application where entries are encrypted on-chain
contract ConfDiary is SepoliaConfig {
    
    struct DiaryEntry {
        euint256 encryptedContentHash; // 加密的日记内容哈希
        euint256 encryptedAuthorHash;  // 加密的作者身份哈希
        euint8 encryptedMood;          // 加密的心情值 (1-10)
        uint256 timestamp;             // 创建时间戳
        bool isDeleted;                // 是否已删除
        uint256 entryId;               // 日记条目ID
    }
    
    // 存储所有日记条目
    mapping(uint256 => DiaryEntry) public diaryEntries;
    
    // 用户地址到其日记条目ID的映射
    mapping(address => uint256[]) public userEntries;
    
    // 全局日记条目计数器
    uint256 public totalEntries;
    
    // 用户心情统计（加密）
    mapping(address => euint32) public userMoodSum;    // 用户心情总分
    mapping(address => euint32) public userMoodCount;  // 用户心情条目数
    
    // 全局心情统计（加密）
    euint32 public globalMoodSum;   // 全局心情总分
    euint32 public globalMoodCount; // 全局心情条目数
    
    // 🎯 匿名点赞系统（加密）
    mapping(uint256 => euint32) public entryLikes;        // 每个条目的加密点赞数
    mapping(uint256 => mapping(address => euint8)) public userLikedEntry; // 用户是否点赞过某条目（加密）
    
    // 🎯 心情排行榜（加密比较）
    mapping(address => euint32) public userHappinessRank; // 用户开心度排名（加密）
    
    // 事件定义
    event DiaryEntryCreated(
        uint256 indexed entryId,
        address indexed author,
        uint256 timestamp
    );
    
    event MoodUpdated(
        uint256 indexed entryId,
        address indexed author
    );
    
    event DiaryEntryDeleted(
        uint256 indexed entryId,
        address indexed author
    );
    
    event EntryLiked(
        uint256 indexed entryId,
        address indexed liker
    );
    
    event HappinessRankUpdated(
        address indexed user
    );
    
    /// @notice 发布新的日记条目
    /// @param encryptedContentHash 加密的日记内容哈希
    /// @param encryptedAuthorHash 加密的作者身份哈希
    /// @param encryptedMood 加密的心情值 (1-10)
    /// @param contentProof 内容哈希加密证明
    /// @param authorProof 作者身份哈希加密证明
    /// @param moodProof 心情值加密证明
    function createDiaryEntry(
        externalEuint256 encryptedContentHash,
        externalEuint256 encryptedAuthorHash,
        externalEuint8 encryptedMood,
        bytes calldata contentProof,
        bytes calldata authorProof,
        bytes calldata moodProof
    ) external {
        // 将外部加密数据转换为内部格式
        euint256 contentHash = FHE.fromExternal(encryptedContentHash, contentProof);
        euint256 authorHash = FHE.fromExternal(encryptedAuthorHash, authorProof);
        euint8 mood = FHE.fromExternal(encryptedMood, moodProof);
        
        // 增加条目计数器
        totalEntries++;
        uint256 entryId = totalEntries;
        
        // 创建新的日记条目
        diaryEntries[entryId] = DiaryEntry({
            encryptedContentHash: contentHash,
            encryptedAuthorHash: authorHash,
            encryptedMood: mood,
            timestamp: block.timestamp,
            isDeleted: false,
            entryId: entryId
        });
        
        // 添加到用户的条目列表
        userEntries[msg.sender].push(entryId);
        
        // 🎯 FHEVM同态运算：更新心情统计
        updateMoodStatistics(msg.sender, mood);
        
        // 设置访问控制权限
        FHE.allowThis(contentHash);
        FHE.allowThis(authorHash);
        FHE.allowThis(mood);
        FHE.allow(contentHash, msg.sender);  // 允许作者解密内容
        FHE.allow(authorHash, msg.sender);   // 允许作者解密身份
        FHE.allow(mood, msg.sender);         // 允许作者解密心情
        
        emit DiaryEntryCreated(entryId, msg.sender, block.timestamp);
        emit MoodUpdated(entryId, msg.sender);
    }
    
    /// @notice 使用FHEVM同态运算更新心情统计
    /// @param user 用户地址
    /// @param newMood 新的心情值（加密）
    function updateMoodStatistics(address user, euint8 newMood) internal {
        // 🔥 FHEVM同态加法：更新用户心情总分
        userMoodSum[user] = FHE.add(userMoodSum[user], FHE.asEuint32(newMood));
        
        // 🔥 FHEVM同态加法：更新用户心情条目数
        userMoodCount[user] = FHE.add(userMoodCount[user], FHE.asEuint32(1));
        
        // 🔥 FHEVM同态加法：更新全局心情统计
        globalMoodSum = FHE.add(globalMoodSum, FHE.asEuint32(newMood));
        globalMoodCount = FHE.add(globalMoodCount, FHE.asEuint32(1));
        
        // 设置ACL权限
        FHE.allowThis(userMoodSum[user]);
        FHE.allowThis(userMoodCount[user]);
        FHE.allowThis(globalMoodSum);
        FHE.allowThis(globalMoodCount);
        
        // 允许用户查看自己的心情统计
        FHE.allow(userMoodSum[user], user);
        FHE.allow(userMoodCount[user], user);
    }
    
    /// @notice 获取特定日记条目（加密格式）
    /// @param entryId 日记条目ID
    /// @return entry 加密的日记条目
    function getDiaryEntry(uint256 entryId) external view returns (DiaryEntry memory entry) {
        require(entryId > 0 && entryId <= totalEntries, "Invalid entry ID");
        require(!diaryEntries[entryId].isDeleted, "Entry has been deleted");
        
        return diaryEntries[entryId];
    }
    
    /// @notice 获取用户自己的日记条目ID列表
    /// @param user 用户地址
    /// @return entryIds 用户的日记条目ID数组
    function getUserEntries(address user) external view returns (uint256[] memory entryIds) {
        return userEntries[user];
    }
    
    /// @notice 获取最近的日记条目ID列表（用于公共时间线）
    /// @param limit 返回条目数量限制
    /// @return entryIds 最近的日记条目ID数组
    function getRecentEntries(uint256 limit) external view returns (uint256[] memory entryIds) {
        require(limit > 0, "Limit must be greater than 0");
        
        uint256 actualLimit = limit > totalEntries ? totalEntries : limit;
        entryIds = new uint256[](actualLimit);
        
        uint256 count = 0;
        // 从最新的条目开始倒序返回
        for (uint256 i = totalEntries; i > 0 && count < actualLimit; i--) {
            if (!diaryEntries[i].isDeleted) {
                entryIds[count] = i;
                count++;
            }
        }
        
        // 调整数组大小以匹配实际找到的条目数
        if (count < actualLimit) {
            uint256[] memory trimmedEntries = new uint256[](count);
            for (uint256 j = 0; j < count; j++) {
                trimmedEntries[j] = entryIds[j];
            }
            return trimmedEntries;
        }
        
        return entryIds;
    }
    
    /// @notice 删除日记条目（仅作者可删除）
    /// @param entryId 要删除的日记条目ID
    function deleteDiaryEntry(uint256 entryId) external {
        require(entryId > 0 && entryId <= totalEntries, "Invalid entry ID");
        require(!diaryEntries[entryId].isDeleted, "Entry already deleted");
        
        // 验证调用者是否为作者（通过检查用户条目列表）
        bool isAuthor = false;
        uint256[] memory userEntryList = userEntries[msg.sender];
        for (uint256 i = 0; i < userEntryList.length; i++) {
            if (userEntryList[i] == entryId) {
                isAuthor = true;
                break;
            }
        }
        
        require(isAuthor, "Only the author can delete this entry");
        
        // 标记为已删除
        diaryEntries[entryId].isDeleted = true;
        
        emit DiaryEntryDeleted(entryId, msg.sender);
    }
    
    /// @notice 获取总的日记条目数量
    /// @return count 总条目数量
    function getTotalEntries() external view returns (uint256 count) {
        return totalEntries;
    }
    
    /// @notice 检查日记条目是否存在且未删除
    /// @param entryId 日记条目ID
    /// @return exists 条目是否存在且未删除
    function entryExists(uint256 entryId) external view returns (bool exists) {
        return entryId > 0 && entryId <= totalEntries && !diaryEntries[entryId].isDeleted;
    }
    
    /// @notice 请求解密权限（消耗Gas的链上交互）
    /// @param entryId 要解密的日记条目ID
    /// @dev 这个函数消耗Gas，但不会泄露内容，只是记录解密请求
    function requestDecryption(uint256 entryId) external {
        require(entryId > 0 && entryId <= totalEntries, "Invalid entry ID");
        require(!diaryEntries[entryId].isDeleted, "Entry has been deleted");
        
        DiaryEntry storage entry = diaryEntries[entryId];
        
        // 检查调用者是否有解密权限
        require(FHE.isSenderAllowed(entry.encryptedContentHash), "No permission to decrypt content");
        require(FHE.isSenderAllowed(entry.encryptedAuthorHash), "No permission to decrypt author");
        
        // 记录解密请求（消耗Gas但保持隐私）
        emit DecryptionRequested(entryId, msg.sender, block.timestamp);
        
        // 注意：实际解密仍然在链下进行，保持隐私
    }
    
    /// @notice 解密请求事件
    event DecryptionRequested(
        uint256 indexed entryId,
        address indexed requester,
        uint256 timestamp
    );
    
    /// @notice 🎯 匿名点赞功能（FHEVM同态加法）
    /// @param entryId 要点赞的日记条目ID
    /// @dev 使用FHEVM同态加法增加点赞数，同时防止重复点赞
    function likeEntry(uint256 entryId) external {
        require(entryId > 0 && entryId <= totalEntries, "Invalid entry ID");
        require(!diaryEntries[entryId].isDeleted, "Entry has been deleted");
        
        // 🔥 FHEVM同态运算：检查是否已经点赞过
        euint8 alreadyLiked = userLikedEntry[entryId][msg.sender];
        ebool hasNotLiked = FHE.eq(alreadyLiked, FHE.asEuint8(0));
        
        // 🔥 FHEVM条件选择：只有未点赞过才能点赞
        euint8 newLike = FHE.select(hasNotLiked, FHE.asEuint8(1), FHE.asEuint8(0));
        
        // 🔥 FHEVM同态加法：增加点赞数（如果是新点赞）
        entryLikes[entryId] = FHE.add(entryLikes[entryId], FHE.asEuint32(newLike));
        
        // 🔥 记录用户点赞状态（加密）
        userLikedEntry[entryId][msg.sender] = FHE.add(alreadyLiked, newLike);
        
        // 设置ACL权限
        FHE.allowThis(entryLikes[entryId]);
        FHE.allowThis(userLikedEntry[entryId][msg.sender]);
        
        emit EntryLiked(entryId, msg.sender);
    }
    
    /// @notice 🎯 心情排行榜功能（FHEVM同态比较）
    /// @param otherUser 要比较的其他用户
    /// @return iAmHappier 我是否比对方更开心（加密布尔值）
    function amIHappierThan(address otherUser) external returns (ebool iAmHappier) {
        // 🔥 FHEVM同态比较：比较两个用户的平均心情
        euint32 myMoodSum = userMoodSum[msg.sender];
        euint32 myMoodCount = userMoodCount[msg.sender];
        euint32 otherMoodSum = userMoodSum[otherUser];
        euint32 otherMoodCount = userMoodCount[otherUser];
        
        // 🔥 FHEVM同态乘法：计算加权比较（避免除法）
        // 我的心情总分 * 对方条目数 vs 对方心情总分 * 我的条目数
        euint32 myWeightedScore = FHE.mul(myMoodSum, otherMoodCount);
        euint32 otherWeightedScore = FHE.mul(otherMoodSum, myMoodCount);
        
        iAmHappier = FHE.gt(myWeightedScore, otherWeightedScore);
        
        return iAmHappier;
    }
    
    /// @notice 🎯 获取条目的加密点赞数
    /// @param entryId 条目ID
    /// @return likes 加密的点赞数
    function getEntryLikes(uint256 entryId) external view returns (euint32 likes) {
        require(entryId > 0 && entryId <= totalEntries, "Invalid entry ID");
        return entryLikes[entryId];
    }
    
    /// @notice 🎯 检查用户是否点赞过某条目（加密结果）
    /// @param entryId 条目ID
    /// @param user 用户地址
    /// @return hasLiked 是否点赞过（加密布尔值）
    function hasUserLikedEntry(uint256 entryId, address user) external view returns (euint8 hasLiked) {
        return userLikedEntry[entryId][user];
    }
    
    /// @notice 获取用户的加密心情统计
    /// @param user 用户地址
    /// @return moodSum 加密的心情总分
    /// @return moodCount 加密的心情条目数
    function getUserMoodStats(address user) external view returns (euint32 moodSum, euint32 moodCount) {
        return (userMoodSum[user], userMoodCount[user]);
    }
    
    /// @notice 获取全局加密心情统计
    /// @return moodSum 加密的全局心情总分
    /// @return moodCount 加密的全局心情条目数
    function getGlobalMoodStats() external view returns (euint32 moodSum, euint32 moodCount) {
        return (globalMoodSum, globalMoodCount);
    }
    
    /// @notice 获取用户心情总分（用于链下计算平均值）
    /// @param user 用户地址
    /// @return moodSum 加密的心情总分（需要解密后除以条目数得到平均值）
    function getUserMoodSum(address user) external view returns (euint32 moodSum) {
        require(FHE.isSenderAllowed(userMoodSum[user]), "No permission to access mood stats");
        return userMoodSum[user];
    }
    
    /// @notice 比较两个用户的心情总分（FHEVM同态比较）
    /// @param user1 用户1地址
    /// @param user2 用户2地址
    /// @return user1HasBetterMood 用户1心情总分是否更高（加密布尔值）
    function compareMoodSum(address user1, address user2) external returns (ebool user1HasBetterMood) {
        euint32 sum1 = userMoodSum[user1];
        euint32 sum2 = userMoodSum[user2];
        
        // 🔥 FHEVM同态比较：比较心情总分
        user1HasBetterMood = FHE.gt(sum1, sum2);
        
        return user1HasBetterMood;
    }
}
