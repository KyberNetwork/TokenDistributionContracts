var WhiteList = artifacts.require("./KyberContirbutorWhitelist.sol");
var BigNumber = require('bignumber.js');
var Helpers = require('./../helpers.js');


var listContract;


var slackCapCode = new BigNumber(1);


var addresses = [ "0x34133870506af5d0644f41a2ee62cc387b811350",
                  "0x34133870506af5d0644f41a2ee62cc387b811351",
                  "0x34133870506af5d0644f41a2ee62cc387b811352",
                  "0x34133870506af5d0644f41a2ee62cc387b811353" ];
                  
var caps = [ slackCapCode, new BigNumber(10), new BigNumber(11), new BigNumber(0)];

var owner;
var nonOwner;

var slackCapAmount = new BigNumber(182);

////////////////////////////////////////////////////////////////////////////////



contract('white list', function(accounts) {

  beforeEach(function(done){
    done();
  });
  afterEach(function(done){
    done();
  });

  
  it("deploy contract", function() {
    owner = accounts[2];
    nonOwner = accounts[0];
    return WhiteList.new({from:owner,gas:4000000}).then(function(instance){
        listContract = instance;
    });
  });

  it("set slack cap", function() {
    return listContract.setSlackUsersCap(slackCapAmount, {from:owner}).then(function(){
        return listContract.slackUsersCap();
    }).then(function(result){
        assert.equal( result.valueOf(), slackCapAmount.valueOf(), "unexpected slack cap"); 
    });    
  });

  it("set slack cap from non-owner", function() {
    return listContract.setSlackUsersCap(slackCapAmount.plus(1), {from:nonOwner}).then(function(){
        assert.fail("set cap should fail");
    }).catch(function(error){
        assert( Helpers.throwErrorMessage(error), "expected throw got " + error);
        // check that value was not set
        return listContract.slackUsersCap();
    }).then(function(result){
        assert.equal( result.valueOf(), slackCapAmount.valueOf(), "unexpected slack cap");        
    });    
  });
  
  it("transfer ownership from non owner", function() {
    return listContract.transferOwnership(accounts[3], {from:nonOwner}).then(function(){
        assert.fail("set cap should fail");
    }).catch(function(error){
        assert( Helpers.throwErrorMessage(error), "expected throw got " + error);
        // check that value was not set
        return listContract.owner();
    }).then(function(result){
        assert.equal( result.valueOf(), owner.valueOf(), "unexpected owner");        
    });    
  });

  it("transfer ownership from owner", function() {
    return listContract.transferOwnership(accounts[3], {from:owner}).then(function(){
        owner = accounts[3];
        return listContract.owner();
    }).then(function(result){
        assert.equal( result.valueOf(), owner.valueOf(), "unexpected owner");        
    });    
  });
    
  it("list array", function() {
    return listContract.listAddresses(addresses,caps,{from:owner}).then(function(){
        return listContract.getCap(addresses[0]);        
    }).then(function(result){
        assert.equal(result.valueOf(), slackCapAmount.valueOf(), "unexpected cap");
        return listContract.getCap(addresses[1]);
    }).then(function(result){
        assert.equal(result.valueOf(), caps[1].valueOf(), "unexpected cap");
        return listContract.getCap(addresses[2]);        
    }).then(function(result){
        assert.equal(result.valueOf(), caps[2].valueOf(), "unexpected cap");
        return listContract.getCap(addresses[3]);        
    }).then(function(result){
        assert.equal(result.valueOf(), caps[3].valueOf(), "unexpected cap");    
    });
  });

  it("delist single", function() {
    caps[1] = new BigNumber(0);
    return listContract.listAddress(addresses[1],caps[1],{from:owner}).then(function(){
        return listContract.getCap(addresses[1]);        
    }).then(function(result){
        assert.equal(result.valueOf(), caps[1].valueOf(), "unexpected cap");
    });
  });

  it("list array from non owner", function() {
    return listContract.listAddresses(addresses,caps,{from:nonOwner}).then(function(){
        assert.fail("expected to fail");
    }).catch(function(error){
        assert( Helpers.throwErrorMessage(error), "expected throw got " + error);
    });
  });

  it("list single from non owner", function() {
    return listContract.listAddress(addresses[1],caps[1],{from:nonOwner}).then(function(){
        assert.fail("expected to fail");
    }).catch(function(error){
        assert( Helpers.throwErrorMessage(error), "expected throw got " + error);
    });
  });

  it("destroy from non owner", function() {
    return listContract.destroy({from:nonOwner}).then(function(){
        assert.fail("expected to fail");
    }).catch(function(error){
        assert( Helpers.throwErrorMessage(error), "expected throw got " + error);
    });
  });

  it("destroy from owner", function() {
    return listContract.destroy({from:owner});
  });
});
