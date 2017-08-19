pragma solidity ^0.4.11;

import './zeppelin/token/StandardToken.sol';
import './zeppelin/ownership/Ownable.sol';

// zepplin standard token has two miner issues:
// 1) Events are a bit different from ERC20 wiki. In particular, _ is missing in the names
// 2) transferFrom to self could succeed even if balance is insufficient. 

contract KyberNetworkCrystal is StandardToken, Ownable {
    string  public  constant name = "Kyber Network Crystal";
    string  public  constant symbol = "KNC";
    uint    public  constant decimals = 18;
    
    uint    public  saleStartTime;
    uint    public  saleEndTime;
    
    address public  tokenSaleContract;

    modifier onlyWhenTransferEnabled() {
        if( now >= saleStartTime && now <= saleEndTime ) {
            require( msg.sender == tokenSaleContract );
        }
        _;
    }

    function KyberNetworkCrystal( uint tokenTotalAmount, uint startTime, uint endTime, address admin ) {    
        // Mint all tokens. Then disable minting forever.
        balances[msg.sender] = tokenTotalAmount;
        Transfer(address(0x0), msg.sender, tokenTotalAmount);
        
        saleStartTime = startTime;
        saleEndTime = endTime;
        
        tokenSaleContract = msg.sender;
        transferOwnership(admin); // admin could drain tokens that were sent here by mistake
    }
  
    function transfer(address _to, uint _value) onlyWhenTransferEnabled returns (bool) {
        return super.transfer(_to, _value);
    }

    function transferFrom(address _from, address _to, uint _value) onlyWhenTransferEnabled returns (bool) {
        return super.transferFrom(_from, _to, _value);
    }
    
    event Burn(address indexed _burner, uint _value);
    
    function burn(uint _value) onlyWhenTransferEnabled{
        balances[msg.sender] = balances[msg.sender].sub(_value);
        totalSupply = totalSupply.sub(_value);
        Burn(msg.sender, _value);
    }    
    
    // save some gas by making only one contract call
    function burnFrom(address _from, uint256 _value) onlyWhenTransferEnabled {
        assert( transferFrom( _from, msg.sender, _value ) );
        return burn(_value);
    }
    
    function emergencyERC20Drain( ERC20 token, uint amount ) onlyOwner {
        token.transfer( owner, amount );
    }        
}



