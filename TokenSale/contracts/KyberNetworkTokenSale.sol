pragma solidity ^0.4.11;

import './KyberNetworkCrystal.sol';
import './ContributorApprover.sol';
import './KyberContirbutorWhitelist.sol';

contract KyberNetworkTokenSale is ContributorApprover {
    address             public admin;
    address             public kyberMultiSigWallet;
    KyberNetworkCrystal public token;
    uint                public raisedWei;
    bool                public haltSale;
    
    mapping(bytes32=>uint) public proxyPurchases;

    function KyberNetworkTokenSale( address _admin,
                                    address _kyberMultiSigWallet,
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
                                  
        token = new KyberNetworkCrystal( _totalTokenSupply,
                                         _cappedSaleStartTime,
                                         _publicSaleEndTime + 7 days,
                                         _admin );

        // transfer preminted tokens to company wallet                                         
        token.transfer( kyberMultiSigWallet, _premintedTokenSupply );
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
        require( tx.gasprice <= 50000000000 wei );    
    
        require( ! haltSale );
        require( saleStarted() );
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
        require(msg.sender == admin );
        
        // burn remaining tokens
        token.burn(token.balanceOf(this));
        
        FinalizeSale();
    }
    
    // ETH balance is always expected to be 0.
    // but in case something went wrong, we use this function to extract the eth.
    function emergencyDrain(ERC20 anyToken) {
        require(msg.sender == admin );
        require( saleEnded() );        
        
        if( this.balance > 0 ) {
            sendETHToMultiSig( this.balance );
        }
        
        if( anyToken != address(0x0) ) {
            assert( anyToken.transfer(kyberMultiSigWallet, anyToken.balanceOf(this)) );
        } 
    }
    
    // just to check that funds goes to the right place
    // tokens are not given in return
    function debugBuy() payable { 
        require( msg.value == 123 );
        sendETHToMultiSig( msg.value );
    }
}