# Kyber Network Token Sale
In this document, we describe the token sale specification and implementation,
and give an overview over the smart contracts structure.

## Informal Specification
The token sale is open only to registered users. 
Each user has individual cap for the amount of Ether he can contribute.
In the sale, bounded number of tokens is offered (e.g., there is hard cap for raised ether).

In the first 24 hours user contribution is limited by his cap.
In the second 24 hours, (registered) users can make any size of contribution, until token supply is depleted.

Preminted tokens are allocated to the company and to the team.
Team tokens are vested for 2 years, with 1 year cliff.


## Detailed description

### Overview of flow
Denote by T the start time of the token sale.

1. On T - 5 days, we deploy `KyberContirbutorWhitelist.sol` and list users and their cap.
The listing is done by us with a standard private key. At the end of the listing the ownership on the list is transfered to a secure multisig wallet.

2. On T - 3, we deploy the token sale contract, namely, `KyberNetworkTokenSale.sol`.
The contract gets as input an instance of the deployed whitelist.
Upon deployment, preminted tokens are already distributed.

3. On T- 2, we manually verify that preminted tokens were assigned to the correct addresses.
We also try to transfer 1 company token, to see that it works. 
Finally, we call `debugBuy` function to manually verify that ether goes to the correct wallet.

3. On T, the sale starts. At this point users can buy tokens according to their individual caps.
It is possible to buy several times, as long as cap is not exceeded.
Token transfers are disabled.

4. On T+1, the open sale starts. At this point users that are in the whitelist can buy tokens with any amount.

5. On T+2, the sale ends
6. On T+2 + epsilon, `finalizeSale` is called and unsold tokens are sent to the company wallet.  
7. On T+9 token transfers are enabled.

### Per module description
The system has 3 modules, namely, white list, token, and token sale modules.

#### White list
Implemented in `KyberContirbutorWhitelist.sol`.
Provides a raw list of addresses and their cap.
Owner of the contract can list and delist (set cap to 0) users at any point.
In practice, we will not make changes in the list after its first initialization, unless issues are discovered.

#### Token
Implemented in `KyberNetworkCrystal.sol`. The token is fully compatible with ERC20 standard, with the next two additions:

1. It has a burning functionality that allows user to burn his tokens.
To optimize gas cost, an auxiliary `burnFrom` function was also implemented.
This function allows sender to burn tokens that were approved by a spender.

2. It is impossible to transfer tokens during the period of the token sale.
To be more precise, only the token sale contract is allowed to transfer tokens during the token sale. 


#### Token sale
The token sale contract has 3 roles:
1. Distributing preminted tokens. Implemented in `KyberContirbutorWhitelist.sol`.
2. Verifying that user is listed and that cap is not exceeded. Implemented in `ContributorApprover.sol`.
3. Distributing tokens to buyers. Implemented in `KyberNetworkTokenSale.sol`.

The `KyberNetworkTokenSale` contract inherent from `KyberContirbutorWhitelist` and `ContributorApprover`.
The last 2 contracts provide only internal functions to change contract state and public functions to query current state.
All state changes are invoked by `KyberNetworkTokenSale`.

### Use of zeppelin code
We use open-zeppling code for `SafeMath`, `Ownable` and `StandardToken` logic.
After first round of testing we discovered two incompatibilities of zepplin's standard token and ERC20 standard.
The two issues are described [here](https://github.com/OpenZeppelin/zeppelin-solidity/issues/370) and [here](https://github.com/OpenZeppelin/zeppelin-solidity/pull/377).
We notified zeppling team, and a [PR](https://github.com/OpenZeppelin/zeppelin-solidity/pull/377) to fix the second issue was merged to zepplin code base.

In our code base we decided to include a fix for both issues, and we expect the auditor to review these changes.
Changes are denoted with `KYBER-NOTE!` comment in `ERC20.sol`, `ERC20Basic.sol` and `StandardToken.sol` files.
  
# Testrpc commandline
testrpc --account="0xa7bd56770b690a592f57a0b9d17163b07b5ac5216163bbd929d3923e5ac05c80,400000000000000000000000" --account="0xa7bd56770b690a592f57a0b9d17163b07b5ac5216163bbd929d3923e5ac05c81,400000000000000000000000" --account="0xa7bd56770b690a592f57a0b9d17163b07b5ac5216163bbd929d3923e5ac05c82,400000000000000000000000" --account="0xa7bd56770b690a592f57a0b9d17163b07b5ac5216163bbd929d3923e5ac05c83,400000000000000000000000" --account="0xa7bd56770b690a592f57a0b9d17163b07b5ac5216163bbd929d3923e5ac05c84,400000000000000000000000" --account="0xa7bd56770b690a592f57a0b9d17163b07b5ac5216163bbd929d3923e5ac05c85,400000000000000000000000" --account="0xa7bd56770b690a592f57a0b9d17163b07b5ac5216163bbd929d3923e5ac05c86,400000000000000000000000" --account="0xa7bd56770b690a592f57a0b9d17163b07b5ac5216163bbd929d3923e5ac05c87,400000000000000000000000" --account="0xa7bd56770b690a592f57a0b9d17163b07b5ac5216163bbd929d3923e5ac05c88,400000000000000000000000" --account="0xa7bd56770b690a592f57a0b9d17163b07b5ac5216163bbd929d3923e5ac05c89,400000000000000000000000" --account="0xa7bd56770b690a592f57a0b9d17163b07b5ac5216163bbd929d3923e5ac05c8a,400000000000000000000000"
