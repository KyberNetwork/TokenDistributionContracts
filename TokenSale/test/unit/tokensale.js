var WhiteList = artifacts.require("./KyberContirbutorWhitelist.sol");
var TokenSale = artifacts.require("./KyberNetworkTokenSale.sol");
var Token = artifacts.require("./KyberNetworkCrystal.sol");
var BigNumber = require('bignumber.js');
var Helpers = require('./../helpers.js');
 

////////////////////////////////////////////////////////////////////////////////

var getBalancePromise = function( account ) {
    return new Promise(function (fulfill, reject){
        web3.eth.getBalance(account,function(err,result){
            if( err ) reject(err);
            else fulfill(result);            
        });      
    });    
};


////////////////////////////////////////////////////////////////////////////////

var buyWithEtherSendingPromise = function( tokenSaleContract, sender, value ) {
    return new Promise(function(fulfill, reject){
            web3.eth.sendTransaction({to: tokenSaleContract.address, from: sender, value: value, gasPrice:50000000000}, function(error, result){    
            if( error ) {
                return reject(error);
            }
            else {
                return fulfill(true);                
            }
        });
    });
};

////////////////////////////////////////////////////////////////////////////////


var ETHtoKNC = new BigNumber(600);

var totalSupply = web3.toWei( new BigNumber(226000000), "ether" );
var publicSupply = web3.toWei( new BigNumber(137995600), "ether" );
var premintedSupply = totalSupply.minus(publicSupply); 

var admin;
var multisig;

var whiteListContract;
var companyTokensContract;
var tokenSaleContract;
var tokenContract;

var companyWallet;

var cappedSaleStartTime;
var publicSaleStartTime;
var publicSaleEndTime;

var buyer1Cap = web3.toWei( new BigNumber(30), "ether" );
var slackCap  = web3.toWei( new BigNumber(10), "ether" );


var multisigTokenBalance;
var multisigEthBalance;

////////////////////////////////////////////////////////////////////////////////

contract('token sale', function(accounts) {

  beforeEach(function(done){
    done();
  });
  afterEach(function(done){
    done();
  });

  it("mine one block to get current time", function() {
    return Helpers.sendPromise( 'evm_mine', [] );
  });
  
  it("deploy white list", function() {
    return WhiteList.new({from:accounts[2],gas:4000000}).then(function(instance){
        whiteListContract = instance;
        return whiteListContract.listAddresses([accounts[0], accounts[1]],
                                               [new BigNumber(1), buyer1Cap ], {from:accounts[2]});
    }).then(function(){
        return whiteListContract.setSlackUsersCap(slackCap, {from:accounts[2]});
    });
  });
  
  it("deploy token sale contract", function() {
    var currentTime = web3.eth.getBlock('latest').timestamp;
  
    cappedSaleStartTime = currentTime + 3600; // one hour from now
    publicSaleStartTime = cappedSaleStartTime  + 6 * 3600; 
    publicSaleEndTime = publicSaleStartTime + 15 * 3600;

    admin = accounts[3];
    multisig = accounts[4];
    return TokenSale.new( admin,
                          multisig,
                          whiteListContract.address,
                          totalSupply,
                          premintedSupply,
                          cappedSaleStartTime,
                          publicSaleStartTime,
                          publicSaleEndTime ).then(function(instance){
        tokenSaleContract = instance;
        return tokenSaleContract.token();                            
    }).then(function(result){
        tokenContract = Token.at(result);
        return tokenContract.balanceOf(tokenSaleContract.address);
    }).then(function(result){
        assert.equal( result.valueOf(), totalSupply.minus(premintedSupply).valueOf(), "unexpected contract balance");
        return tokenContract.balanceOf(multisig);
    }).then(function(result){
        assert.equal( result.valueOf(), premintedSupply.valueOf(), "unexpected company balance");
        multisigTokenBalance = result;
        // check eth balance
        return getBalancePromise(multisig);
    }).then(function(result){
        multisigEthBalance = result;
    });  
  });
  
  it("debug buy", function() {
    return tokenSaleContract.debugBuy({from:accounts[0], value:new BigNumber(123)}).then(function(){
        return getBalancePromise(multisig);
    }).then(function(result){
        multisigEthBalance = multisigEthBalance.plus(123);
        assert.equal(result.valueOf(), multisigEthBalance.valueOf(), "unexpected balance");
    });
  });
  
  it("debug transfer token", function() {
    return tokenContract.transfer(accounts[9], new BigNumber(1),{from: multisig}).then(function(){
        // check balance for accounts[9]
        return tokenContract.balanceOf(accounts[9]);        
    }).then(function(result){
        assert.equal(result.valueOf(), (new BigNumber(1)).valueOf(), "unexpected balance");        
        // check balance of multisig
        return tokenContract.balanceOf(multisig);
    }).then(function(result){
        multisigTokenBalance = multisigTokenBalance.minus(1);
        assert.equal(result.valueOf(), multisigTokenBalance.valueOf(), "unexpected balance");
    });
  });
  
  it("buy before sale starts", function() {
    return tokenSaleContract.buy(accounts[0],{from:accounts[0], value: web3.toWei(1, "ether")}).then(function(){
        assert.fail("expected to throw");
    }).catch(function(error){
        assert( Helpers.throwErrorMessage(error), "expected throw got " + error);
    });
  });
  
  it("fast forward to capped sale", function() {
    var fastForwardTime = (cappedSaleStartTime - web3.eth.getBlock('latest').timestamp) + 1;
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            var currentTime = web3.eth.getBlock('latest').timestamp;
            if( currentTime <= cappedSaleStartTime ) assert.fail( "current time is not as expected" );
        });
    });
  });

  it("buy tokens as slack user", function() {
    return buyWithEtherSendingPromise( tokenSaleContract, accounts[0], slackCap ).then(function(){
    //return tokenSaleContract.buy( accounts[0], {from:accounts[0], gasPrice:50000000000, value:slackCap} ).then(function(){    
        // check that token balance was increased
        return tokenContract.balanceOf(accounts[0]);                
    }).then(function(result){
        assert.equal(result.valueOf(), slackCap.mul(ETHtoKNC), "unexpected balance");
    });
  });

  it("buy user 1 for first time", function() {
    var ethAmount = buyer1Cap.div(2);
    return tokenSaleContract.buy(accounts[1],{from:accounts[2], gasPrice:50000000000, value:ethAmount}).then(function(){
        // get balance of user 1
        return tokenContract.balanceOf(accounts[1]);
    }).then(function(result){
        assert.equal(result.valueOf(), ethAmount.mul(ETHtoKNC).valueOf(), "unexpected balance");
    });
  });

  it("buy user 1 for second time", function() {
    var ethAmount = buyer1Cap; // exceed cap on purpose
    var ethBalanceBefore;
    
    return getBalancePromise(accounts[3]).then(function(result){
        ethBalanceBefore = result;
        return tokenSaleContract.proxyBuy( new BigNumber(0x234), accounts[1],
                                           {from:accounts[3], gasPrice:50000000000, value: ethAmount}); 
    }).then(function(){
        // get token balance of user 1 - should match only full cap
        return tokenContract.balanceOf(accounts[1]);    
    }).then(function(result){
        assert.equal(result.valueOf(), buyer1Cap.mul(ETHtoKNC), "unexpected balance");
        
        // check that accounts[3] balance was refund
        return getBalancePromise(accounts[3]);
    }).then(function(result){
        var expectedBalanceDiff = ethAmount.div(2); // half should be refund
        var actualBalanceDiff = ethBalanceBefore.minus(result);
        if( expectedBalanceDiff.plus(new BigNumber(10).pow(17)).lessThan(actualBalanceDiff) ) {
            assert.fail("unexpected balance diff", expectedBalanceDiff.toString(10), actualBalanceDiff.toString(10));
        }
        if( actualBalanceDiff.plus(new BigNumber(10).pow(17)).lessThan(expectedBalanceDiff) ) {
            assert.fail("unexpected balance diff", expectedBalanceDiff.toString(10), actualBalanceDiff.toString(10));
        }
        
        // check proxy data was saved
        return tokenSaleContract.proxyPurchases(new BigNumber(0x234));
    }).then(function(result){
        assert.equal(result.valueOf(), ethAmount.div(2).valueOf(), "unexpected logged amount");
    });
  });

  it("buy without a cap", function() {
    return buyWithEtherSendingPromise( tokenSaleContract, accounts[2], slackCap ).then(function(){
        assert.fail("expected to throw");
    }).catch(function(error){
        assert( Helpers.throwErrorMessage(error), "expected throw got " + error);
    });
  });

  it("buy after full cap was used", function() {
    return buyWithEtherSendingPromise( tokenSaleContract, accounts[0], slackCap ).then(function(){
        assert.fail("expected to throw");
    }).catch(function(error){
        assert( Helpers.throwErrorMessage(error), "expected throw got " + error);
    });
  });

  it("fast forward to end of capped sale", function() {
    var fastForwardTime = (publicSaleStartTime - web3.eth.getBlock('latest').timestamp) + 1;
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            var currentTime = web3.eth.getBlock('latest').timestamp;
            if( currentTime <= publicSaleStartTime ) assert.fail( "current time is not as expected" );
        });
    });
  });

  it("buy at public sale as slack user", function() {
    return buyWithEtherSendingPromise( tokenSaleContract, accounts[0], slackCap.mul(2) ).then(function(){
        // check balance
        return tokenContract.balanceOf(accounts[0]);
    }).then(function(result){
        assert.equal(result.valueOf(), slackCap.mul(3).mul(ETHtoKNC).valueOf(), "unexpected token balance");        
    });
  });

  it("buy without a cap at public sale", function() {
    return buyWithEtherSendingPromise( tokenSaleContract, accounts[2], slackCap ).then(function(){
        assert.fail("expected to throw");
    }).catch(function(error){
        assert( Helpers.throwErrorMessage(error), "expected throw got " + error);
    });
  });

// TODO - buy more than qty
// TODO - finalize, drain

});
