# ConfDiary - Anonymous Encrypted Diary

ConfDiary是一个基于FHEVM（Fully Homomorphic Encryption Virtual Machine）的匿名日记应用。用户可以将日记内容加密后存储在链上，作者身份也通过加密方式隐藏，只有本人能解密查看。

## 特性

- 🔐 **端到端加密**: 使用FHEVM同态加密技术，日记内容在链上完全加密
- 👤 **匿名身份**: 作者身份加密存储，保护隐私
- 🌐 **去中心化**: 无需后端服务，前端直接与智能合约交互
- 🎨 **现代UI**: 采用渐变色设计，支持深色/浅色主题
- ⚡ **本地开发**: 支持本地FHEVM Hardhat节点开发

## 项目结构

```
action/
├── fhevm-hardhat-template/     # 智能合约项目
│   ├── contracts/
│   │   └── ConfDiary.sol       # 主合约
│   ├── deploy/                 # 部署脚本
│   └── test/                   # 测试文件
└── frontend/                   # 前端项目
    ├── app/                    # Next.js应用
    ├── components/             # UI组件
    ├── fhevm/                  # FHEVM集成
    ├── hooks/                  # React Hooks
    └── scripts/                # 工具脚本
```

## 快速开始

### 1. 安装依赖

```bash
# 安装合约依赖
cd fhevm-hardhat-template
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 2. 启动本地FHEVM节点

```bash
cd fhevm-hardhat-template
npm run node
```

### 3. 部署合约

```bash
# 在新终端中
cd fhevm-hardhat-template
npm run deploy:localhost
```

### 4. 启动前端

```bash
cd frontend
npm run dev:mock
```

### 5. 访问应用

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 开发指南

### 智能合约

主合约 `ConfDiary.sol` 提供以下功能：

- `createDiaryEntry()`: 创建加密日记条目
- `getDiaryEntry()`: 获取指定日记条目
- `getUserEntries()`: 获取用户的日记列表
- `getRecentEntries()`: 获取最近的公共时间线
- `deleteDiaryEntry()`: 删除日记条目

### 前端架构

- **FHEVM集成**: 使用 `@fhevm/mock-utils` 在本地环境中模拟FHEVM功能
- **状态管理**: 基于React Hooks的状态管理
- **UI组件**: 使用Tailwind CSS构建的现代化组件
- **钱包集成**: 支持MetaMask等Web3钱包

### 核心概念

1. **加密存储**: 日记内容使用 `ebytes256` 类型加密存储
2. **访问控制**: 通过ACL系统控制解密权限
3. **签名管理**: 使用EIP-712签名进行解密授权
4. **Mock环境**: 开发环境自动检测并使用Mock FHEVM实例

## 脚本命令

### 合约项目

```bash
npm run compile    # 编译合约
npm run deploy     # 部署到默认网络
npm run test       # 运行测试
npm run node       # 启动本地节点
```

### 前端项目

```bash
npm run dev:mock   # 开发模式（自动检测Hardhat节点）
npm run dev        # 标准开发模式
npm run build      # 构建生产版本
npm run genabi     # 生成ABI文件
```

## 技术栈

### 智能合约
- Solidity 0.8.24
- FHEVM库
- Hardhat开发框架

### 前端
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- ethers.js v6
- @zama-fhe/relayer-sdk

## 安全注意事项

1. **私钥管理**: 前端仅保存临时解密签名，不存储敏感私钥
2. **权限控制**: 使用最小权限原则，优先使用临时权限
3. **数据验证**: 避免在链上泄露敏感信息
4. **签名有效期**: 解密签名有合理的有效期限制

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 许可证

MIT License



