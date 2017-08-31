var WhiteList = artifacts.require("./KyberContributorWhitelist.sol");
var BigNumber = require('bignumber.js');
var Helpers = require('./../helpers.js');


var listContract;


var slackCap = new BigNumber(1);


////////////////////////////////////////////////////////////////////////////////

var testListing = function( whiteListContract, user, cap, owner, nonOwner ) {
    return new Promise(function (fulfill, reject){
        console.log("testListing");
        var okScenarioPassed = false;

        return whiteListContract.listAddress(user,new BigNumber(cap),{from:owner}).then(function(result){
            // check event
            assert.equal(result.logs.length, 1, "expected a single event");
            var log = result.logs[0];
            assert.equal(log.event, "ListAddress", "unexpected event");
            assert.equal(log.args._user.valueOf(), user, "unexpected user");
            assert.equal(log.args._cap.valueOf(), cap, "unexpected cap");

            // check cap record
            return whiteListContract.getCap(user);
        }).then(function(result){
            assert.equal(result.valueOf(), cap, "unexpected cap");
            okScenarioPassed = true;
            // whitelist with non-owner
            return whiteListContract.listAddress(user,new BigNumber(cap)  * 2,{from: nonOwner});
        }).then(function(result){
            assert.fail("registering from non-owner should fail");
        }).catch(function(err){
            if( ! okScenarioPassed ) {
                console.log("list address unexpectedly failed");
                console.log(user);
                assert.fail("list address unexpectedly failed");
                reject(err);
            }

            // check that user cap was not changed
            return whiteListContract.getCap(user);
        }).then(function(result){
            assert.equal(result.valueOf(), cap, "unexpected cap");
            fulfill(true);
        }).catch(function(err){
            console.log(err);
            assert.fail("unexpected failure");
            reject(err);
        });
    });
};

////////////////////////////////////////////////////////////////////////////////

function TestListingInput( user, cap, owner, nonOwner ) {
    this.user = user;
    this.cap = cap;
    this.owner = owner;
    this.nonOwner = nonOwner;
}


////////////////////////////////////////////////////////////////////////////////

function TestTransferInput( owner, nonOwner, nextOwner ) {
    this.owner = owner;
    this.nonOwner = nonOwner;
    this.nextOwner = nextOwner;
}


////////////////////////////////////////////////////////////////////////////////

var multipleTestListing = function( whiteListContract, accounts, owner, numIterations ) {
    return new Promise(function (fulfill, reject){
        var inputs = [];

        for( var i = 0 ; i < numIterations ; i++ ) {
            var user = Helpers.getRandomAccount(accounts);
            var nonOwner = Helpers.getRandomDifferentAccount(accounts, owner);
            var cap = Helpers.getRandomBigInt();
            if( Helpers.getRandomInt(0, 4) === 0 ) {
                // test delist a lot
                cap = 0;
            }
            inputs.push(new TestListingInput(user, cap, owner, nonOwner));
        }

        // Create a new empty promise (don't do that with real people ;)
       return inputs.reduce(function (promise, item) {
        return promise.then(function () {
            var user = item.user;
            var nonOwner = item.nonOwner;
            var cap = item.cap;
            // Chain one computation onto the sequence
            return testListing(whiteListContract, user, cap, owner, nonOwner);
        });
        }, Promise.resolve()).then(function(){fulfill(true)});
    });
};


////////////////////////////////////////////////////////////////////////////////

var testTransfer = function( whiteListContract, owner, nonOwner, nextOwner ) {
    return new Promise(function (fulfill, reject){
        console.log("testTransfer");
        return whiteListContract.owner().then(function(result){
            assert.equal(result.valueOf(), owner, "owner is different than expected");
            // try to change owner as nonOwner
            return whiteListContract.transferOwnership(nextOwner,{from:nonOwner});
        }).then(function(result){
            assert.fail("ownership transfer should fail");
        }).catch(function(err){
            // check that ownership did not change
            return whiteListContract.owner();
        }).then(function(result){
            assert.equal(result.valueOf(), owner, "owner is different than expected");
            // change ownership as owner
            return whiteListContract.transferOwnership(nextOwner,{from:owner});
        }).then(function(result){
            return whiteListContract.owner();
        }).then(function(result){
           assert.equal(result.valueOf(), nextOwner, "owner is different than expected");
           fulfill(true);
        });
    });
};

////////////////////////////////////////////////////////////////////////////////

var multipleTransferTest = function( whiteListContract, accounts, owner, numTransferIterations, numListIterations ) {
    return new Promise(function (fulfill, reject){
        var currentOwner = owner;
        var inputs = [];

        for( var i = 0 ; i < numTransferIterations ; i++ ) {
            var nonOwner = Helpers.getRandomDifferentAccount(accounts, currentOwner);
            var nextOwner = Helpers.getRandomAccount(accounts); // could be the same owner
            inputs.push(new TestTransferInput( currentOwner, nonOwner, nextOwner ) );
            currentOwner = nextOwner;
        }

        // Create a new empty promise (don't do that with real people ;)
       return inputs.reduce(function (promise, item) {
        return promise.then(function () {
            return testTransfer(whiteListContract, item.owner, item.nonOwner, item.nextOwner).then(function(result){
                return multipleTestListing( whiteListContract, accounts, item.nextOwner, numListIterations );
            });
        });
        }, Promise.resolve()).then(function(){fulfill(true)});
    });
};

////////////////////////////////////////////////////////////////////////////////




////////////////////////////////////////////////////////////////////////////////



contract('white list', function(accounts) {

  beforeEach(function(done){
    done();
  });
  afterEach(function(done){
    done();
  });


  it("deploy contract", function() {
    return WhiteList.new({from:accounts[2],gas:4000000}).then(function(instance){
        listContract = instance;
    });
  });
  it("list", function() {
    return testListing( listContract, accounts[0], 19934, accounts[2], accounts[3] );
  });

  it("ownership", function() {
    return testTransfer( listContract, accounts[2], accounts[3], accounts[4] );
  });

  it("Stress test", function() {
    return multipleTransferTest( listContract, accounts, accounts[4], 12, 20 );
  });
});
