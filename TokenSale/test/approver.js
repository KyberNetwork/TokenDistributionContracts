var WhiteList = artifacts.require("./KyberContirbutorWhitelist.sol");
var TokenSale = artifacts.require("./KyberNetworkTokenSale.sol");
var MockApprover = artifacts.require("./mock/Approver.sol");
var CompanyTokenDistributor = artifacts.require("./CompanyTokenDistributor.sol");
var BigNumber = require('bignumber.js');
var Helpers = require('./helpers.js');
 



var whiteListContract;
var mockApproverContract;
var companyTokensContract;


var cappedSaleStartTime;
var publicSaleStartTime;
var publicSaleEndTime;


var usersCap = [];
var usersUsedCap = [];

var stressTestParam = 10;

////////////////////////////////////////////////////////////////////////////////

var initRandomWhilteList = function( whiteList, listOwner, accounts ) {
    function listInput( user, cap ) {
        this.user = user;
        this.cap = cap;
    }

    return new Promise(function (fulfill, reject){
        inputs = [];
        for( var i = 0 ; i < accounts.length ; i++ ) {
            if( i % 2 ) {
                // add to list
                var cap = Helpers.getRandomBigInt();
                inputs.push( new listInput( accounts[i], cap ) );
                usersCap.push( cap );
            }
            else {
                usersCap.push( new BigNumber(0) );
            }
            
            usersUsedCap.push( new BigNumber(0) );
        }
        
       return inputs.reduce(function (promise, item) {
        return promise.then(function () {
            return whiteList.listAddress( item.user, item.cap, {from:listOwner});
        });
        }, Promise.resolve()).then(function(){fulfill(true)});
    });
};
 
////////////////////////////////////////////////////////////////////////////////

var compareCaps = function( tokenSale, accounts ) {
    function expectedResult( user, cap ) {
        this.user = user;
        this.cap = cap;
    }

    return new Promise(function (fulfill, reject){
        inputs = [];
        for( var i = 0 ; i < accounts.length ; i++ ) {
            inputs.push( new expectedResult( accounts[i], usersCap[i] ) );
        }
        
       return inputs.reduce(function (promise, item) {
        return promise.then(function () {
            return tokenSale.contributorCap( item.user ).then(function(result){
                assert.equal( result.valueOf(), item.cap.valueOf() );
            });
        });
        }, Promise.resolve()).then(function(){fulfill(true)});
    });    
};

////////////////////////////////////////////////////////////////////////////////

var testEligable = function( tokenSale, accounts, cappedSale, publicSale ) {
    function inputAndExpectedResult( user, amountInWei, result ) {
        this.user = user;
        this.amountInWei = amountInWei;
        this.result = result;
    }

    return new Promise(function (fulfill, reject){
        var inputs = [];
        for( var i = 0 ; i < accounts.length ; i++ ) {
            var amount;
            var randOption = Helpers.getRandomInt(0,3);
            var remainedCap = (usersCap[i].minus( usersUsedCap[i])).absoluteValue();            
            var result;
            
            if( randOption === 0 ) {
                amount = Helpers.getRandomBigIntCapped( remainedCap );
            }
            else if( randOption == 1 ) {
                amount = remainedCap;
            }
            else {
                amount = Helpers.getRandomBigInt();                
            }
            
            if( (! cappedSale ) && ( ! publicSale ) ) {
                result = new BigNumber( 0 );
            }
            else if( cappedSale ) {
                if( amount.greaterThan( remainedCap) ) result = remainedCap;
                else result = amount; 
            }
            else {
                if( ! usersCap[i].eq(0) ) result = amount;
                else result = new BigNumber(0);
            }
            
            inputs.push( new inputAndExpectedResult( accounts[i], amount, result ) );
        }
        
       return inputs.reduce(function (promise, item) {
        return promise.then(function () {
            return tokenSale.eligible( item.user, item.amountInWei ).then(function(result){
                assert.equal( result.valueOf(), item.result.valueOf() );
            }).then(function(){
                return testTestAndIncrement( accounts, tokenSale, item.user, item.amountInWei, item.result );
            });
        });
        }, Promise.resolve()).then(function(){fulfill(true)});
    });    
};
 
////////////////////////////////////////////////////////////////////////////////

var testTestAndIncrement = function( accounts, tokenSale, user, amountInWei, expectedResult ){
    return new Promise(function (fulfill, reject){
        return tokenSale.testAndIncrement( user, amountInWei ).then(function(result){
            assert.equal(result.logs.length, 1, "expected a single event");
            var log = result.logs[0];            
            assert.equal(log.event, "Result", "unexpected event");
            assert.equal(log.args.x.valueOf(), expectedResult.valueOf(), "unexpected result");
            
            for( var i = 0 ; i < accounts.length ; i++ ) {
                if( accounts[i] == user ) {
                    usersUsedCap[i] = usersUsedCap[i].add(log.args.x);
                }
            }
            
            fulfill(true);
        });
    }).catch(function(err){
        reject(err);
    });
};

////////////////////////////////////////////////////////////////////////////////

var testEligbleInIterations = function( tokenSale, accounts, cappedSale, publicSale, numIterations ) {
    return new Promise(function (fulfill, reject){
        var inputs = [];
        for( var i = 0 ; i < numIterations ; i++ ) {
            inputs.push( 1 );
        }
        
       return inputs.reduce(function (promise, item) {
        return promise.then(function () {
            return testEligable( tokenSale, accounts, cappedSale, publicSale );
        });
        }, Promise.resolve()).then(function(){fulfill(true)});
    });    
};



////////////////////////////////////////////////////////////////////////////////

contract('contributor approver', function(accounts) {

  beforeEach(function(done){
    done();
  });
  afterEach(function(done){
    done();
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
    var currentTime = Math.floor( Date.now() / 1000 );
  
    cappedSaleStartTime = currentTime + 3600; // one hour from now
    publicSaleStartTime = cappedSaleStartTime  + 3 * 3600; 
    publicSaleEndTime = publicSaleStartTime + 21 * 3600; 
  
    return MockApprover.new( whiteListContract.address, // whitelist
                             cappedSaleStartTime, // start capped
                             publicSaleStartTime, // start public
                             publicSaleEndTime /* end time */, {gas:4000000} ).then(function(instance){
        mockApproverContract = instance;
    });
  });
  

  it("before capped sale starts - sanity", function() {
    return mockApproverContract.contributorCap(accounts[0]).then(function(result){
        assert.equal(result.valueOf(), 0, "unexpected cap");
        return mockApproverContract.contributorCap(accounts[1]);
    }).then(function(result){
        assert.equal(result.valueOf(), usersCap[1], "unexpected cap");
    });
  });
  
  it("before capped sale starts - eligible sanity", function() {
    var amount = new BigNumber(5);
    return mockApproverContract.eligible(accounts[0], amount ).then(function(result){
        assert.equal(result.valueOf(), 0, "unexpected cap");
        return mockApproverContract.eligible(accounts[1], amount);
    }).then(function(result){
        assert.equal(result.valueOf(), 0, "unexpected cap");
    });    
  });

  it("before capped sale starts - test and increment sanity", function() {
    var amount = new BigNumber(5);
    return mockApproverContract.testAndIncrement(accounts[0], amount ).then(function(result){
        assert.equal(result.logs[0].args.x.valueOf(), 0, "unexpected cap");
        return mockApproverContract.testAndIncrement(accounts[1], amount);
    }).then(function(result){
        assert.equal(result.logs[0].args.x.valueOf(), 0, "unexpected cap");
    });    
  });

  it("before capped sale starts - contributorCap", function() {
    return compareCaps( mockApproverContract, accounts );
  });
  
  it("before capped sale starts - eligible", function() {
    return testEligable( mockApproverContract, accounts, false, false );
  });

  it("fast forward to capped sale", function() {
    var fastForwardTime = cappedSaleStartTime - web3.eth.getBlock('latest').timestamp + 1;
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            var currentTime = web3.eth.getBlock('latest').timestamp;
            if( currentTime <= cappedSaleStartTime ) assert.fail( "current time is not as expected" );
        });
    });
  });



  // sanity starts
  it("in capped sale - sanity", function() {
    return mockApproverContract.contributorCap(accounts[0]).then(function(result){
        assert.equal(result.valueOf(), 0, "unexpected cap");
        return mockApproverContract.contributorCap(accounts[1]);
    }).then(function(result){
        assert.equal(result.valueOf(), usersCap[1], "unexpected cap");
    });
  });
  
  it("in capped sale starts - eligible sanity", function() {
    var amount = new BigNumber(5);
    return mockApproverContract.eligible(accounts[0], amount ).then(function(result){
        assert.equal(result.valueOf(), 0, "unexpected cap");
        return mockApproverContract.eligible(accounts[1], amount);
    }).then(function(result){
        assert.equal(result.valueOf(), amount.valueOf(), "unexpected cap");
        amount = amount.plus(usersCap[1]);
        return mockApproverContract.eligible(accounts[1], amount);
    }).then(function(result){
        assert.equal(result.valueOf(), usersCap[1].valueOf(), "unexpected cap");
    });    
  });

  it("in capped sale - test and increment sanity", function() {
    var amount = new BigNumber(5);
    return mockApproverContract.testAndIncrement(accounts[0], amount ).then(function(result){
        assert.equal(result.logs[0].args.x.valueOf(), 0, "unexpected cap");
        return mockApproverContract.testAndIncrement(accounts[1], amount);
    }).then(function(result){
        assert.equal(result.logs[0].args.x.valueOf(), amount.valueOf(), "unexpected cap");
        usersUsedCap[1] = usersUsedCap[1].add(result.logs[0].args.x);
        
        amount = amount.plus(usersCap[1]);
        return mockApproverContract.testAndIncrement(accounts[1], amount);
    }).then(function(result){
        var expectedAmount = usersCap[1].minus(usersUsedCap[1]);
        assert.equal(result.logs[0].args.x.valueOf(), expectedAmount.valueOf(), "unexpected cap");
        usersUsedCap[1] = usersUsedCap[1].add(result.logs[0].args.x);        
    });
  });
  // sanity ends

  


  it("in capped sale - contributorCap", function() {
    return compareCaps( mockApproverContract, accounts );
  });
  
  it("in capped sale - eligible", function() {
    return testEligable( mockApproverContract, accounts, true, false );
  });

  it("fast forward to capped sale middle", function() {
    var fastForwardTime = ( publicSaleStartTime - web3.eth.getBlock('latest').timestamp ) / 2;
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            var currentTime = web3.eth.getBlock('latest').timestamp;
            if( currentTime <= cappedSaleStartTime ) assert.fail( "current time is not as expected" );
            if( currentTime >= publicSaleStartTime ) assert.fail( "current time is not as expected" );
        });
    });
  });

  it("in capped sale - stress test", function() {
    return testEligbleInIterations( mockApproverContract, accounts, true, false, stressTestParam );
  });


  it("fast forward to uncapped sale start", function() {
    var fastForwardTime = ( publicSaleStartTime - web3.eth.getBlock('latest').timestamp ) + 1;
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            var currentTime = web3.eth.getBlock('latest').timestamp;
            if( currentTime <= publicSaleStartTime ) assert.fail( "current time is not as expected" );
        });
    });
  });


  // sanity
  it("in public sale - test and increment sanity", function() {
    var amount = usersCap[1].mul(2);
    return mockApproverContract.testAndIncrement(accounts[0], amount ).then(function(result){
        assert.equal(result.logs[0].args.x.valueOf(), 0, "unexpected cap");
        return mockApproverContract.testAndIncrement(accounts[1], amount);
    }).then(function(result){
        assert.equal(result.logs[0].args.x.valueOf(), amount.valueOf(), "unexpected cap");
        usersUsedCap[1] = usersUsedCap[1].add(result.logs[0].args.x);
    });
  });


  it("in public sale - contributorCap", function() {
    return compareCaps( mockApproverContract, accounts );
  });
  
  it("in public sale - eligible", function() {
    return testEligable( mockApproverContract, accounts, false, true );
  });


  it("fast forward to public sale middle", function() {
    var fastForwardTime = ( publicSaleEndTime - web3.eth.getBlock('latest').timestamp ) / 2;
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            var currentTime = web3.eth.getBlock('latest').timestamp;
            if( currentTime <= publicSaleStartTime ) assert.fail( "current time is not as expected" );
            if( currentTime >= publicSaleEndTime ) assert.fail( "current time is not as expected" );
        });
    });
  });

  it("in public sale - stress test", function() {
    return testEligbleInIterations( mockApproverContract, accounts, false, true, stressTestParam );
  });


  it("fast forward to sale end", function() {
    var fastForwardTime = ( publicSaleEndTime - web3.eth.getBlock('latest').timestamp ) + 1;
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            var currentTime = web3.eth.getBlock('latest').timestamp;
            if( currentTime <= publicSaleEndTime ) assert.fail( "current time is not as expected" );
        });
    });
  });
  
  it("after sale ends - eligible sanity", function() {
    var amount = new BigNumber(5);
    return mockApproverContract.eligible(accounts[0], amount ).then(function(result){
        assert.equal(result.valueOf(), 0, "unexpected cap");
        return mockApproverContract.eligible(accounts[1], amount);
    }).then(function(result){
        assert.equal(result.valueOf(), 0, "unexpected cap");
    });    
  });

  it("after sale ends - test and increment sanity", function() {
    var amount = new BigNumber(5);
    return mockApproverContract.testAndIncrement(accounts[0], amount ).then(function(result){
        assert.equal(result.logs[0].args.x.valueOf(), 0, "unexpected cap");
        return mockApproverContract.testAndIncrement(accounts[1], amount);
    }).then(function(result){
        assert.equal(result.logs[0].args.x.valueOf(), 0, "unexpected cap");
    });    
  });
  
  it("fast forward one week", function() {
    var fastForwardTime = 60 * 60 * 24 * 7;
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            var currentTime = web3.eth.getBlock('latest').timestamp;
            if( currentTime <= publicSaleEndTime ) assert.fail( "current time is not as expected" );
        });
    });
  });


  it("after public sale - stress test", function() {
    return testEligbleInIterations( mockApproverContract, accounts, false, false, stressTestParam );
  });
        
  // TODO - try to call testAndIncerement directly (and fail)
});
