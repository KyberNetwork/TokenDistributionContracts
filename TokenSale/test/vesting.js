var Token = artifacts.require("./KyberNetworkCrystal.sol");
var SimpleVesting = artifacts.require("./SimpleVesting.sol");
var BigNumber = require('bignumber.js');
var Helpers = require('./helpers.js');


var token;
var vesting;


var currentTime;
var oneYear;
var oneAndQuarterYears;
var oneAndHalfYears;
var oneAndThreeQuartersYears;
var twoYears;

var publicSaleStart;
var publicSaleEnd;

var vestedAmount = new BigNumber( 800 * 1000 );
var amountPerPeriod = [new BigNumber(400 * 1000),
                       new BigNumber(100 * 1000),
                       new BigNumber(100 * 1000),
                       new BigNumber(100 * 1000),
                       new BigNumber(100 * 1000)];

////////////////////////////////////////////////////////////////////////////////

var throwErrorMessage = function( error ) {
    if( error.message.search('invalid opcode') >= 0 ) return true;
    if( error.message.search('out of gas') >= 0 ) return true;    
    return false;    
};


////////////////////////////////////////////////////////////////////////////////

var tryToWithdraw = function( user, sender, period, shouldFail ) {
    return new Promise(function (fulfill, reject){
        var balanceBefore;
        return token.balanceOf(user).then(function(result){
            balanceBefore = result;
            return vesting.withdrawAfterPeriod(new BigNumber(period), {from: sender});            
        }).then(function(result){
            assert( ! shouldFail, "call is expected to fail");
            
            return token.balanceOf(user);
        }).then(function(result){
            var balanceAfter = result;
            var expectedBalance = balanceBefore.plus(amountPerPeriod[period]);
            
            assert.equal( expectedBalance.valueOf(), balanceAfter.valueOf(), "balance is not as expected");
            fulfill(true);
        }).catch(function(error){
            assert( shouldFail, "unexpected fail " + error);
            assert(throwErrorMessage(error), "expected throw, got " + error);
            fulfill(true);
        });
    });
};


////////////////////////////////////////////////////////////////////////////////


contract('simple vesting', function(accounts) {

  beforeEach(function(done){
    done();
  });
  afterEach(function(done){
    done();
  });

  it("mine one block to get current time", function() {
    return Helpers.sendPromise( 'evm_mine', [] );
  });

  it("deploy token", function() {
    var currentTime = web3.eth.getBlock('latest').timestamp;
    
    publicSaleStart = currentTime + 3600;
    
    var threeMonths = 90 * 24 * 60 * 60;
        
    oneYear = publicSaleStart + 365 * 24 * 60 * 60;
    
    oneAndQuarterYears = oneYear + threeMonths;
    oneAndHalfYears = oneAndQuarterYears + threeMonths;
    oneAndThreeQuartersYears = oneAndHalfYears + threeMonths;
    twoYears = oneAndThreeQuartersYears + threeMonths;
      
    return Token.new( (new BigNumber(10).pow(18)).mul(600 * 200 * 1000),
                      currentTime + 3600, currentTime + 3601, accounts[0], {from: accounts[0]}).then(function(instance){
        token = instance;
    });
  });
  
  it("deploy vesting", function() {
    return SimpleVesting.new(accounts[1], vestedAmount ,publicSaleStart, token.address ).then(function(instance){
        vesting = instance;
        return token.transfer(vesting.address, vestedAmount.plus(1), {from: accounts[0]});        
    }).then(function(){
        return vesting.withdrawTime(new BigNumber(1));
    }).then(function(time){
        console.log("2nd withdraw = " + time.valueOf());
    });
  });
  

  it("fast forward middle of the year", function() {
    var fastForwardTime = ( oneYear - web3.eth.getBlock('latest').timestamp ) / 2;
    fastForwardTime = Math.ceil(fastForwardTime);
    console.log(fastForwardTime);
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            console.log(web3.eth.getBlock('latest').timestamp);
        });
    });
  });



  it("try to withdraw before first period", function() {
    return tryToWithdraw( accounts[1], accounts[1], 0, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[2], 0, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 0, true );    
    });
  });
  
  it("try to withdraw before first period II", function() {
    return tryToWithdraw( accounts[1], accounts[1], 1, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[2], 1, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 1, true );    
    });
  });
  
  it("try to withdraw before first period III", function() {
    return tryToWithdraw( accounts[1], accounts[1], 2, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[2], 2, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 2, true );    
    });
  });

  it("try to withdraw before first period IV", function() {
    return tryToWithdraw( accounts[1], accounts[1], 3, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[2], 3, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 3, true );    
    });
  });

  it("try to withdraw in first period V", function() {
    return tryToWithdraw( accounts[1], accounts[2], 4, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[1], 4, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 4, true );    
    });
  });


  it("fast forward to one year", function() {
    var fastForwardTime = ( oneYear - web3.eth.getBlock('latest').timestamp ) + 1;
    fastForwardTime = Math.ceil(fastForwardTime);
    console.log(fastForwardTime);
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            console.log(web3.eth.getBlock('latest').timestamp);
        });
    });
  });

  it("try to withdraw in period", function() {
    return tryToWithdraw( accounts[1], accounts[2], 0, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[1], 0, false );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 0, true );    
    });
  });
  
  it("try to withdraw in first period II", function() {
    return tryToWithdraw( accounts[1], accounts[1], 1, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[2], 1, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 1, true );    
    });
  });
  
  it("try to withdraw in first period III", function() {
    return tryToWithdraw( accounts[1], accounts[1], 2, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[2], 2, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 2, true );    
    });
  });

  it("try to withdraw in first period IV", function() {
    return tryToWithdraw( accounts[1], accounts[1], 3, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[2], 3, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 3, true );    
    });
  });

  it("try to withdraw in first period V", function() {
    return tryToWithdraw( accounts[1], accounts[2], 4, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[1], 4, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 4, true );    
    });
  });
  
  
  it("fast forward to Q1 end", function() {
    var fastForwardTime = ( oneAndQuarterYears - web3.eth.getBlock('latest').timestamp ) + 1;
    fastForwardTime = Math.ceil(fastForwardTime);
    console.log(fastForwardTime);
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            console.log("time", web3.eth.getBlock('latest').timestamp);
        });
    });
  });

  it("try to withdraw in period", function() {
    return tryToWithdraw( accounts[1], accounts[2], 0, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[1], 0, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 0, true );    
    });
  });
  
  it("try to withdraw in first period II", function() {
    return tryToWithdraw( accounts[1], accounts[2], 1, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[1], 1, false );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 1, true );    
    });
  });
  

  it("try to withdraw in first period III", function() {
    return tryToWithdraw( accounts[1], accounts[1], 2, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[2], 2, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 2, true );    
    });
  });

  it("try to withdraw in first period IV", function() {
    return tryToWithdraw( accounts[1], accounts[1], 3, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[2], 3, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 3, true );    
    });
  });

  it("try to withdraw in first period V", function() {
    return tryToWithdraw( accounts[1], accounts[2], 4, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[1], 4, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 4, true );    
    });
  });


  it("fast forward to Q2 end", function() {
    var fastForwardTime = ( oneAndHalfYears - web3.eth.getBlock('latest').timestamp ) + 1;
    fastForwardTime = Math.ceil(fastForwardTime);
    console.log(fastForwardTime);
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            console.log("time", web3.eth.getBlock('latest').timestamp);
        });
    });
  });

  it("try to withdraw in period", function() {
    return tryToWithdraw( accounts[1], accounts[2], 0, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[1], 0, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 0, true );    
    });
  });
  
  it("try to withdraw in first period II", function() {
    return tryToWithdraw( accounts[1], accounts[2], 1, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[1], 1, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 1, true );    
    });
  });
  

  it("try to withdraw in first period III", function() {
    return tryToWithdraw( accounts[1], accounts[2], 2, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[1], 2, false );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 2, true );    
    });
  });

  it("try to withdraw in first period IV", function() {
    return tryToWithdraw( accounts[1], accounts[1], 3, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[2], 3, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 3, true );    
    });
  });

  it("try to withdraw in first period V", function() {
    return tryToWithdraw( accounts[1], accounts[2], 4, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[1], 4, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 4, true );    
    });
  });


  it("fast forward to Q3 end", function() {
    var fastForwardTime = ( oneAndThreeQuartersYears - web3.eth.getBlock('latest').timestamp ) + 1;
    fastForwardTime = Math.ceil(fastForwardTime);
    console.log(fastForwardTime);
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            console.log("time", web3.eth.getBlock('latest').timestamp);
        });
    });
  });

  it("try to withdraw in period", function() {
    return tryToWithdraw( accounts[1], accounts[2], 0, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[1], 0, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 0, true );    
    });
  });
  
  it("try to withdraw in first period II", function() {
    return tryToWithdraw( accounts[1], accounts[2], 1, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[1], 1, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 1, true );    
    });
  });
  

  it("try to withdraw in first period III", function() {
    return tryToWithdraw( accounts[1], accounts[2], 2, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[1], 2, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 2, true );    
    });
  });

  it("try to withdraw in first period IV", function() {
    return tryToWithdraw( accounts[1], accounts[2], 3, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[1], 3, false );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 3, true );    
    });
  });

  it("try to withdraw in first period V", function() {
    return tryToWithdraw( accounts[1], accounts[2], 4, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[1], 4, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 4, true );    
    });
  });


  it("fast forward to Q4 end", function() {
    var fastForwardTime = ( twoYears - web3.eth.getBlock('latest').timestamp ) + 1;
    fastForwardTime = Math.ceil(fastForwardTime);
    console.log(fastForwardTime);
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            console.log("time", web3.eth.getBlock('latest').timestamp);
        });
    });
  });

  it("try to withdraw in period", function() {
    return tryToWithdraw( accounts[1], accounts[2], 0, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[1], 0, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 0, true );    
    });
  });
  
  it("try to withdraw in first period II", function() {
    return tryToWithdraw( accounts[1], accounts[2], 1, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[1], 1, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 1, true );    
    });
  });
  

  it("try to withdraw in first period III", function() {
    return tryToWithdraw( accounts[1], accounts[2], 2, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[1], 2, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 2, true );    
    });
  });

  it("try to withdraw in first period IV", function() {
    return tryToWithdraw( accounts[1], accounts[2], 3, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[1], 3, true );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 3, true );    
    });
  });

  it("try to withdraw in first period V", function() {
    return tryToWithdraw( accounts[1], accounts[2], 4, true ).then(function(){
        // try different account
        return tryToWithdraw( accounts[1], accounts[1], 4, false );
    }).then(function(){
        // try withdrawing twice
        return tryToWithdraw( accounts[1], accounts[1], 4, true );    
    });
  });

    
});
