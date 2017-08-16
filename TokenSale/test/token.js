var Token = artifacts.require("./KyberNetworkCrystal.sol");
var BigNumber = require('bignumber.js');
var Helpers = require('./helpers.js');


var getUserIndex = function( accounts, user ) {
    for( var i = 0 ; i < accounts.length ; i++ ) {
        if( accounts[i] == user ) return i;
    }    
};

var userAccounts = [];
 
 
var totalSupply = (new BigNumber(10).pow(18)).mul(200000 * 600);
var tokenName = "Kyber Network Crystal";
var tokenSymbol = "KNC";
var tokenDecimals = new BigNumber(18);
 
 

function UserAccount( address, accounts ) {
    this.address = address;
    this.balance = new BigNumber(0);
    this.approvalToUser = [];
    for( var i = 0 ; i < accounts.length ; i++ ) this.approvalToUser.push(new BigNumber(0)); 
    this.accounts = accounts;
    
    this.canTransfer = function( amount ) {
        return this.balance.greaterThanOrEqualTo(new BigNumber(amount));
    };
    
    this.decreaseBalance = function( amount ) {
        assert.ok( this.canTransfer( amount ), "cannot decrease balance" );
        this.balance = this.balance.minus( new BigNumber( amount ) );        
    };
    
    this.increaseBalance = function( amount ) {
        this.balance = this.balance.add( new BigNumber( amount ) );        
    };
    
    this.isApproved = function( beneficiary, amount ) {
        var index = getUserIndex( this.accounts, beneficiary.address );
        return this.approvalToUser[index].greaterThanOrEqualTo(amount);       
    };
    
    this.decreaseApprove = function( amount, beneficiary ) {
        assert.ok( this.isApproved( beneficiary, amount ) );
        var index = getUserIndex( this.accounts, beneficiary );
        this.approvalToUser[index] = this.approvalToUser[index].minus(amount);                
    };
    
    this.setApprove = function( amount, beneficiary ) {
        var index = getUserIndex( this.accounts, beneficiary.address );
        this.approvalToUser[index] = amount;        
    };    
}

////////////////////////////////////////////////////////////////////////////////

var testTokenConsistency = function( tokenContract, userAccounts, specificAccountToCheck = null ) {
    return new Promise(function (fulfill, reject){
        function expectedUserState( userAddress, balance, approvalUser, approvalAmount ){
            this.address = userAddress;
            this.balance = balance;
            this.approvalUserAddress = approvalUser;
            this.approvalAmount = approvalAmount;
        }
    
        var calculatedSupply = new BigNumber(0);
        var inputs = [];
        
        for (var i = 0 ; i < userAccounts.length ; i++ ) {
            calculatedSupply = calculatedSupply.add(userAccounts[i].balance);
            if( specificAccountToCheck !== null && userAccounts[i].address == specificAccountToCheck.address )
            { 
                for(var j = 0 ; j < userAccounts.length ; j++ ) {
                    inputs.push(new expectedUserState(userAccounts[i].address,
                                                      userAccounts[i].balance,
                                                      userAccounts[j].address,
                                                      userAccounts[i].approvalToUser[j]));    
                }
            }
            else {
                var j = Helpers.getRandomInt(0, userAccounts.length );
                inputs.push(new expectedUserState(userAccounts[i].address,
                                                  userAccounts[i].balance,
                                                  userAccounts[j].address,
                                                  userAccounts[i].approvalToUser[j]));    
                
            }            
        }
        
       assert.equal(calculatedSupply.valueOf(), totalSupply.valueOf(), "unexected calculated total supply");
        
       return inputs.reduce(function (promise, item) {
        return promise.then(function () {
            // check user balance
            return tokenContract.balanceOf(item.address);
        }).then(function(result){
            assert.equal(result.valueOf(), item.balance.valueOf(), "unexpected user balance");
            return tokenContract.allowance(item.address, item.approvalUserAddress );
        }).then(function(result){
            assert.equal(result.valueOf(), item.approvalAmount.valueOf(), "unexpected allowance");
        }).catch(function(err){
            reject(err);
        });

        }, Promise.resolve()).then(function(){
            return tokenContract.totalSupply();
        }).then(function(result){
            assert.equal(result.valueOf(), calculatedSupply.valueOf(), "unexpected total supply");
            return tokenContract.name();
        }).then(function(result){
            assert.equal(result.valueOf(), tokenName.valueOf(), "unexpected token name");
            return tokenContract.symbol();
        }).then(function(result){
            assert.equal(result.valueOf(), tokenSymbol.valueOf(), "unexpected token sybmol");
            return tokenContract.decimals();
        }).then(function(result){
            assert.equal(result.valueOf(), tokenDecimals.valueOf(), "unexpected token decimals");
            fulfill(true);
        }).catch(function(err){
            reject(err);
        });        
    });
};

////////////////////////////////////////////////////////////////////////////////

var testTransfer = function( tokenContract, userAccounts, sender, reciver, amount, inICO, tokenAdmin ) {
    var shouldFail = false;
    if( ! sender.canTransfer( amount ) ) shouldFail = true;
    if( inICO && (sender.address !== tokenAdmin ) ) shouldFail = true;
    
    return new Promise(function (fulfill, reject){
        return tokenContract.transfer( reciver.address, amount, {from: sender.address} ).then(function(result){
            if( shouldFail ) {
                assert.fail("expecting transfer to fail");
            }
            
            assert.equal(result.logs.length, 1, "expected a single event");
            var log = result.logs[0];            
            assert.equal(log.event, "Transfer", "unexpected event");
            assert.equal(log.args.from.valueOf(), sender.address.valueOf(), "unexpected from address");
            assert.equal(log.args.to.valueOf(), reciver.address.valueOf(), "unexpected to address");
            assert.equal(log.args.value.valueOf(), amount.valueOf(), "unexpected amount");         

            sender.decreaseBalance( amount );
            reciver.increaseBalance( amount );
                        
            return testTokenConsistency( tokenContract, userAccounts );
        }).then(function(result){
            assert.ok( result, "consistency failed");
            fulfill(true);
        }).catch(function(err){
            assert.ok( shouldFail, "transfer should not fail" );
            return testTokenConsistency( tokenContract, userAccounts );
        }).then(function(){
            fulfill(true);
        });
    }).catch(function(err){
        reject(err);
    });  
};

////////////////////////////////////////////////////////////////////////////////

var testTransferFrom = function( tokenContract, userAccounts, sender, spender, reciver, amount, inICO, tokenAdmin ) {
    var shouldFail = false;
    if( ! spender.canTransfer( amount ) ) shouldFail = true;
    if( ! spender.isApproved(sender, amount) ) shouldFail = true;
    if( inICO && (sender.address !== tokenAdmin ) ) shouldFail = true;
    
    return new Promise(function (fulfill, reject){
        return tokenContract.transferFrom( spender.address, reciver.address, amount, {from: sender.address} ).then(function(result){
            if( shouldFail ) {
                assert.fail("expecting transferFrom to fail");
            }
            
            assert.equal(result.logs.length, 1, "expected a single event");
            var log = result.logs[0];            
            assert.equal(log.event, "Transfer", "unexpected event");
            assert.equal(log.args.from.valueOf(), spender.address.valueOf(), "unexpected from address");
            assert.equal(log.args.to.valueOf(), reciver.address.valueOf(), "unexpected to address");
            assert.equal(log.args.value.valueOf(), amount.valueOf(), "unexpected amount");         

            spender.decreaseBalance( amount );
            spender.decreaseApprove( amount, sender );
            reciver.increaseBalance( amount );
                        
            return testTokenConsistency( tokenContract, userAccounts, spender );
        }).then(function(result){
            assert.ok( result, "consistency failed");
            fulfill(true);
        }).catch(function(err){
            assert.ok( shouldFail, "transferFrom should not fail" );
            return testTokenConsistency( tokenContract, userAccounts );
        }).then(function(){
            fulfill(true);
        });        
    }).catch(function(err){
        reject(err);
    });  
};

////////////////////////////////////////////////////////////////////////////////

var testApprove = function( tokenContract, userAccounts, sender, to, amount, inICO, tokenAdmin ) {
    var shouldFail = false;
    if( inICO && (spender.address !== tokenAdmin ) ) shouldFail = true;
    if( sender.isApproved( to, new BigNumber(1) ) ) {
        if( ! amount.eq(new BigNumber(0)) ) shouldFail = true;
    }
    
    return new Promise(function (fulfill, reject){
        return tokenContract.approve( to.address, amount, {from: sender.address} ).then(function(result){
            if( shouldFail ) {
                assert.fail("expecting transfer to fail");
            }
            
            assert.equal(result.logs.length, 1, "expected a single event");
            var log = result.logs[0];            
            assert.equal(log.event, "Approval", "unexpected event");
            assert.equal(log.args.owner.valueOf(), sender.address.valueOf(), "unexpected owner address");
            assert.equal(log.args.spender.valueOf(), to.address.valueOf(), "unexpected spender address");
            assert.equal(log.args.value.valueOf(), amount.valueOf(), "unexpected amount");
            
            sender.setApprove( amount, to );
            return testTokenConsistency( tokenContract, userAccounts, sender );
        }).then(function(result){
            assert.ok( result, "consistency failed");
            fulfill(true);
        }).catch(function(err){
            assert.ok( shouldFail, "approve should not fail" );
            return testTokenConsistency( tokenContract, userAccounts );
        }).then(function(){
            fulfill(true);
        });
    }).catch(function(err){
        reject(err);
    });  
};


////////////////////////////////////////////////////////////////////////////////

var testBurn = function( tokenContract, userAccounts, burner, amount, inICO, tokenAdmin ) {
    var shouldFail = false;
    if( ! burner.canTransfer( amount ) ) shouldFail = true;
    if( inICO && (sender.address !== tokenAdmin ) ) shouldFail = true;
    
    return new Promise(function (fulfill, reject){
        return tokenContract.burn( amount, {from: burner.address} ).then(function(result){
            if( shouldFail ) {
                assert.fail("expecting transfer to fail");
            }
            
            assert.equal(result.logs.length, 1, "expected a single event");
            var log = result.logs[0];            
            assert.equal(log.event, "Burn", "unexpected event");
            assert.equal(log.args.burner.valueOf(), burner.address.valueOf(), "unexpected burner address");
            assert.equal(log.args.value.valueOf(), amount.valueOf(), "unexpected amount");         

            burner.decreaseBalance( amount );
            totalSupply = totalSupply.minus(amount);
            return testTokenConsistency( tokenContract, userAccounts );
        }).then(function(result){
            assert.ok( result, "consistency failed");
            fulfill(true);
        }).catch(function(err){
            assert.ok( shouldFail, "burn should not fail" );
            return testTokenConsistency( tokenContract, userAccounts );
        }).then(function(){
            fulfill(true);
        });
    }).catch(function(err){
        reject(err);
    });  
};

////////////////////////////////////////////////////////////////////////////////

var testBurnFrom = function( tokenContract, userAccounts, sender, spender, amount, inICO, tokenAdmin ) {

    var shouldFail = false;
    if( ! spender.canTransfer( amount ) ) shouldFail = true;
    if( ! spender.isApproved(sender, amount) ) shouldFail = true;
    if( inICO && (sender.address !== tokenAdmin ) ) shouldFail = true;
    return new Promise(function (fulfill, reject){
        return tokenContract.burnFrom( spender.address, amount, {from: sender.address} ).then(function(result){            
            if( shouldFail ) {
                assert.fail("expecting transferFrom to fail");
            }
            
            assert.equal(result.logs.length, 2, "expected a single event");
            var log = result.logs[0];            
            assert.equal(log.event, "Transfer", "unexpected event");
            assert.equal(log.args.from.valueOf(), spender.address.valueOf(), "unexpected from address");
            assert.equal(log.args.to.valueOf(), sender.address.valueOf(), "unexpected to address");
            assert.equal(log.args.value.valueOf(), amount.valueOf(), "unexpected amount");         

            var log = result.logs[1];
            assert.equal(log.event, "Burn", "unexpected event");
            assert.equal(log.args.burner.valueOf(), sender.address.valueOf(), "unexpected burner address");
            assert.equal(log.args.value.valueOf(), amount.valueOf(), "unexpected amount");         


            spender.decreaseBalance( amount );
            spender.decreaseApprove( amount, sender );
            reciver.increaseBalance( amount );
                        
            return testTokenConsistency( tokenContract, userAccounts );
        }).then(function(result){
            assert.ok( result, "consistency failed");
            fulfill(true);
        }).catch(function(err){
            assert.ok( shouldFail, "transferFrom should not fail" );
            return testTokenConsistency( tokenContract, userAccounts );
        }).then(function(){
            fulfill(true);
        });
    }).catch(function(err){
        reject(err);
    });  
};


////////////////////////////////////////////////////////////////////////////////

var initUserAccounts = function( accounts, ownerAccount ) {
    for (var i = 0 ; i < accounts.length ; i++ ) {
        userAccounts.push( new UserAccount( accounts[i], accounts ) );
        if( accounts[i] == ownerAccount ) {
            userAccounts[i].increaseBalance( totalSupply );    
        }
    }
};

////////////////////////////////////////////////////////////////////////////////

var tokenContract;
var saleStartTime;
var saleEndTime;

var tokenOwner;
var tokenAdmin;

var tokenOwnerAccount;

////////////////////////////////////////////////////////////////////////////////

contract('token contract', function(accounts) {

  beforeEach(function(done){
    done();
  });
  afterEach(function(done){
    done();
  });

  it("deploy token and init accounts", function() {
    tokenOwner = Helpers.getRandomAccount(accounts);
    tokenAdmin = Helpers.getRandomAccount(accounts);
    
    var currentTime = Math.floor( Date.now() / 1000 );
    saleStartTime = currentTime + 3600; // 1 hour from now
    saleEndTime = saleStartTime + 24 * 60 * 60; // 24 hours sale
    
    return Token.new(totalSupply, saleStartTime,saleEndTime, tokenAdmin, {from: tokenOwner}).then(function(result){
        tokenContract = result;
        initUserAccounts( accounts, tokenOwner );
        
        tokenOwnerAccount = userAccounts[getUserIndex( accounts, tokenOwner )]; 
                
        return testTokenConsistency( tokenContract, userAccounts );
    });
  });

  it("transfer before sale time", function() {
    return testTransfer( tokenContract, userAccounts, tokenOwnerAccount, userAccounts[0], new BigNumber(2), false, tokenOwner );
  });
  
  it("failing transfer from", function() {
    return testTransferFrom( tokenContract, userAccounts, userAccounts[0], userAccounts[1], userAccounts[2], new BigNumber(2), false, tokenOwner );
  });

  it("working approve", function() {
    return testApprove( tokenContract, userAccounts, userAccounts[0], userAccounts[1], new BigNumber(2), false, tokenOwner );
  });

  it("failing approve", function() {
    return testApprove( tokenContract, userAccounts, userAccounts[0], userAccounts[1], new BigNumber(2), false, tokenOwner );
  });


  it("failing burn from", function() {
    return testBurnFrom( tokenContract, userAccounts, userAccounts[0], userAccounts[1], new BigNumber(2), false, tokenOwner );  
  });


  it("succesful burn", function() {
    return testBurn( tokenContract, userAccounts, tokenOwnerAccount, new BigNumber(2), false, tokenOwner );
  });
  
  it("fail burn", function() {
    return testBurn( tokenContract, userAccounts, userAccounts[0], new BigNumber(3), false, tokenOwner );
  });  
    
});
