pragma solidity ^0.4.11;

import './zeppelin/ownership/Ownable.sol';

contract KyberContirbutorWhitelist is Ownable {
    uint public slackUsersCap = 7;
    mapping(address=>uint) public addressCap;
    
    function KyberContirbutorWhitelist() {}
    
    event ListAddress( address _user, uint _cap, uint _time );
    
    // Owner can delist by setting cap = 0.
    // Onwer can also change it at any time
    function listAddress( address _user, uint _cap ) onlyOwner {
        addressCap[_user] = _cap;
        ListAddress( _user, _cap, now );
    }

    // an optimasition in case of network congestion    
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
        uint cap = addressCap[_user];
        
        if( cap == 1 ) return slackUsersCap;
        else return cap;
    }
    
    function destroy() onlyOwner {
        selfdestruct(owner);
    }        
}
