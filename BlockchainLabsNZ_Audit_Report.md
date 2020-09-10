# Kyber Network Audit Report

## Preamble
This audit report was undertaken by BlockchainLabs.nz for the purpose of providing feedback to Kyber Network. It has subsequently been shared publicly without any express or implied warranty.

Solidity contracts were sourced from the public Github repo [KyberNetwork/TokenDistributionContracts](https://github.com/KyberNetwork/TokenDistributionContracts) prior to commit [216d8eb3a5e1dea8a702f97331677ba192f190cd](https://github.com/KyberNetwork/TokenDistributionContracts/tree/216d8eb3a5e1dea8a702f97331677ba192f190cd) - we would encourage all community members and token holders to make their own assessment of the contracts.

## Scope
All Solidity code contained in [/contracts](https://github.com/KyberNetwork/TokenDistributionContracts/tree/master/TokenSale/contracts) was considered in scope along with the tests contained in [/test](https://github.com/KyberNetwork/TokenDistributionContracts/tree/master/TokenSale/test) as a basis for static and dynamic analysis.

## Focus Areas
The audit report is focused on the following key areas - though this is not an exhaustive list.
### Correctness
- No correctness defects uncovered during static analysis?
- No implemented contract violations uncovered during execution?
- No other generic incorrect behaviour detected during execution?
- Adherence to adopted standards such as ERC20?
### Testability
- Test coverage across all functions and events?
- Test cases for both expected behaviour and failure modes?
- Settings for easy testing of a range of parameters?
- No reliance on nested callback functions or console logs?
- Avoidance of test scenarios calling other test scenarios?
### Security
- No presence of known security weaknesses?
- No funds at risk of malicious attempts to withdraw/transfer?
- No funds at risk of control fraud?
- Prevention of Integer Overflow or Underflow?
### Best Practice
- Explicit labeling for the visibility of functions and state variables?
- Proper management of gas limits and nested execution?
- Latest version of the Solidity compiler?

## Classification
### Defect Severity
- Minor - A defect that does not have a material impact on the contract execution and is likely to be subjective.
- Moderate - A defect that could impact the desired outcome of the contract execution in a specific scenario.
- Major - A defect that impacts the desired outcome of the contract execution or introduces a weakness that may be exploited.
- Critical - A defect that presents a significant security vulnerability or failure of the contract across a range of scenarios.

## Findings
### Minor
- **Recommend using the latest version of Solidity supported by Truffle.js** - `Best practice`  [View on GitHub](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/issues/1)
    - [x] Fixed [8962e6a2](https://github.com/KyberNetwork/TokenDistributionContracts/commit/8962e6a2f09cd2a6e30827a2a506b6d773a1f3f5)
- **Express Burn event as a transfer to a null address** - `Correctness` [#L56](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/blob/master/TokenSale/contracts/KyberNetworkCrystal.sol#L56]) When expressing minting as a transfer from a null address ... [View on GitHub](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/issues/5)
    - [x] Fixed [346d0909](https://github.com/KyberNetwork/TokenDistributionContracts/commit/346d09096f3c8f461e368510fef95bdd76f32269)
- **Fix grammatical errors and spelling mistakes** - `Correctness` # Approver.sol, ContributorApprover.sol, KyberContirbutorWhitelist.sol, KyberNetworkTokenSale.sol [#L7](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/blob/master/TokenSale/contracts/mock/Approver.sol#L7]), [#L4](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/blob/master/TokenSale/contracts/ContributorApprover.sol#L4]), [#L8](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/blob/master/TokenSale/contracts/ContributorApprover.sol#L8]), [#L18](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/blob/master/TokenSale/contracts/ContributorApprover.sol#L18]), [#L27](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/blob/master/TokenSale/contracts/ContributorApprover.sol#L27]), [#L5](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/blob/master/TokenSale/contracts/KyberContirbutorWhitelist.sol#L5]), [#L9](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/blob/master/TokenSale/contracts/KyberContirbutorWhitelist.sol#L9]), [#L5](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/blob/master/TokenSale/contracts/KyberNetworkTokenSale.sol#L5]), [#L18](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/blob/master/TokenSale/contracts/KyberNetworkTokenSale.sol#L18]), [#L20](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/blob/master/TokenSale/contracts/KyberContirbutorWhitelist.sol#L20]),
[#L96](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/blob/master/TokenSale/contracts/KyberNetworkTokenSale.sol#L96),
[#L107](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/blob/master/TokenSale/contracts/KyberNetworkTokenSale.sol#L107) [View on GitHub](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/issues/6)
  - [x] Fixed [3023673d](https://github.com/KyberNetwork/TokenDistributionContracts/commit/3023673dc54a6bf4426ed0814f9652d5586f6c07), [6b04dbf7](https://github.com/KyberNetwork/TokenDistributionContracts/commit/6b04dbf730ffc55c3d2850969dbbfb89e69dfcfc)
- **Open Zeppelin modification comment can be removed since PR was merged** - `Correctness` # StandardToken.sol [#L32](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/blob/master/TokenSale/contracts/zeppelin/token/StandardToken.sol#L32]) [View on GitHub](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/issues/7)
    - [x] Fixed [9333fec](https://github.com/OpenZeppelin/zeppelin-solidity/pull/377/commits/9333fec5f1e5cf0ad60f760df3a1020b60d529f8)
- **Event Variables Naming Consistency** - `Best practice` # KyberNetworkTokenSale.sol ProxyBuy and Buy don't follow the underscore(_) ... [View on GitHub](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/issues/9)
    - [x] Fixed [e2ab7441](https://github.com/KyberNetwork/TokenDistributionContracts/commit/e2ab7441a5f7b7046a5a975464465c1136ca447f)
- **Add return to Transfer to emergencyERC20Drain function** - `Correctness` # KyberNetworkCrystal.sol [#L70](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/blob/master/TokenSale/contracts/KyberNetworkCrystal.sol#L70]) `function emergencyERC20Drain` should return the result of transfer so the caller knows it was successful ... [View on GitHub](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/issues/11)
    - [x] Fixed [bdcfe802](https://github.com/KyberNetwork/TokenDistributionContracts/commit/bdcfe80205584f884f56c9ff0aeaeef9d1188c2a)
- **Return uint with ProxyBuy() as well as Buy() for consistency** - `Best practice` # KyberNetworkTokenSale.sol [#L52](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/blob/master/TokenSale/contracts/KyberNetworkTokenSale.sol#L52]) For consistency we would recommend returning the `amount` from `ProxyBuy` as it behaves almost identically to `Buy` ... [View on GitHub](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/issues/14)
    - [x] Fixed [b06da990](https://github.com/KyberNetwork/TokenDistributionContracts/commit/b06da99026b8d30458db9d79f9992f3a6bee9d09)
- **Comment missing declaring slackUsersCap denomination** - `Best practice` # KyberContributorWhitelist.sol [#L6](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/blob/master/TokenSale/contracts/KyberContirbutorWhitelist.sol#L6])  uint public slackUsersCap = 7; // In ETH ... [View on GitHub](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/issues/15)
  - [x] Fixed [9b6769ac](https://github.com/KyberNetwork/TokenDistributionContracts/commit/9b6769ac4087c36f28470b4f9507cc3dea4c8995)

- **slackUsersCap variable expressed in wei (missing 18 decimals)** - `Correctness` [#L7](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/blob/master/TokenSale/contracts/KyberContirbutorWhitelist.sol#L6]) Default value currently set to WEI not ETH ... [View on GitHub](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/issues/16)
    - [x] Fixed [9b6769ac](https://github.com/KyberNetwork/TokenDistributionContracts/commit/9b6769ac4087c36f28470b4f9507cc3dea4c8995)
- **Check dates of saleStartTime and  saleEndTime to verify they are valid** - `Best practice` [#L35-L36](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/blob/master/TokenSale/contracts/KyberNetworkCrystal.sol#L35-L36]) To protect against user error, we would recommend adding ... [View on GitHub](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/issues/3)
    - [x] [Fixed](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/issues/3)

- **Use getTime() rather than now** - `Correctness` # approver.js, token.js, tokensale.js
[#L254](https://github.com/KyberNetwork/TokenDistributionContracts/blob/3023673dc54a6bf4426ed0814f9652d5586f6c07/TokenSale/test/approver.js#L254]), [#L171](https://github.com/KyberNetwork/TokenDistributionContracts/blob/3023673dc54a6bf4426ed0814f9652d5586f6c07/TokenSale/test/unit/tokensale.js#L171]),
[#L761](https://github.com/KyberNetwork/TokenDistributionContracts/blob/3023673dc54a6bf4426ed0814f9652d5586f6c07/TokenSale/test/stress/tokensale.js#L761]),
[#L176](https://github.com/KyberNetwork/TokenDistributionContracts/blob/c5f90277e9f1471193c57556f39c4a59e32c2951/TokenSale/test/unit/token.js#L76]),
[#L710](https://github.com/KyberNetwork/TokenDistributionContracts/blob/c5f90277e9f1471193c57556f39c4a59e32c2951/TokenSale/test/stress/token.js#L710]) Using and overriding getTime() for tests saves having to deal with evm_increaseTime ... [View on GitHub](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/issues/19)
  - [x]  [Fixed](https://github.com/BlockchainLabsNZ/KyberNetwork-TokenDistributionContracts/issues/19)

### Moderate
- None found

### Major
- None Found

### Critical
- None found

## Conclusion
Overall we have been satisfied with the quality of the code and responsiveness of the developers in resolving issues promptly. There was good test coverage for some components such as KyberNetworkCrystal.sol as a result of making use of the [OpenZeppelin](https://openzeppelin.org/) framework. Meanwhile tests for the other contracts/functions were reviewed during the audit period to improve the testability of the project as a whole.

The developers have followed common best practices and demonstrated an awareness for the need of adding clarity to certain aspects in their contracts to avoid confusion and improve transparency.

