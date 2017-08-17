pragma solidity ^0.4.11;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import './KyberContirbutorWhitelist.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';

contract ContributorApprover {
    KyberContirbutorWhitelist public list;
    mapping(address=>uint)    public participated;
    
    uint                      public cappedSaleStartTime;
    uint                      public openSaleStartTime;
    uint                      public openSaleEndTime;
    
    using SafeMath for uint;

    
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
        require(  openSaleStartTime < openSaleEndTime );
    }

    // this is a seperate function so user could query it before crowdsale starts
    function contributorCap( address contributor ) constant returns(uint) {
        return list.getCap( contributor );
    }
    
    function eligible( address contributor, uint amountInWei ) constant returns(uint) {
        if( now < cappedSaleStartTime ) return 0;
        if( now >= openSaleEndTime ) return 0;

        uint cap = contributorCap( contributor );
        
        if( cap == 0 ) return 0;
        if( now < openSaleStartTime ) {
            uint remainedCap = cap.sub( participated[ contributor ] );
            
            if( remainedCap > amountInWei ) return amountInWei;
            else return remainedCap;
        }
        else {
            return amountInWei;
        }
    }
    
    function eligibleTestAndIncrement( address contributor, uint amountInWei ) internal returns(uint) {
        uint result = eligible( contributor, amountInWei );
        participated[contributor] = participated[contributor].add( result );
        
        return result;
    }
    
    function saleEnded() constant returns(bool) {
        return now > openSaleEndTime;
    }
    
    function saleStarted() constant returns(bool) {
        return now >= cappedSaleStartTime;
    }      
}