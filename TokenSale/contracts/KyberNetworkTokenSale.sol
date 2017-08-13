pragma solidity ^0.4.11;

import './KyberNetworkCrystal.sol';
import './ContributorApprover.sol';
import './KyberContirbutorWhitelist.sol';
import './CompanyTokenDistributor.sol';

contract KyberNetworkTokenSale is ContributorApprover {
    address             public admin;
    address             public kyberMultiSigWallet;
    KyberNetworkCrystal public token;
    uint                public raisedWei;
    CompanyTokenDistributor public companyDistributor;
    bool                public haltSale;
    
    function KyberNetworkTokenSale( address _admin,
                                    address _kyberMultiSigWallet,
                                    CompanyTokenDistributor _companyDistributor,
                                    KyberContirbutorWhitelist _whilteListContract,
                                    uint _totalTokenSupply,
                                    uint _cappedSaleStartTime,
                                    uint _publicSaleStartTime,
                                    uint _publicSaleEndTime )
                                    
        ContributorApprover( _whilteListContract,
                             _cappedSaleStartTime,
                             _publicSaleStartTime,                                  
                             _publicSaleEndTime )                               
    {
        admin = _admin;
        kyberMultiSigWallet = _kyberMultiSigWallet;
        companyDistributor = _companyDistributor;                          
        token = new KyberNetworkCrystal( _totalTokenSupply, _cappedSaleStartTime, _publicSaleEndTime, _admin );
        
        uint companyTokenAmount = token.totalSupply() / 2; // TODO - change
        assert( token.approve(companyDistributor, companyTokenAmount ) );
        companyDistributor.beforeSale( token, companyTokenAmount );
    }
    
    function setHaltSale( bool halt ) {
        require( msg.sender == admin );
        haltSale = halt;
    }
    
    function() payable {
        buy( msg.sender );
    }
    
    event Buy( address buyer, uint tokens, uint payedWei );
    function buy( address recipient ) payable {
        require( ! haltSale );
        require( ! saleEnded() );   
        require( isEligibleTestAndSet( recipient, msg.value ) );
        
        kyberMultiSigWallet.transfer( msg.value );
        raisedWei += msg.value; // TODO consider safe math
        uint recievedTokens = msg.value / 2; // TODO - set real value + safe math
        
        assert( token.transfer( recipient, recievedTokens ) );
        
        Buy( recipient, recievedTokens, msg.value );
    }
    
    event FinalizeSale();
    // function is callable by everyone
    function finalizeSale() {
        require( saleEnded() );
        
        // send rest of tokens to company
        uint tokenBalance = token.balanceOf( this );
        assert( token.approve(companyDistributor, tokenBalance ) );
        companyDistributor.afterSale(token, tokenBalance );
    }    
}