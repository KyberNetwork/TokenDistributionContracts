var TokenSale = artifacts.require("./KyberNetworkTokenSale.sol");
var WhiteList = artifacts.require("./KyberContributorWhitelist.sol");


// Copy & Paste this
Date.prototype.getUnixTime = function() { return this.getTime()/1000|0 };
if(!Date.now) Date.now = function() { return new Date(); }
Date.time = function() { return Date.now().getUnixTime(); }




var tokenSaleContract;

module.exports = function(deployer) {
    var admin = "0x123";
    var multisig = "0x456";
    var whiteListInstance;
    var totalSupply = web3.toWei( 226000000, "ether");
    var premintedSupply = totalSupply / 2;
    var cappedSaleStart = new Date('Fri, 15 Sep 2017 06:00:00 GMT').getUnixTime();
    var publicSaleStartTime = new Date('Sat, 16 Sep 2017 06:00:00 GMT').getUnixTime();
    var publicSaleEndTime = new Date('Sun, 17 Sep 2017 06:00:00 GMT').getUnixTime();

    return WhiteList.new().then(function(instance){
        whiteListInstance = instance;
        return whiteListInstance.listAddress("0x789", 1); // list as slack user
    }).then(function(){
        return TokenSale.new(admin, multisig, whiteListInstance.address, totalSupply,
                             premintedSupply, cappedSaleStart, publicSaleStartTime,
                             publicSaleEndTime);
    }).then(function(result){
        tokenSaleContract = result;
    });
};
