let KNC = artifacts.require("KyberNetworkCrystal");

const assertFail = require("./helpers/assertFail");
const BigNumber = require("bignumber.js");

let knc;

let owner;

// Taken from Migrations
Date.prototype.getUnixTime = function() { return this.getTime()/1000|0 };
if(!Date.now) Date.now = function() { return new Date(); }
Date.time = function() { return Date.now().getUnixTime(); }


contract("KNC", function(accounts) {
  beforeEach(async () => {

    owner = accounts[0];
    var publicSaleStartTime = new Date('Sat, 16 Sep 2017 06:00:00 GMT').getUnixTime();
    var publicSaleEndTime = new Date('Sun, 24 Sep 2017 06:00:00 GMT').getUnixTime();

    knc = await KNC.new(
        226000000000000000000000000, //Initial supply
        publicSaleStartTime, //start
        publicSaleEndTime, //end
        owner //admin
    );


    await knc.transfer(accounts[1], 50000, {
      from: owner
    });

    await knc.transfer(accounts[2], 50000, {
      from: owner
    });

  });

  /*
  * Burn you own
  */
  it("User can burn their own tokens", async () => {
    await knc.burn(50000, {
      from: accounts[1]
    });
    assert.equal((await knc.balanceOf.call(accounts[1])).toNumber(), 0);
  });

  it("User shouldn't be able to burn more tokens than they have", async () => {
    await assertFail(async () => {
      await knc.burn(99999, {
        from: accounts[1]
      });
    });
  });

  it("User shouldn't be able to double burn their tokens", async () => {
    await knc.burn(50000, {
      from: accounts[1]
    });

    assert.equal((await knc.balanceOf.call(accounts[1])).toNumber(), 0);

    await assertFail(async () => {
      await knc.burn(50000, {
        from: accounts[1]
      });
    });
    
    assert.equal((await knc.balanceOf.call(accounts[1])).toNumber(), 0);
  });

  /*
  * Burn others
  */
  it("User can also burn allowed tokens", async () => {
    await knc.approve(owner, 50000, {
      from: accounts[1]
    });

    assert.equal((await knc.allowance(accounts[1], owner)).toNumber(), 50000);

    await knc.burnFrom(accounts[1], 50000, { 
      from: owner
    });

    assert.equal((await knc.balanceOf.call(accounts[1])).toNumber(), 0);
  });

  it("User shouldn't be able to double burn allowed tokens", async () => {
    await knc.approve(owner, 25000, {
      from: accounts[1]
    });

    assert.equal((await knc.allowance(accounts[1], owner)).toNumber(), 25000);

    await assertFail(async () => {
      await Promise.all([
        knc.burnFrom(accounts[1], 25000, { 
          from: owner
        }), 
        knc.burnFrom(accounts[1], 25000, { 
          from: owner
        })
      ]);
    });
  });

  it("User should not be able to burn tokens unless they're allowed to", async () => {
    await assertFail(async () => {
      await knc.burnFrom(accounts[0], 50000, { 
        from: accounts[1]
      });
    });
  });
});
