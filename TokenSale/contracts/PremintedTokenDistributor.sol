pragma solidity ^0.4.11;

import './KyberNetworkCrystal.sol';
import './SimpleVesting.sol';
import './zeppelin/token/ERC20.sol';


contract PremintedTokenDistributor {
    address public admin;
    
    function PremintedTokenDistributor( address _admin ) {
        admin = _admin;
    } 

    function beforeSale( KyberNetworkCrystal token, uint amount ) {
        assert( token.transferFrom(msg.sender, this, amount ) );
        // TODO - distribute among wallets
    }
    function afterSale( KyberNetworkCrystal token, uint amount ) {
        assert( token.transferFrom(msg.sender, this, amount ) );
        // TODO - distribute among wallets    
    }
    
    function emergencyTransferDrain( ERC20 token, uint amount ) {
        require(msg.sender == admin );
        token.transfer( admin, amount );
    }
    
    function emergencyTransferFromDrain( ERC20 token, address from, uint amount ) {
        require(msg.sender == admin );    
        token.transferFrom( from, admin, amount );
    }    
}
