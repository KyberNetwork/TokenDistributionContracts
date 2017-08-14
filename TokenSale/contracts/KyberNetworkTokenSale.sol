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
           
        uint weiPayment = eligibleTestAndIncrement( recipient, msg.value ); 
        
        require( weiPayment > 0 );
        
        // send to msg.sender, not to recipient
        if( msg.value > weiPayment ) {
            msg.sender.transfer( msg.value.sub( weiPayment ) );
        } 
                
        // send payment to wallet
        sendETHToMultiSig( weiPayment );
        
        raisedWei = raisedWei.add( weiPayment );
        uint recievedTokens = weiPayment.mul( 600 );
        
        assert( token.transfer( recipient, recievedTokens ) );        
        assert( this.balance == 0 ); // make sure no funds were left in contract
        
        Buy( recipient, recievedTokens, weiPayment );
    }
    
    function sendETHToMultiSig( uint value ) internal {
        kyberMultiSigWallet.transfer( value );    
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
    
    // just to check that funds goes to the right place
    // tokens are not given in return
    function debugBuy() payable { 
        require( msg.value == 123 );
        sendETHToMultiSig( msg.value );        
    }
}