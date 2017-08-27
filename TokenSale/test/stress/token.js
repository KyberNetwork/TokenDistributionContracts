var Token = artifacts.require("./KyberNetworkCrystal.sol");
var BigNumber = require('bignumber.js');
var Helpers = require('./../helpers.js');


var getUserIndex = function( accounts, user ) {
    for( var i = 0 ; i < accounts.length ; i++ ) {
        if( accounts[i] == user ) return i;
    }    
};

var interestingTrasfer = 0;
var interestingTrasferFrom = 0;
var interestingBurn = 0;
var interestingBurnFrom = 0;

var userAccounts = [];

var getRandomUserAccount = function() {
    var pivot = Helpers.getRandomInt(0, userAccounts.length);
    return userAccounts[pivot];
};
 
 
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
        var index = getUserIndex( this.accounts, beneficiary.address );
        this.approvalToUser[index] = this.approvalToUser[index].minus(new BigNumber(amount));                
    };
    
    this.setApprove = function( amount, beneficiary ) {
        var index = getUserIndex( this.accounts, beneficiary.address );
        this.approvalToUser[index] = amount;
    };
    
    this.getApproved = function( beneficiary ) {
        var index = getUserIndex( this.accounts, beneficiary.address );
        return this.approvalToUser[index];        
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
            assert.equal(result.valueOf(), item.approvalAmount.valueOf(), "unexpected allowance for pair "
            + item.address.valueOf() + " " + item.approvalUserAddress.valueOf() );
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
    
    console.log("Transfer: from: " + sender.address.valueOf() + 
                " to: " + reciver.address.valueOf() + 
                " value: " + amount.toString(10) +
                " | " + (shouldFail ? "fail" : "pass"));
    
    if( ! shouldFail && amount.greaterThan(1) ) {
        interestingTrasfer++;        
    }
    
    return new Promise(function (fulfill, reject){
        return tokenContract.transfer( reciver.address, amount, {from: sender.address} ).then(function(result){
            if( shouldFail ) {
                assert.fail("expecting transfer to fail");
            }
            
            assert.equal(result.logs.length, 1, "expected a single event");
            var log = result.logs[0];            
            assert.equal(log.event, "Transfer", "unexpected event");
            assert.equal(log.args._from.valueOf(), sender.address.valueOf(), "unexpected from address");
            assert.equal(log.args._to.valueOf(), reciver.address.valueOf(), "unexpected to address");
            assert.equal(log.args._value.valueOf(), amount.valueOf(), "unexpected amount");         

            sender.decreaseBalance( amount );
            reciver.increaseBalance( amount );
                        
            return testTokenConsistency( tokenContract, userAccounts );
        }).then(function(result){
            assert.ok( result, "consistency failed");
            fulfill(true);
        }).catch(function(err){
            if( ! shouldFail ) console.log(err);        
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
    if( ! spender.canTransfer( amount ) ) {
        console.log( "cannot transfer" );
        shouldFail = true;
    }
    if( ! spender.isApproved(sender, amount) ) {
        console.log( "cannot approve" );    
        shouldFail = true;
    }
    if( inICO && (sender.address !== tokenAdmin ) ) shouldFail = true;

    console.log("TransferFrom: from: " + spender.address.valueOf() + 
                " to: " + reciver.address.valueOf() + 
                " sender: " + sender.address.valueOf() + 
                " value: " + amount.toString(10) +
                " | " + (shouldFail ? "fail" : "pass"));


    if( ! shouldFail && amount.greaterThan(1) ) {
        interestingTrasferFrom++;        
    }

    
    return new Promise(function (fulfill, reject){
        return tokenContract.transferFrom( spender.address, reciver.address, amount, {from: sender.address} ).then(function(result){
            if( shouldFail ) {
                assert.fail("expecting transferFrom to fail");
            }

            assert.equal(result.logs.length, 1, "expected a single event");
            var log = result.logs[0];            
            assert.equal(log.event, "Transfer", "unexpected event");
            assert.equal(log.args._from.valueOf(), spender.address.valueOf(), "unexpected from address");
            assert.equal(log.args._to.valueOf(), reciver.address.valueOf(), "unexpected to address");
            assert.equal(log.args._value.valueOf(), amount.valueOf(), "unexpected amount");
                     
            
            spender.decreaseApprove( amount, sender );

            spender.decreaseBalance( amount ); 
            reciver.increaseBalance( amount );
            
            return testTokenConsistency( tokenContract, userAccounts, spender );
        }).then(function(result){
            assert.ok( result, "consistency failed");
            fulfill(true);
        }).catch(function(err){
            if( ! shouldFail ) console.log(err);
            assert.ok( shouldFail, "transferFrom should not fail" );
            return testTokenConsistency( tokenContract, userAccounts );
        }).then(function(){
            fulfill(true);
        });        
    }).catch(function(err){
        reject(err);
    });  
};

//////////////////////////////////////////////////////////////////////////////////

var testApprove = function( tokenContract, userAccounts, sender, to, amount, inICO, tokenAdmin ) {
    var shouldFail = false;
    //if( inICO && (sender.address !== tokenAdmin ) ) shouldFail = true;
    if( sender.isApproved( to, new BigNumber(1) ) ) {
        if( ! amount.eq(new BigNumber(0)) ) shouldFail = true;
    }

    console.log("Approve: from: " + sender.address.valueOf() + 
                " to: " + to.address.valueOf() + 
                " value: " + amount.toString(10) +
                " | " + (shouldFail ? "fail" : "pass"));
    
    return new Promise(function (fulfill, reject){
        return tokenContract.approve( to.address, amount, {from: sender.address} ).then(function(result){
            if( shouldFail ) {
                assert.fail("expecting transfer to fail");
            }
            
            assert.equal(result.logs.length, 1, "expected a single event");
            var log = result.logs[0];            
            assert.equal(log.event, "Approval", "unexpected event");
            assert.equal(log.args._owner.valueOf(), sender.address.valueOf(), "unexpected owner address");
            assert.equal(log.args._spender.valueOf(), to.address.valueOf(), "unexpected spender address");
            assert.equal(log.args._value.valueOf(), amount.valueOf(), "unexpected amount");
            
            sender.setApprove( amount, to );
            return testTokenConsistency( tokenContract, userAccounts, sender );
        }).then(function(result){
            assert.ok( result, "consistency failed");
            fulfill(true);
        }).catch(function(err){
            if( ! shouldFail ) console.log(err);        
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
    if( inICO && (burner.address !== tokenAdmin ) ) shouldFail = true;

    console.log("Burn: from: " + burner.address.valueOf() + 
                " value: " + amount.toString(10) +
                " | " + (shouldFail ? "fail" : "pass"));


    if( ! shouldFail && amount.greaterThan(1) ) {
        interestingBurn++;        
    }

    
    return new Promise(function (fulfill, reject){
        return tokenContract.burn( amount, {from: burner.address} ).then(function(result){
            if( shouldFail ) {
                assert.fail("expecting transfer to fail");
            }
            
            assert.equal(result.logs.length, 1, "expected a single event");
            var log = result.logs[0];            
            assert.equal(log.event, "Burn", "unexpected event");
            assert.equal(log.args._burner.valueOf(), burner.address.valueOf(), "unexpected burner address");
            assert.equal(log.args._value.valueOf(), amount.valueOf(), "unexpected amount");         

            burner.decreaseBalance( amount );
            totalSupply = totalSupply.minus(amount);
            return testTokenConsistency( tokenContract, userAccounts );
        }).then(function(result){
            assert.ok( result, "consistency failed");
            fulfill(true);
        }).catch(function(err){
            if( ! shouldFail ) console.log(err);        
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
    
    console.log("BurnFrom: from: " + spender.address.valueOf() + 
                " sender: " + sender.address.valueOf() + 
                " value: " + amount.toString(10) +
                " | " + (shouldFail ? "fail" : "pass"));


    if( ! shouldFail && amount.greaterThan(1) ) {
        interestingBurnFrom++;        
    }

    
    return new Promise(function (fulfill, reject){
        return tokenContract.burnFrom( spender.address, amount, {from: sender.address} ).then(function(result){            
            if( shouldFail ) {
                assert.fail("expecting transferFrom to fail");
            }
            
            assert.equal(result.logs.length, 2, "expected a single event");
            var log = result.logs[0];            
            assert.equal(log.event, "Transfer", "unexpected event");
            assert.equal(log.args._from.valueOf(), spender.address.valueOf(), "unexpected from address");
            assert.equal(log.args._to.valueOf(), sender.address.valueOf(), "unexpected to address");
            assert.equal(log.args._value.valueOf(), amount.valueOf(), "unexpected amount");         

            var log = result.logs[1];
            assert.equal(log.event, "Burn", "unexpected event");
            assert.equal(log.args._burner.valueOf(), sender.address.valueOf(), "unexpected burner address");
            assert.equal(log.args._value.valueOf(), amount.valueOf(), "unexpected amount");
                
            spender.decreaseBalance( amount );
            spender.decreaseApprove( amount, sender );
            
            totalSupply = totalSupply.minus(amount);
            
            return testTokenConsistency( tokenContract, userAccounts );
        }).then(function(result){
            assert.ok( result, "consistency failed");
            fulfill(true);
        }).catch(function(err){
            if( ! shouldFail ) console.log(err);        
            assert.ok( shouldFail, "testBurnFrom should not fail" );
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
var opCounter = 0;
var getRandomOp = function( tokenContract, userAccounts, inICO, tokenAdmin ) {
    return new Promise(function (fulfill, reject){
        var randOp = Helpers.getRandomInt(0, 7);
        var sender;
        var spender;
        var amountToSend;
        var recipient;
        console.log( "op: " + opCounter++ + " | " + interestingTrasfer.toString() +  "/"
        + interestingTrasferFrom.toString() + "/" + interestingBurn.toString() + "/"
        + interestingBurnFrom.toString());
        
        var tryHard = (Helpers.getRandomInt(0, 2) > 0);

                
        switch( randOp ) {
            case 0:
            case 3:
            case 5:
            case 6:
                // transfer operation or burn
                sender = getRandomUserAccount();
                recipient = getRandomUserAccount(); // it is ok to send to self
                
                if( tryHard ) {
                    var cntr = 0;
                    do {
                        sender = getRandomUserAccount();                        
                        if( ! sender.balance.eq(new BigNumber(0) ) ) break;
                                                
                    } while( cntr++ < 1000 );                
                }
                
                // 0, random up to value, completely random (will likely to exceed balance
                switch( Helpers.getRandomInt(0, 10) ) {
                    case 0:
                        amountToSend = new BigNumber(0);
                        break;
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                    case 7:
                        amountToSend = Helpers.getRandomBigIntCapped(sender.balance);                        
                        break;
                    case 8:
                    case 9:
                        amountToSend = Helpers.getRandomBigInt();                        
                        break;
                    default:
                        assert.fail("unexpected op");
                        break;
                }
                
                if( randOp !== 3 ) {
                     return testTransfer( tokenContract, userAccounts, sender, recipient, amountToSend, inICO, tokenAdmin ).then(function(){fulfill(true);});
                }
                else {
                    return testBurn( tokenContract, userAccounts, sender, amountToSend, inICO, tokenAdmin ).then(function(){fulfill(true);});
                }
                    
                break;
                    
            case 1:
            case 4:
                // transfer from or burn from
                spender = getRandomUserAccount();
                recipient = getRandomUserAccount(); // it is ok to send to self
                sender = getRandomUserAccount();

                var guaranteedAmount = new BigNumber(0); 

                if( tryHard ) {
                    // choose only spender that can spend
                    console.log( "looking for pair" );
                    var cntr = 0;
                    do {
                        sender = getRandomUserAccount();
                        spender = getRandomUserAccount();
                        
                        if( ! spender.getApproved(sender).eq( new BigNumber(0) ) ) {
                            if( ! spender.balance.eq(new BigNumber(0) ) ) {
                                guaranteedAmount = BigNumber.min(spender.getApproved(sender),spender.balance);
                                console.log( "found pair" );
                                console.log(spender.address.valueOf());
                                console.log(sender.address.valueOf());
                                console.log(spender.getApproved(sender).toString(10));                            
                                break;
                            }
                        }
                                                
                    } while( cntr++ < 1000 );
                }


                // random up to value, all value, completely random (will likely fail)
                if( tryHard ) {
                    amountToSend = Helpers.getRandomBigIntCapped(guaranteedAmount);  
                }
                else {
                        
                    switch( Helpers.getRandomInt(0, 6) ){
                        case 0:
                        case 1:
                        case 2:
                            amountToSend = Helpers.getRandomBigIntCapped(spender.getApproved(sender));
                            break;
                        case 3:
                        case 4:
                            amountToSend = spender.getApproved(sender);
                            break;
                        case 5:
                            amountToSend = Helpers.getRandomBigInt();
                            break;
                        default:
                            assert.fail("unexepected op");
                            break;
                    }
                }
                    

                                        
                if( randOp === 1 ) {
                    return testTransferFrom( tokenContract, userAccounts, sender, spender, recipient, amountToSend, inICO, tokenAdmin ).then(function(){fulfill(true);});
                }
                else {
                    return testBurnFrom ( tokenContract, userAccounts, sender, spender, amountToSend, inICO, tokenAdmin ).then(function(){fulfill(true);});
                }
                    
                break;
                
            case 2:
                // approve
                sender = getRandomUserAccount();
                spender = getRandomUserAccount();                
                
                var amount;
                    
                var randOpForAmount = Helpers.getRandomInt(0, 100);
                
                if( sender.getApproved(spender).eq( new BigNumber(0) ) ) {
                    if( Helpers.getRandomInt(0, 100) < 90 ) {
                        if( randOpForAmount < 50 ) {
                            amount = Helpers.getRandomBigIntCapped(sender.balance);                            
                        }
                        else {
                            amount = Helpers.getRandomBigInt();
                        }
                    }
                    else {
                        amount = new BigNumber(0);
                    }
                }
                else {
                    if( Helpers.getRandomInt(0, 100) < 50 ) {
                        amount = new BigNumber(0);
                    }
                    else {
                        amount = Helpers.getRandomBigIntCapped(sender.balance);
                    }
                    
                }
                                    
                return testApprove( tokenContract, userAccounts, sender, spender, amount, inICO, tokenAdmin ).then(function(){fulfill(true);});
            default:
                reject("unexpected rand op");
                break;
        }
    });
};


////////////////////////////////////////////////////////////////////////////////

var stressTest = function( tokenContract, userAccounts, inICO, tokenAdmin, numIterations ){
    return new Promise(function (fulfill, reject){
        var inputs = [];
        
        for (var i = 0 ; i < numIterations ; i++ ) {
            inputs.push(i);
        }
        
       return inputs.reduce(function (promise, item) {
        return promise.then(function () {
            // check user balance
            return getRandomOp( tokenContract, userAccounts, inICO, tokenAdmin );
        });

        }, Promise.resolve()).then(function(){
            fulfill(true);
        }).catch(function(err){
            reject(err);
        });        
    });
};        

////////////////////////////////////////////////////////////////////////////////

var tokenContract;
var saleStartTime;
var saleEndTime;

var tokenOwner;
var tokenAdmin;

var tokenOwnerAccount;
var nonOwnerAccount;

////////////////////////////////////////////////////////////////////////////////

contract('token contract', function(accounts) {

  beforeEach(function(done){
    done();
  });
  afterEach(function(done){
    done();
  });

  it("mine one block to get current time", function() {
    return Helpers.sendPromise( 'evm_mine', [] );
  });

  it("deploy token and init accounts", function() {
    tokenOwner = Helpers.getRandomAccount(accounts);
    tokenAdmin = Helpers.getRandomAccount(accounts);
    
    var currentTime = web3.eth.getBlock('latest').timestamp;

    saleStartTime = currentTime + 3600; // 1 hour from now
    saleEndTime = saleStartTime + 24 * 60 * 60; // 24 hours sale

    console.log("current time = " + currentTime.toString());
    console.log("saleStartTime time = " + saleStartTime.toString());
    console.log("saleEndTime time = " + saleEndTime.toString());
        
    return Token.new(totalSupply, saleStartTime,saleEndTime, tokenAdmin, {from: tokenOwner}).then(function(result){
        tokenContract = result;
        initUserAccounts( accounts, tokenOwner );
        
        tokenOwnerAccount = userAccounts[getUserIndex( accounts, tokenOwner )];
        
        console.log("owner = " + tokenOwnerAccount.address.valueOf());
        
        nonOwnerAccount = userAccounts[0];
        if( nonOwnerAccount.address == tokenOwnerAccount.address ) nonOwnerAccount = userAccounts[1];  
                
        return testTokenConsistency( tokenContract, userAccounts );
    });
  });

  it("transfer before token sale", function() {
    return testTransfer( tokenContract, userAccounts, tokenOwnerAccount, nonOwnerAccount, new BigNumber(89), false, tokenOwner );
  });

  it("approve before token sale", function() {
    return testApprove( tokenContract, userAccounts, tokenOwnerAccount, nonOwnerAccount, new BigNumber(10), false, tokenOwner );
  });

  it("burn from before token sale", function() {
    return testBurnFrom( tokenContract, userAccounts, nonOwnerAccount, tokenOwnerAccount, new BigNumber(2), false, tokenAdmin );  
  });

  it("transfer from before token sale", function() {
    return testTransferFrom( tokenContract, userAccounts, nonOwnerAccount, tokenOwnerAccount, userAccounts[2], new BigNumber(3), false, tokenAdmin );
  });

  it("burn before token sale", function() {
    return testBurn( tokenContract, userAccounts, nonOwnerAccount, new BigNumber(2), false, tokenAdmin );  
  });

  it("stress before ICO starts", function() {
    this.timeout(6000000);
    return stressTest( tokenContract, userAccounts, false, tokenOwner, 500 ).then(function(){
        console.log( interestingTrasfer );
        console.log( interestingTrasferFrom );        
    
        console.log( interestingBurn );
        console.log( interestingBurnFrom );
    });
  });


  it("fast forward to token sale", function() {
    var fastForwardTime = saleStartTime - web3.eth.getBlock('latest').timestamp + 1;
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            var currentTime = web3.eth.getBlock('latest').timestamp;
            if( currentTime <= saleStartTime ) assert.fail( "current time is not as expected" );
        });
    });
  });



  it("transfer in token sale, non owner", function() {
    return testTransfer( tokenContract, userAccounts, nonOwnerAccount, tokenOwnerAccount, new BigNumber(1), true, tokenOwner );
  });

  it("approve in token sale", function() {
    return testApprove( tokenContract, userAccounts, tokenOwnerAccount, nonOwnerAccount, new BigNumber(10), true, tokenOwner );
  });

  it("burn from in token sale, non owner", function() {
    return testBurnFrom( tokenContract, userAccounts, nonOwnerAccount, tokenOwnerAccount, new BigNumber(2), true, tokenOwner );  
  });

  it("transfer from in token sale, non owner", function() {
    return testTransferFrom( tokenContract, userAccounts, nonOwnerAccount, tokenOwnerAccount, userAccounts[2], new BigNumber(3), true, tokenOwner );
  });

  it("burn in token sale, non owner", function() {
    return testBurn( tokenContract, userAccounts, nonOwnerAccount, new BigNumber(2), true, tokenOwner );  
  });


  it("transfer in token sale, owner", function() {
    return testTransfer( tokenContract, userAccounts, tokenOwnerAccount, nonOwnerAccount, new BigNumber(1), true, tokenOwner );
  });

  it("approve in token sale", function() {
    return testApprove( tokenContract, userAccounts, nonOwnerAccount, tokenOwnerAccount, new BigNumber(10), true, tokenOwner );
  });

  it("burn from in token sale, owner", function() {
    return testBurnFrom( tokenContract, userAccounts, tokenOwnerAccount, nonOwnerAccount, new BigNumber(2), true, tokenOwner );  
  });

  it("transfer from in token sale, owner", function() {
    return testTransferFrom( tokenContract, userAccounts, tokenOwnerAccount, nonOwnerAccount, userAccounts[2], new BigNumber(3), true, tokenOwner );
  });

  it("burn in token sale, owner", function() {
    return testBurn( tokenContract, userAccounts, tokenOwnerAccount, new BigNumber(2), true, tokenOwner );  
  });

  it("stress in token sale", function() {
    this.timeout(6000000);
    return stressTest( tokenContract, userAccounts, true, tokenOwner, 500 ).then(function(){
        console.log( interestingTrasfer );
        console.log( interestingTrasferFrom );        
    
        console.log( interestingBurn );
        console.log( interestingBurnFrom );
    });
  });



  it("fast forward to end of token sale", function() {
    var fastForwardTime = saleEndTime - web3.eth.getBlock('latest').timestamp + 1;
    return Helpers.sendPromise( 'evm_increaseTime', [fastForwardTime] ).then(function(){
        return Helpers.sendPromise( 'evm_mine', [] ).then(function(){
            var currentTime = web3.eth.getBlock('latest').timestamp;
            if( currentTime <= saleEndTime ) assert.fail( "current time is not as expected" );
        });
    });
  });

    
  it("transfer in token sale, non owner", function() {
    return testTransfer( tokenContract, userAccounts, nonOwnerAccount, tokenOwnerAccount, new BigNumber(1), false, tokenOwner );
  });

  it("approve in token sale", function() {
    return testApprove( tokenContract, userAccounts, tokenOwnerAccount, nonOwnerAccount, new BigNumber(10), false, tokenOwner );
  });

  it("burn from in token sale, non owner", function() {
    return testBurnFrom( tokenContract, userAccounts, nonOwnerAccount, tokenOwnerAccount, new BigNumber(2), false, tokenOwner );  
  });

  it("transfer from in token sale, non owner", function() {
    return testTransferFrom( tokenContract, userAccounts, nonOwnerAccount, tokenOwnerAccount, userAccounts[2], new BigNumber(3), false, tokenOwner );
  });

  it("burn in token sale, non owner", function() {
    return testBurn( tokenContract, userAccounts, nonOwnerAccount, new BigNumber(2), false, tokenOwner );  
  });


  it("transfer in token sale, owner", function() {
    return testTransfer( tokenContract, userAccounts, tokenOwnerAccount, nonOwnerAccount, new BigNumber(1), false, tokenOwner );
  });

  it("approve in token sale", function() {
    return testApprove( tokenContract, userAccounts, nonOwnerAccount, tokenOwnerAccount, new BigNumber(10), false, tokenOwner );
  });

  it("burn from in token sale, owner", function() {
    return testBurnFrom( tokenContract, userAccounts, tokenOwnerAccount, nonOwnerAccount, new BigNumber(2), false, tokenOwner );  
  });

  it("transfer from in token sale, owner", function() {
    return testTransferFrom( tokenContract, userAccounts, tokenOwnerAccount, nonOwnerAccount, userAccounts[2], new BigNumber(3), false, tokenOwner );
  });

  it("burn in token sale, owner", function() {
    return testBurn( tokenContract, userAccounts, tokenOwnerAccount, new BigNumber(2), false, tokenOwner );  
  });

  it("stress after token sale", function() {
    this.timeout(6000000);
    return stressTest( tokenContract, userAccounts, false, tokenOwner, 1000 ).then(function(){
        console.log( interestingTrasfer );
        console.log( interestingTrasferFrom );        
    
        console.log( interestingBurn );
        console.log( interestingBurnFrom );
    });
  });
    
});
// TODO - check mint token by all


