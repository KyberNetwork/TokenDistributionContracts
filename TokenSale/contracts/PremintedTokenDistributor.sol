pragma solidity ^0.4.11;

import './KyberNetworkCrystal.sol';
import './SimpleVesting.sol';
import './zeppelin/token/ERC20.sol';


contract PremintedTokenDistributor {
  using SafeMath for uint;

    address public companyWallet;
    uint    public companyTokenAmount;
    
    address[] public beneficiaries;
    uint[]    public vestedAmount;
    
    uint      public vestingStartTime;    
        
    function PremintedTokenDistributor( address   _companyWallet,
                                        uint      _companyTokenAmount,
                                        address[] _beneficiaries,
                                        uint[]    _vestedAmount,
                                        uint      _vestingStartTime ) {
        require( _beneficiaries.length == _vestedAmount.length );
        
        for( uint i = 0 ; i < _beneficiaries.length ; i++ ) {
            beneficiaries.push(_beneficiaries[i]);
            vestedAmount.push(_vestedAmount[i]);
        }
                                                
        companyWallet = _companyWallet;
        companyTokenAmount = _companyTokenAmount;
        vestingStartTime = _vestingStartTime;
    } 
    
    event NewVestedWallet( address indexed     beneficiary,
                           SimpleVesting       wallet,    
                           KyberNetworkCrystal token,
                           address             sender );

    // note that this is callable by anyone, multiple times    
    function beforeSale( KyberNetworkCrystal token, uint amount ) {
        uint totalAmount = 0;
    
        assert( token.transferFrom(msg.sender, companyWallet, companyTokenAmount ) );
        
        totalAmount = totalAmount.add(companyTokenAmount);

        for( uint i = 0 ; i < beneficiaries.length ; i++ ) {
            SimpleVesting wallet = new SimpleVesting( beneficiaries[i],
                                                      vestedAmount[i],
                                                      vestingStartTime,
                                                      token );
            
            assert( token.transferFrom(msg.sender, wallet, wallet.vestingAmount() ) );
            totalAmount = totalAmount.add(wallet.vestingAmount());
            
            // wallet owner should query this log to get his wallet address
            NewVestedWallet( beneficiaries[i], wallet, token, msg.sender );                        
        }
        
        assert( totalAmount == amount );
        assert(token.allowance(msg.sender, this) == 0 );
    }
    
    // note that this is callable by anyone    
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

