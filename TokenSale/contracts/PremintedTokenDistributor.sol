pragma solidity ^0.4.11;

import './KyberNetworkCrystal.sol';
import './SimpleVesting.sol';
import './zeppelin/token/ERC20.sol';


contract PremintedTokenDistributor {
  using SafeMath for uint;

    address public companyWallet;
    uint    public companyTokenAmount;
    
    SimpleVesting[] public vestedWallets;
    mapping(address=>SimpleVesting) public vestedWalletAddress; 
        
    function PremintedTokenDistributor( address   _companyWallet,
                                        uint      _companyTokenAmount,
                                        address[] _beneficiaries,
                                        uint[]    _vestedAmount,
                                        uint      _vestingStartTime ) {
        require( _beneficiaries.length == _vestedAmount.length );
        
        for( uint i = 0 ; i < _beneficiaries.length ; i++ ) {
            vestedWallets.push( new SimpleVesting( _beneficiaries[i],
                                                   _vestedAmount[i],
                                                   _vestingStartTime ) );
            vestedWalletAddress[_beneficiaries[i]] = vestedWallets[i];
        }
                                        
        companyWallet = _companyWallet;
        companyTokenAmount = _companyTokenAmount;
    } 

    function beforeSale( KyberNetworkCrystal token, uint amount ) {
        uint totalAmount = 0;
    
        assert( token.transferFrom(msg.sender, companyWallet, companyTokenAmount ) );
        
        totalAmount = totalAmount.add(companyTokenAmount);
        
        for( uint i = 0 ; i < vestedWallets.length ; i++ ) {
            assert( token.transferFrom(msg.sender, vestedWallets[i], vestedWallets[i].vestingAmount() ) );
            totalAmount = totalAmount.add(vestedWallets[i].vestingAmount());            
        }
        
        assert( totalAmount == amount );
        assert(token.allowance(msg.sender, this) == 0 );
    }
    
    function afterSale( KyberNetworkCrystal token, uint amount ) {
        // everything goes to company
        assert( token.transferFrom(msg.sender, companyWallet, amount ) );    
    }
    
    function emergencyTransferDrain( ERC20 token, uint amount ) {
        require(msg.sender == companyWallet );
        token.transfer( companyWallet, amount );
    }
    
    function emergencyTransferFromDrain( ERC20 token, address from, uint amount ) {
        require(msg.sender == companyWallet );    
        token.transferFrom( from, companyWallet, amount );
    }    
}

