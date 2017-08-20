pragma solidity ^0.4.11;

import './zeppelin/ownership/Ownable.sol';
import './zeppelin/token/ERC20Basic.sol';


contract SimpleVesting is Ownable {
    ERC20Basic     public token;
    uint           public vestingAmount;
    
    bool[5]        public withdrawed;
    uint[5]        public withdrawAmount;
    uint[5]        public withdrawTime;
    
    uint           public finalVestingPeriod;
    
        
    function SimpleVesting( address to, uint amount, uint startTime ) {
        transferOwnership(to);
        vestingAmount = amount;
        
        withdrawAmount[0] = amount / 2;
        withdrawAmount[1] = amount / 8;
        withdrawAmount[2] = amount / 8;
        withdrawAmount[3] = amount / 8;
        withdrawAmount[4] = amount / 8;
        
        withdrawTime[0] = startTime + 1 years;
        withdrawTime[1] = withdrawTime[0] + 90 days;
        withdrawTime[2] = withdrawTime[1] + 90 days;
        withdrawTime[3] = withdrawTime[2] + 90 days;
        withdrawTime[4] = withdrawTime[3] + 90 days;
        
        finalVestingPeriod = withdrawTime[4]; 
    }
    
    function withdrawAfterPeriod( uint period ) onlyOwner {
        require( now >= withdrawTime[period] );
        require( ! withdrawed[period] );
        
        withdrawed[period] = true;
        
        assert( token.transfer(owner, withdrawAmount[period] ) );
    }

    function drain( ERC20Basic anyToken, uint amount ) onlyOwner {
        require( now >= finalVestingPeriod );
    
        anyToken.transfer(owner, amount);
    }
}
