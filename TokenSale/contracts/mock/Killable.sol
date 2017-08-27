pragma solidity ^0.4.11;

contract Killable {
    function Killable() payable {

    }
    
    function destroy(address to) {
        selfdestruct(to);    
    }
}