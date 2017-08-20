pragma solidity ^0.4.11;

import './KyberNetworkCrystal.sol';
import './SimpleVesting.sol';
import './zeppelin/token/ERC20.sol';


contract PremintedTokenDistributor {
  using SafeMath for uint;

    // mapping between users and their vested wallets
    mapping(address=>SimpleVesting) public wallets;  
    

    event NewVestedWallet( address indexed     beneficiary,
                           SimpleVesting       wallet,
                           uint                amount );

    
    function createVestedWallet( address beneficiary,
                                 uint    amount,
                                 uint    startTime,
                                 KyberNetworkCrystal token ) internal {
        SimpleVesting wallet = new SimpleVesting( beneficiary,
                                                  amount,
                                                  startTime,
                                                  token );
        NewVestedWallet( beneficiary, wallet, amount );
        wallets[beneficiary] = wallet;
        
        assert( token.transfer(wallet, amount ) );
    }
    
    function distributePremintedTokens( KyberNetworkCrystal token,
                                        address             companyWallet,
                                        uint                companyTokenAmount,
                                        address[]           teamAddresses,
                                        uint[]              teamTokenAmounts,
                                        uint                saleStartTime ) internal {
        require(teamAddresses.length == teamTokenAmounts.length );                                  
                                        
        // send to company
        assert( token.transfer( companyWallet, companyTokenAmount ) );                                        

        // send to team        
        for( uint i = 0 ; i < teamAddresses.length ; i++ ) {
            createVestedWallet( teamAddresses[i], teamTokenAmounts[i], saleStartTime, token );
        }        
    }
        
        
    // note that this is callable by anyone    
    function sendRemainingTokensToCompanyWallet( KyberNetworkCrystal token, address companyWallet ) internal {
        assert( token.transfer( companyWallet, token.balanceOf(this) ) );    
    }
}

