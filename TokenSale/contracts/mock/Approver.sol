pragma solidity ^0.4.11;

import './../ContributorApprover.sol';

contract Approver is ContributorApprover {
        
    function Approver( KyberContirbutorWhitelist _whilteListContract,
                       uint _cappedSaleStartTime,
                       uint _publicSaleStartTime,
                       uint _publicSaleEndTime )             
        ContributorApprover( _whilteListContract,
                             _cappedSaleStartTime,
                             _publicSaleStartTime,                                  
                             _publicSaleEndTime ) {}
               
    event Result( uint x );              
    function testAndIncrement( address contributor, uint amountInWei ) {
        Result( eligibleTestAndIncrement( contributor, amountInWei ) );
    }
}
