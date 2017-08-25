pragma solidity ^0.4.11;

import './KyberContirbutorWhitelist.sol';


contract KyberContirbutorWhitelistOptimized is KyberContirbutorWhitelist {
    uint public slackUsersCap = 7;
    
    function KyberContirbutorWhitelistOptimized() {}
    
    function listAddresses( address[] _users, uint[] _cap ) onlyOwner {
        require(_users.length == _cap.length );
        for( uint i = 0 ; i < _users.length ; i++ ) {
            listAddress( _users[i], _cap[i] );   
        }
    }
    
    function setSlackUsersCap( uint _cap ) onlyOwner {
        slackUsersCap = _cap;        
    }
    
    function getCap( address _user ) constant returns(uint) {
        uint cap = super.getCap(_user);
        
        if( cap == 1 ) return slackUsersCap;
        else return cap;
    }
    
    function destroy() onlyOwner {
        selfdestruct(owner);
    }    
}
