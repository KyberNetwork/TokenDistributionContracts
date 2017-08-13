pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import './KyberContirbutorWhitelist.sol';

contract ContributorApprover {
    KyberContirbutorWhitelist public list;
    mapping(address=>bool)    public participated;
    
    uint                      public cappedSaleStartTime;
    uint                      public openSaleStartTime;
    uint                      public openSaleEndTime;
    
    function ContributorApprover( KyberContirbutorWhitelist _whitelistContract,
                                  uint                      _cappedSaleStartTime,
                                  uint                      _openSaleStartTime,                                  
                                  uint                      _openSaleEndTime ) {
        list = _whitelistContract;
        cappedSaleStartTime = _cappedSaleStartTime;
        openSaleStartTime = _openSaleStartTime;
        openSaleEndTime = _openSaleEndTime;
        
        require( list != KyberContirbutorWhitelist(0x0) );
        require( cappedSaleStartTime < openSaleStartTime );
        require( openSaleEndTime < openSaleStartTime );
    }

    // this is a seperate function so user could query it before crowdsale starts
    function contributorCap( address contributor ) constant returns(uint) {
        return list.getCap( contributor );
    }
    
    function eligible( address contributor, uint amountInWei ) constant returns(bool) {
        if( now < cappedSaleStartTime ) return false;
        if( now > openSaleEndTime ) return false;
    
        uint cap = contributorCap( contributor );
        
        if( cap == 0 ) return false;
        if( now < openSaleStartTime ) {
            if( participated[ contributor ] ) return false;
            if( cap < amountInWei ) return false;
        }

        return true;    
    }
    
    function isEligibleTestAndSet( address contributor, uint amountInWei ) internal returns(bool) {
        bool result = eligible( contributor, amountInWei );
        participated[contributor] = true;
        
        return result;
    }
    
    function saleEnded() constant returns(bool) {
        return now > openSaleEndTime;
    } 
}