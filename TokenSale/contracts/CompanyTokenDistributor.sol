pragma solidity ^0.4.11;

import './KyberNetworkCrystal.sol';
import './SimpleVesting.sol';
import './zeppelin/token/ERC20.sol';


contract CompanyTokenDistributor {
    address public admin;
    
    function CompanyTokenDistributor( address _admin ) {
        admin = _admin;
    } 

    function beforeSale( KyberNetworkCrystal token, uint amount ) {
        assert( token.transferFrom(msg.sender, this, amount ) );
        // TODO - distributed among wallets
    }
    function afterSale( KyberNetworkCrystal token, uint amount ) {
        assert( token.transferFrom(msg.sender, this, amount ) );
        // TODO - distributed among wallets    
    }
    
    function emergencyTransferDrain( ERC20 token, uint amount ) {
        token.transfer( admin, amount );
    }
    
    function emergencyTransferFromDrain( ERC20 token, address from, uint amount ) {
        token.transferFrom( from, admin, amount );
    }    
}
