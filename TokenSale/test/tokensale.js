var WhiteList = artifacts.require("./KyberContirbutorWhitelist.sol");
var TokenSale = artifacts.require("./KyberNetworkTokenSale.sol");
var CompanyTokenDistributor = artifacts.require("./CompanyTokenDistributor.sol");
var Token = artifacts.require("./KyberNetworkCrystal.sol");
var BigNumber = require('bignumber.js');
var Helpers = require('./helpers.js');
 

var throwErrorMessage = function( error ) {
    if( error.message.search('invalid opcode') >= 0 ) return true;
    if( error.message.search('out of gas') >= 0 ) return true;    
    return false;    
};


var whiteListContract;
var companyTokensContract;
var tokenSaleContract;
var tokenContract;


var cappedSaleStartTime;
var publicSaleStartTime;
var publicSaleEndTime;



var usersCap = [];
var usersUsedCap = [];

var stressTestParam = 10;

var usersData; 
////////////////////////////////////////////////////////////////////////////////

function UsersData( accounts ) {
    this.ETHBalanceOf = [];
    this.tokenBalanceOf = [];
    this.accounts = accounts;
    for( var i = 0 ; i < accounts.length ; i++ ) {
        this.ETHBalanceOf.push(new BigNumber(0));
        this.tokenBalanceOf.push(new BigNumber(0));        
    };
    
    this.increaseETHBalance = function( user, balance ) {
        var index = getUserIndex( this.accounts, user );
        this.ETHBalanceOf[index] = this.ETHBalanceOf[index].plus(balance);
    };
    
    this.decreaseETHBalance = function( user, balance ) {
        var index = getUserIndex( this.accounts, user );
        this.ETHBalanceOf[index] = this.ETHBalanceOf[index].minus(balance);
    };

    this.increaseTokenBalance = function( user, balance ) {
        var index = getUserIndex( this.accounts, user );
        this.tokenBalanceOf[index] = this.tokenBalanceOf[index].plus(balance);
    };
    
    this.decreaseTokenBalance = function( user, balance ) {
        var index = getUserIndex( this.accounts, user );
        this.tokenBalanceOf[index] = this.tokenBalanceOf[index].minus(balance);
    };
}

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

var initRandomWhilteList = function( whiteList, listOwner, accounts ) {
    function listInput( user, cap ) {
        this.user = user;
        this.cap = cap;
    }

    return new Promise(function (fulfill, reject){
        var inputs = [];
        for( var i = 0 ; i < accounts.length ; i++ ) {
            inputs.push(i);
        }
        
       return inputs.reduce(function (promise, item) {
        var cap;
        return promise.then(function () {
            return getBalancePromise( accounts[item] );
        }).then(function(balance){
            usersData.increaseETHBalance( accounts[item], balance );
            if( item % 2 ) {
                cap = Helpers.getRandomBigIntCapped(balance);
                usersCap.push( cap );
            }
            else {
                cap = new BigNumber(0);
                usersCap.push( new BigNumber(0));
            }
            
            usersUsedCap.push( new BigNumber(0) );
            
            return whiteList.listAddress( accounts[item], cap, {from:listOwner});
        });
        }, Promise.resolve()).then(function(){fulfill(true)});
    });
};
 
////////////////////////////////////////////////////////////////////////////////

var buyWithBuyFunction = function( tokenSaleContract, sender, recipient, value, shouldFail ) {
    return new Promise(function(fulfill, reject){
        console.log("buy: sender " + sender.valueOf() + " recipient " + recipient.valueOf() + " value " + value.valueOf() + " | " + !shouldFail);
        return tokenSaleContract.buy(recipient, {from:sender, value:value}).then(function(){
            assert( ! shouldFail, "buyWithBuyFunction: expected throw, but didn't get one");
            fulfill(true);
        }).catch(function(error){
            if( shouldFail ) {
                assert( throwErrorMessage(error), "expected throw, but got " + error);
                fulfill(true);
            }
            else {
                assert.fail("unexepcted failure");
                reject();  
            }
        });
    });    
};

////////////////////////////////////////////////////////////////////////////////

var buyWithBuyProxyFunction = function( tokenSaleContract, sender, proxy, recipient, value, shouldFail ) {
    return new Promise(function(fulfill, reject){
        console.log("proxyBuy: sender " + sender.valueOf() + " proxy " + proxy.valueOf() + " recipient " + recipient.valueOf() + " value " + value.valueOf() + " | " + !shouldFail);    
        return tokenSaleContract.proxyBuy(proxy, recipient, {from:sender, value:value}).then(function(){
            assert( ! shouldFail, "buyWithBuyProxyFunction: expected throw, but didn't get one");
            fulfill(true);
        }).catch(function(error){
            if( shouldFail ) {
                assert( throwErrorMessage(error), "expected throw, but got " + error);
                fulfill(true);
            }
            else {
                assert.fail("unexepcted failure");
                reject();  
            }
        });
    });
};

////////////////////////////////////////////////////////////////////////////////

var buyWithEtherSending = function( tokenSaleContract, sender, value, shouldFail ) {
    return new Promise(function(fulfill, reject){
        console.log("function(): sender " + sender.valueOf() +  " value " + value.valueOf() + " | " + !shouldFail);
            web3.eth.sendTransaction({to: tokenSaleContract.address, from: sender, value: value}, function(error, result){    
            if( error ) {
                if( shouldFail ) {
                    assert( throwErrorMessage(error), "expected throw, but got " + error);
                }
                else {
                    assert.fail("unexpected failure " + error);
                }                            
            }
            else {
                assert( ! shouldFail, "buyWithBuyProxyFunction: expected throw, but didn't get one");
            }
            
            fulfill(true);
        });
    });
};


////////////////////////////////////////////////////////////////////////////////

var tryToBuyBeforeStart = function( tokenSale, accounts ) {
    return new Promise(function (fulfill, reject){
        var inputs = [];
        for( var i = 0 ; i < accounts.length ; i++ ) {
            if( multisig === accounts[i] ) continue;
            inputs.push(i);
        }
        
       return inputs.reduce(function (promise, item) {
        var balance;
        var maxValue;
                
        return promise.then(function () {
            return getBalancePromise( accounts[item] );
        }).then(function(result){
            balance = result;
            maxValue = balance.div(2).round(); // keep some for gas
        
            if( ! usersCap[ item ].eq(0) ) {
                if( maxValue.greaterThan(usersCap[ item ]) ) maxValue = usersCap[ item ];  
            }
                        
            // try all 3 ways to join sale
            var recipient = Helpers.getRandomAccount(accounts);
            var value = Helpers.getRandomBigIntCapped(maxValue);

            return buyWithBuyFunction( tokenSale, accounts[item], recipient, value, true );
        }).then(function(){
            return checkBalances( accounts, tokenContract );
        }).then(function(){
        
            var recipient = Helpers.getRandomAccount(accounts);
            var value = Helpers.getRandomBigIntCapped(maxValue);
                    
            return buyWithBuyProxyFunction( tokenSale, accounts[item], new BigNumber(0x123), recipient, value, true );
        }).then(function(){
            return checkBalances( accounts, tokenContract );
        }).then(function(){        
            var value = Helpers.getRandomBigIntCapped(maxValue);        
            return buyWithEtherSending( tokenSale, accounts[item], value, true );
        }).then(function(){
            return checkBalances( accounts, tokenContract );                    
        });
        }, Promise.resolve()).then(function(){fulfill(true)});
    });
};

////////////////////////////////////////////////////////////////////////////////

var getUserIndex = function( accounts, user ) {
    for( var i = 0 ; i < accounts.length ; i++ ) {
        if( accounts[i] == user ) return i;
    }    
};

////////////////////////////////////////////////////////////////////////////////

var tryToBuyInCappedSale = function( tokenSale, accounts, halted ) {
    var getRandValue = function( item, recipient, balance ){
        var recIndex = getUserIndex(accounts, recipient );
        var maxValue = balance.div(2).round();
                
        if( usersCap[ recIndex ].greaterThan(0) && usersCap[ recIndex ].greaterThan(usersUsedCap[ recIndex ])  ) {
            maxValue = (usersCap[ recIndex ].minus(usersUsedCap[ recIndex ])).mul(1.25).round();                
            maxValue = BigNumber.min(maxValue, balance.div(10).round());
        }
        
        return Helpers.getRandomBigIntCapped(maxValue);
    };
    
    var updatePaidAmount = function( sender, recipient, userCap, userUsedCap, value ) {
        var amountInWei;
        if( userUsedCap.greaterThan( userCap ) ) amountInWei = new BigNumber(0);
        else amountInWei = BigNumber.min(value, userCap.minus(userUsedCap));
        var tokenAmount = amountInWei.mul(ETHtoKNC);
        
        usersData.decreaseETHBalance( sender, amountInWei );
        usersData.increaseETHBalance( multisig, amountInWei );
        usersData.increaseTokenBalance( recipient,tokenAmount );
    };

    return new Promise(function (fulfill, reject){
        var inputs = [];
        for( var i = 0 ; i < accounts.length ; i++ ) {
            if( multisig === accounts[i] ) continue;        
            inputs.push(i);
        }
        
       return inputs.reduce(function (promise, item) {
        var balance;
        return promise.then(function () {
            return getBalancePromise(accounts[item]);
        }).then(function(result){
            balance = result;

                        
            // try all 3 ways to join sale
            var recipient = Helpers.getRandomAccount(accounts);
            var value = getRandValue(item, recipient, balance);
            var cap = usersCap[getUserIndex(accounts, recipient)].minus(usersUsedCap[getUserIndex(accounts, recipient)]);
            if( usersUsedCap[getUserIndex(accounts, recipient)].greaterThanOrEqualTo(usersCap[getUserIndex(accounts, recipient)]) ) {
                cap = new BigNumber(0);
            }
            
            var shouldFail = halted || cap.eq(new BigNumber(0));
            //console.log( cap.valueOf()); console.log(value.valueOf());
            
            var tokenAmount = new BigNumber(0);
            var ethAmount   = new BigNumber(0);
            
            if( ! shouldFail ) {
                updatePaidAmount( accounts[item],
                                  recipient,
                                  usersCap[getUserIndex(accounts, recipient)],
                                  usersUsedCap[getUserIndex(accounts, recipient)],
                                  value );
            
                usersUsedCap[getUserIndex(accounts, recipient)] = usersUsedCap[getUserIndex(accounts, recipient)].add(value);                
            }            
            
            return buyWithBuyFunction( tokenSale, accounts[item], recipient, value, shouldFail );
        }).then(function(){
            return checkBalances( accounts, tokenContract );
        }).then(function(){
            return getBalancePromise(accounts[item]);
        }).then(function(result){
            balance = result;
        
            var recipient = Helpers.getRandomAccount(accounts);
            var value = getRandValue(item, recipient, balance);
            var cap = usersCap[getUserIndex(accounts, recipient)].minus(usersUsedCap[getUserIndex(accounts, recipient)]);
            if( usersUsedCap[getUserIndex(accounts, recipient)].greaterThanOrEqualTo(usersCap[getUserIndex(accounts, recipient)]) ) {
                cap = new BigNumber(0);
            }

            
            var shouldFail = halted || cap.eq(new BigNumber(0));
                    
            //console.log( cap.valueOf()); console.log(value.valueOf());
            //console.log(usersUsedCap[getUserIndex(accounts, recipient)].valueOf());
            
            if( ! shouldFail ) {
                updatePaidAmount( accounts[item],
                                  recipient,
                                  usersCap[getUserIndex(accounts, recipient)],
                                  usersUsedCap[getUserIndex(accounts, recipient)],
                                  value );
            
                usersUsedCap[getUserIndex(accounts, recipient)] = usersUsedCap[getUserIndex(accounts, recipient)].add(value);
            }
            
                                
            return buyWithBuyProxyFunction( tokenSale, accounts[item], new BigNumber(0x123), recipient, value, shouldFail );
        }).then(function(){
            return checkBalances( accounts, tokenContract );            
        }).then(function(){
            return getBalancePromise(accounts[item]);
        }).then(function(result){
            balance = result;
        
            var value = getRandValue(item, accounts[item], balance);
            var cap = usersCap[item].minus(usersUsedCap[item]);
            if( usersUsedCap[item].greaterThanOrEqualTo(usersCap[item]) ) {
                cap = new BigNumber(0);
            }
            var shouldFail = halted || cap.eq(new BigNumber(0));
            
            //console.log( cap.valueOf()); console.log(value.valueOf());

            if( ! shouldFail ) {
                updatePaidAmount( accounts[item],
                                  accounts[item],
                                  usersCap[item],
                                  usersUsedCap[item],
                                  value );
            
                usersUsedCap[item] = usersUsedCap[item].add(value);
            }
                        
            return buyWithEtherSending( tokenSale, accounts[item], value, shouldFail );
        }).then(function(){
            return checkBalances( accounts, tokenContract );                     
        });
        }, Promise.resolve()).then(function(){fulfill(true)});
    });
};

////////////////////////////////////////////////////////////////////////////////

var tryToBuyInUncappedSale = function( tokenSale, accounts, halted ) {
    var getRandValue = function( item, recipient, balance ){
        var recIndex = getUserIndex(accounts, recipient );
        var maxValue = balance.div(2).round();
        
        return Helpers.getRandomBigIntCapped(maxValue);
    };
    
    var updatePaidAmount = function( sender, recipient, userCap, userUsedCap, value ) {
        var amountInWei;
        if( userUsedCap.greaterThan( userCap ) ) amountInWei = new BigNumber(0);
        else amountInWei = value;
        var tokenAmount = amountInWei.mul(ETHtoKNC);
        
        usersData.decreaseETHBalance( sender, amountInWei );
        usersData.increaseETHBalance( multisig, amountInWei );
        usersData.increaseTokenBalance( recipient,tokenAmount );
    };

    return new Promise(function (fulfill, reject){
        var inputs = [];
        for( var i = 0 ; i < accounts.length ; i++ ) {
            if( multisig === accounts[i] ) continue;        
            inputs.push(i);
        }
        
       return inputs.reduce(function (promise, item) {
        var balance;
        return promise.then(function () {
            return getBalancePromise(accounts[item]);
        }).then(function(result){
            balance = result;
            
            console.log(balance.valueOf());
                        
            // try all 3 ways to join sale
            var recipient = Helpers.getRandomAccount(accounts);
            var value = getRandValue(item, recipient, balance);
            var cap = usersCap[getUserIndex(accounts, recipient)];
            
            var shouldFail = halted || cap.eq(new BigNumber(0));
            //console.log( cap.valueOf()); console.log(value.valueOf());
            
            var tokenAmount = new BigNumber(0);
            var ethAmount   = new BigNumber(0);
            
            if( ! shouldFail ) {
                updatePaidAmount( accounts[item],
                                  recipient,
                                  usersCap[getUserIndex(accounts, recipient)],
                                  new BigNumber(0),
                                  value );
            
                usersUsedCap[getUserIndex(accounts, recipient)] = usersUsedCap[getUserIndex(accounts, recipient)].add(value);                
            }            
            
            return buyWithBuyFunction( tokenSale, accounts[item], recipient, value, shouldFail );
        }).then(function(){
            return checkBalances( accounts, tokenContract );
            
        }).then(function(){
            return getBalancePromise(accounts[item]);
        }).then(function(result){
            balance = result;
            
            console.log(balance.valueOf());            
        
            var recipient = Helpers.getRandomAccount(accounts);
            var value = getRandValue(item, recipient, balance);
            var cap = usersCap[getUserIndex(accounts, recipient)];

            
            var shouldFail = halted || cap.eq(new BigNumber(0));
                    
            //console.log( cap.valueOf()); console.log(value.valueOf());
            //console.log(usersUsedCap[getUserIndex(accounts, recipient)].valueOf());
            
            if( ! shouldFail ) {
                updatePaidAmount( accounts[item],
                                  recipient,
                                  usersCap[getUserIndex(accounts, recipient)],
                                  new BigNumber(0),
                                  value );

                usersUsedCap[getUserIndex(accounts, recipient)] = usersUsedCap[getUserIndex(accounts, recipient)].add(value);
            }
            
                                
            return buyWithBuyProxyFunction( tokenSale, accounts[item], new BigNumber(0x123), recipient, value, shouldFail );
        }).then(function(){
            return checkBalances( accounts, tokenContract );            
        }).then(function(){
            return getBalancePromise(accounts[item]);
        }).then(function(result){
            balance = result;

            console.log(balance.valueOf());
        
            var value = getRandValue(item, accounts[item], balance);
            var cap = usersCap[item];
            var shouldFail = halted || cap.eq(new BigNumber(0));
            
            //console.log( cap.valueOf()); console.log(value.valueOf());

            if( ! shouldFail ) {
                updatePaidAmount( accounts[item],
                                  accounts[item],
                                  usersCap[item],
                                  new BigNumber(0),
                                  value );
            
                usersUsedCap[item] = usersUsedCap[item].add(value);
            }
                        
            return buyWithEtherSending( tokenSale, accounts[item], value, shouldFail );
        }).then(function(){
            return checkBalances( accounts, tokenContract );                     
        });
        }, Promise.resolve()).then(function(){fulfill(true)});
    });
};



////////////////////////////////////////////////////////////////////////////////

var checkBalances = function( accounts, tokenContract ){
    return new Promise(function (fulfill, reject){
        var inputs = [];
        for( var i = 0 ; i < accounts.length ; i++ ) {        
            inputs.push(i);
        }
        
       return inputs.reduce(function (promise, item) {
         var expectedTokenBalance = usersData.tokenBalanceOf[item];       
        return promise.then(function () {
            // check balance
            return getBalancePromise(accounts[item]);
        }).then(function(balance){
            
            var expectedBalance = usersData.ETHBalanceOf[item];
            var epsilon = (new BigNumber(10)).pow(18);
            if( balance.greaterThan(expectedBalance.plus(epsilon)) ||
                expectedBalance.greaterThan(balance.plus(epsilon)) ) {
                assert.equal( balance.valueOf(), expectedBalance.valueOf(), "unexpected balance of account " + accounts[item].valueOf());
            }
            
            // update balance 
            usersData.ETHBalanceOf[item] = balance;
            
            
            return tokenContract.balanceOf(accounts[item]);
        }).then(function(result){
            assert.equal(result.valueOf(), expectedTokenBalance.valueOf(), "unexpected token balance" );
        });
        }, Promise.resolve()).then(function(){fulfill(true)});
    });
};

////////////////////////////////////////////////////////////////////////////////

var setHalt = function( tokenSaleContract, accounts, admin, currentState, halt ){
    return new Promise(function (fulfill, reject){
        var inputs = [];
        for( var i = 0 ; i < accounts.length ; i++ ) {        
            inputs.push(i);
        }
        
        var expectedHalt = currentState;
        
        
        
       return inputs.reduce(function (promise, item) {
        var shouldFail;       
        return promise.then(function () {
            return tokenSaleContract.haltSale();
        }).then(function(result){
            assert.equal(result.valueOf(), result.valueOf(), "unexpected halt state");
                        
            shouldFail = (accounts[item] !== admin );

            return tokenSaleContract.setHaltSale(halt,{from:accounts[item]});            
        }).then(function(){
            assert( ! shouldFail, "set halt was supposed to fail");
            expectedHalt = halt;
            return tokenSaleContract.haltSale();
        }).then(function(result){
            console.log(result.valueOf());
            assert.equal(result.valueOf(), expectedHalt.valueOf(), "unexpected halt state");        
        }).catch(function(error){
            if( shouldFail ) {
                assert( throwErrorMessage(error), "expected throw, but got " + error);
            }
            else {
                assert.fail("unexepcted failure");
                reject();  
            }
        }).then(function(){
            return tokenSaleContract.haltSale();
        }).then(function(result){
            assert.equal(result.valueOf(), result.valueOf(), "unexpected halt state");        
        });
        }, Promise.resolve()).then(function(){fulfill(true)});
    });
};


////////////////////////////////////////////////////////////////////////////////

var testFinalize = function( accounts, afterSaleEnded ) {
    return new Promise(function (fulfill, reject){
        var saleTokensBalanceBefore;
        var companyTokensBalanceBefore;
        
        var saleTokensBalanceAfter;
        var companyTokensBalanceAfter;
        
        return tokenContract.balanceOf(tokenSaleContract.address).then(function(result){
            saleTokensBalanceBefore = result;
            return tokenContract.balanceOf(companyTokensContract.address);
        }).then(function(result){
            companyTokensBalanceBefore = result;
            var account = Helpers.getRandomAccount(accounts);
            return tokenSaleContract.finalizeSale({from:account});
        }).then(function(){        
            assert( afterSaleEnded, "expecting failure before end of sale" );            
            
            return tokenContract.balanceOf(tokenSaleContract.address);
        }).then(function(result){            
            saleTokensBalanceAfter = result;
            return tokenContract.balanceOf(companyTokensContract.address);
        }).then(function(result){
            companyTokensBalanceAfter = result;
            console.log(saleTokensBalanceAfter.valueOf());
            assert.equal( saleTokensBalanceAfter.valueOf(), (new BigNumber(0)).valueOf(),
            "token sale contract token balance after sale must be 0" );

            var expectedCompanyBalance = companyTokensBalanceBefore.plus(saleTokensBalanceBefore);
            
            assert.equal( expectedCompanyBalance.valueOf(), companyTokensBalanceAfter.valueOf(), "unexpected company balance");
            
            return fulfill(true);
            
        }).catch(function(error){
            assert( ! afterSaleEnded, "expecting failure only before end of sale" );
            assert( throwErrorMessage(error), "expected throw, but got " + error);
            
            // check that balances were not changed
            
            return tokenContract.balanceOf(tokenSaleContract.address);
        }).then(function(result){            
            saleTokensBalanceAfter = result;
            return tokenContract.balanceOf(companyTokensContract.address);
        }).then(function(result){
            companyTokensBalanceAfter = result;

            if( ! afterSaleEnded ) {
                assert.equal( companyTokensBalanceBefore.valueOf(), companyTokensBalanceAfter.valueOf(), "unexpected company balance");
                assert.equal( saleTokensBalanceBefore.valueOf(), saleTokensBalanceAfter.valueOf(), "unexpected company balance");
            }
                        
            return fulfill(true);            
        });            
    });
};


////////////////////////////////////////////////////////////////////////////////

var testDebugBuy = function( accounts ) {
    return new Promise(function (fulfill, reject){
        var multisigBalanceBefore;
        var multisigBalanceAfter;

        var account = Helpers.getRandomAccount(accounts);

        return getBalancePromise( multisig).then(function(result){
            multisigBalanceBefore = result;
            
            return tokenSaleContract.debugBuy({value: 123, from:account});
        }).then(function(){
            return getBalancePromise( multisig );
        }).then(function(result){
            multisnigBalanceAfter = result;
            var expectedBalance = multisigBalanceBefore.add(123);
            
            assert.equal( expectedBalance.valueOf(), multisnigBalanceAfter.valueOf(),
            "Unexpected balance");
            
            // try to send higher values
            return tokenSaleContract.debugBuy({value: 1230, from:account});
        }).then(function(){
            assert.fail( "expected to fail");
        }).catch(function(error){
            assert( throwErrorMessage(error), "expected throw");
            fulfill(true);
        });
    });
};


////////////////////////////////////////////////////////////////////////////////

var ETHtoKNC = new BigNumber(600);

var totalSupply = ((new BigNumber(10)).pow(18)).mul(200000 * 600);

var admin;
var multisig;

////////////////////////////////////////////////////////////////////////////////

contract('token sale', function(accounts) {

  beforeEach(function(done){
    done();
  });
  afterEach(function(done){
    done();
  });

  it("mine one block to get current time", function() {
    Helpers.setSeed(8);
    usersData = new UsersData( accounts );
    return Helpers.sendPromise( 'evm_mine', [] );
  });
  
  it("deploy white list", function() {
    return WhiteList.new({from:accounts[2],gas:4000000}).then(function(instance){
        whiteListContract = instance;
        return initRandomWhilteList( whiteListContract, accounts[2], accounts );
    });
  });
  
  it("deploy company token distributor", function() {
    return CompanyTokenDistributor.new(accounts[0]).then(function(instance){
        companyTokensContract = instance;
    });
  });
  
  it("deploy token sale contract", function() {
    var currentTime = web3.eth.getBlock('latest').timestamp;
  
    cappedSaleStartTime = currentTime + 3600; // one hour from now
    publicSaleStartTime = cappedSaleStartTime  + 6 * 3600; 
    publicSaleEndTime = publicSaleStartTime + 15 * 3600;

    admin = Helpers.getRandomAccount(accounts);
    multisig = Helpers.getRandomAccount(accounts);
    return TokenSale.new( admin,
                          multisig,
                          companyTokensContract.address,
                          whiteListContract.address,
                          totalSupply,
                          cappedSaleStartTime,
                          publicSaleStartTime,
                          publicSaleEndTime ).then(function(instance){
        tokenSaleContract = instance;
        return tokenSaleContract.token();                            
    }).then(function(result){
        tokenContract = Token.at(result);
        return tokenContract.balanceOf(tokenSaleContract.address);
    }).then(function(result){
        assert.equal( result.valueOf(), totalSupply.div(2).round().valueOf(), "unexpected contract balance");
    });  
  });

  it("debug buy", function() {
    return testDebugBuy( accounts );
  });




  it("finalize", function() {
    return testFinalize( accounts, false );
  });
  

  it("try to buy tokens before sale starts 1", function() {
    return tryToBuyBeforeStart( tokenSaleContract, accounts );
  });
  
  it("fast forward but still before capped sale", function() {
    var fastForwardTime = (cappedSaleStartTime - web3.eth.getBlock('latest').timestamp) / 2;
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            var currentTime = web3.eth.getBlock('latest').timestamp;
            if( currentTime >= cappedSaleStartTime ) assert.fail( "current time is not as expected" );
        });
    });
  });

  it("try to buy tokens before sale starts 2", function() {
    return tryToBuyBeforeStart( tokenSaleContract, accounts );
  });


  it("finalize", function() {
    return testFinalize( accounts, false );
  });

  it("debug buy", function() {
    return testDebugBuy( accounts );
  });


  it("fast forward to capped sale", function() {
    var fastForwardTime = (cappedSaleStartTime - web3.eth.getBlock('latest').timestamp) + 1;
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            var currentTime = web3.eth.getBlock('latest').timestamp;
            if( currentTime < cappedSaleStartTime ) assert.fail( "current time is not as expected" );
        });
    });
  });

  it("finalize", function() {
    return testFinalize( accounts, false );
  });

  it("debug buy", function() {
    return testDebugBuy( accounts );
  });


  it("try to buy tokens in capped sale", function() {
    return tryToBuyInCappedSale( tokenSaleContract, accounts, false );
  });

  it("set halt", function() {
    return setHalt( tokenSaleContract, accounts, admin, false, true );
  });


  it("fast forward but still in capped sale", function() {
    var fastForwardTime = (publicSaleStartTime - web3.eth.getBlock('latest').timestamp) / 2;
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            var currentTime = web3.eth.getBlock('latest').timestamp;
            if( currentTime >= publicSaleStartTime ) assert.fail( "current time is not as expected" );
        });
    });
  });

  it("finalize", function() {
    return testFinalize( accounts, false );
  });

  it("debug buy", function() {
    return testDebugBuy( accounts );
  });


  it("try to buy tokens again in capped sale when halted", function() {
    return tryToBuyInCappedSale( tokenSaleContract, accounts, true );
  });

  it("reset halt", function() {
    return setHalt( tokenSaleContract, accounts, admin, true, false );
  });

  it("try to buy tokens again in capped sale when not halted", function() {
    return tryToBuyInCappedSale( tokenSaleContract, accounts, false );
  });

  it("try to buy tokens again in capped sale when not halted", function() {
    return tryToBuyInCappedSale( tokenSaleContract, accounts, false );
  });



  it("fast forward to uncapped sale", function() {
    var fastForwardTime = (publicSaleStartTime - web3.eth.getBlock('latest').timestamp) + 1;
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            var currentTime = web3.eth.getBlock('latest').timestamp;
            if( currentTime < publicSaleStartTime ) assert.fail( "current time is not as expected" );
        });
    });
  });

  it("finalize", function() {
    return testFinalize( accounts, false );
  });

  it("debug buy", function() {
    return testDebugBuy( accounts );
  });


  it("try to buy tokens in uncapped sale", function() {
    return tryToBuyInUncappedSale( tokenSaleContract, accounts, false );
  });


  it("fast forward just for fun", function() {
    var fastForwardTime = (publicSaleEndTime - web3.eth.getBlock('latest').timestamp) / 2;
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            var currentTime = web3.eth.getBlock('latest').timestamp;

        });
    });
  });

  it("set halt", function() {
    return setHalt( tokenSaleContract, accounts, admin, false, true );
  });

  it("try to buy tokens in uncapped sale but in halt", function() {
    return tryToBuyInUncappedSale( tokenSaleContract, accounts, true );
  });

  it("set halt", function() {
    return setHalt( tokenSaleContract, accounts, admin, true, false );
  });

  it("try to buy tokens in uncapped sale but not in halt", function() {
    return tryToBuyInUncappedSale( tokenSaleContract, accounts, false );
  });
  

  it("finalize", function() {
    return testFinalize( accounts, false );
  });

  it("debug buy", function() {
    return testDebugBuy( accounts );
  });


  it("fast forward to end of sale", function() {
    var fastForwardTime = (publicSaleEndTime - web3.eth.getBlock('latest').timestamp) + 1
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            var currentTime = web3.eth.getBlock('latest').timestamp;
        });
    });
  });


  it("try to buy tokens after token sale ends 1", function() {
    return tryToBuyBeforeStart( tokenSaleContract, accounts );
  });


  it("try to buy tokens after token sale ends 2", function() {
    return tryToBuyBeforeStart( tokenSaleContract, accounts );
  });
  

  it("finalize", function() {
    return testFinalize( accounts, true );
  });

  it("debug buy", function() {
    return testDebugBuy( accounts );
  });
});
