pragma solidity ^0.4.11;

import './KyberNetworkCrystal.sol';
import './ContributorApprover.sol';
import './KyberContirbutorWhitelist.sol';
import './PremintedTokenDistributor.sol';

contract KyberNetworkTokenSale is ContributorApprover {
    address             public admin;
    address             public kyberMultiSigWallet;
    KyberNetworkCrystal public token;
    uint                public raisedWei;
    PremintedTokenDistributor public premintedDistributor;
    bool                public haltSale;
    
    mapping(bytes32=>uint) public proxyPurchases;

    function KyberNetworkTokenSale( address _admin,
                                    address _kyberMultiSigWallet,
                                    PremintedTokenDistributor _premintedDistributor,
                                    KyberContirbutorWhitelist _whilteListContract,
                                    uint _totalTokenSupply,
                                    uint _premintedTokenSupply,
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
        premintedDistributor = _premintedDistributor;
                                  
        token = new KyberNetworkCrystal( _totalTokenSupply, _cappedSaleStartTime, _publicSaleEndTime, _admin );
        
        assert( token.approve(premintedDistributor, _premintedTokenSupply ) );
        premintedDistributor.beforeSale( token, _premintedTokenSupply );
    }
    
    function setHaltSale( bool halt ) {
        require( msg.sender == admin );
        haltSale = halt;
    }
    
    function() payable {
        buy( msg.sender );
    }
    
    event ProxyBuy( bytes32 indexed proxy, address recipient, uint amountInWei );
    function proxyBuy( bytes32 proxy, address recipient ) payable {
        uint amount = buy( recipient );
        proxyPurchases[proxy].add(amount);
        ProxyBuy( proxy, recipient, amount );
    }  
    
    event Buy( address buyer, uint tokens, uint payedWei );
    function buy( address recipient ) payable returns(uint){
        require( ! haltSale );
        require( saleStarted() );
        require( ! saleEnded() );
        
        // NOTE!!! this has a side affect of preventing multisig wallet from participating
        // directly in the sale.
        // this is neither a bug nor a feature.
        uint totalETHBefore = msg.sender.balance.add( kyberMultiSigWallet.balance ).add(this.balance);
           
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
                
        // make sure no funds were left in contract
        assert( this.balance == 0 );
        
        // make sure no ETH was lost
        assert( msg.sender.balance.add( kyberMultiSigWallet.balance) == totalETHBefore ); 
        
        Buy( recipient, recievedTokens, weiPayment );
        
        return weiPayment;
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
        assert( token.approve( premintedDistributor, tokenBalance ) );
        premintedDistributor.afterSale( token, tokenBalance );
        
        FinalizeSale();
    }
    
    // just to check that funds goes to the right place
    // tokens are not given in return
    function debugBuy() payable { 
        require( msg.value == 123 );
        sendETHToMultiSig( msg.value );
        // make sure no funds were left in contract
        assert( this.balance == 0 );                
    }
}