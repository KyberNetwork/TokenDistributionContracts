pragma solidity ^0.4.11;

import "./Ownable.sol";

contract KyberContirbutorWhitelist is Ownable {
    mapping(address=>uint) addressCap;
    
    function KyberContirbutorWhitelist() {}
    
    event ListAddress( address _user, uint _cap, uint _time );
    
    // Owner can delist by setting cap = 0.
    // Onwer can also change it at any time
    function listAddress( address _user, uint _cap ) onlyOwner {
        addressCap[_user] = _cap;
        ListAddress( _user, _cap, now );
    }
    
    function getCap( address _user ) constant returns(uint) {
        return addressCap[_user];
    }
}
