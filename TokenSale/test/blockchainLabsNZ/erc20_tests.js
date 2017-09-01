let KNC = artifacts.require("KyberNetworkCrystal");
const BigNumber = require("bignumber.js");
const assertFail = require("./helpers/assertFail");

let knc;

// Taken from Migrations
Date.prototype.getUnixTime = function() { return this.getTime()/1000|0 };
if(!Date.now) Date.now = function() { return new Date(); }
Date.time = function() { return Date.now().getUnixTime(); }

contract("KNC", function(accounts) {
  beforeEach(async () => {
    var publicSaleStartTime = new Date('Sat, 16 Sep 2017 06:00:00 GMT').getUnixTime();
    var publicSaleEndTime = new Date('Sun, 24 Sep 2017 06:00:00 GMT').getUnixTime();

    knc = await KNC.new(
        226000000000000000000000000, //Initial supply
        publicSaleStartTime, //start
        publicSaleEndTime, //end
        accounts[0] //admin
        )
  });

  // CREATION
  it("creation: should have imported an initial balance of 226000000000000000000000000 from the old Token", async () => {
    assert.equal(
      (await knc.balanceOf.call(accounts[0])).toNumber(),
      226000000000000000000000000
    );
  });

  // TRANSERS
  it("transfers: should transfer 226000000000000000000000000 to accounts[1] with accounts[0] having 226000000000000000000000000", async () => {
    watcher = knc.Transfer();
    await knc.transfer(accounts[1], 226000000000000000000000000, {
      from: accounts[0]
    });
    let logs = watcher.get();
    assert.equal(logs[0].event, "Transfer");
    assert.equal(logs[0].args._from, accounts[0]);
    assert.equal(logs[0].args._to, accounts[1]);
    assert.equal(logs[0].args._value.toNumber(), 226000000000000000000000000);
    assert.equal(await knc.balanceOf.call(accounts[0]), 0);
    assert.equal(
      (await knc.balanceOf.call(accounts[1])).toNumber(),
      226000000000000000000000000
    );
  });

  //Fails due to transfer throwing rather than returning 
  it("transfers: should fail when trying to transfer 226000000000000000000000001 to accounts[1] with accounts[0] having 226000000000000000000000000", async () => {
    await assertFail(async () => {
      await knc.transfer(
        accounts[1],
        new BigNumber(web3.toWei(226000000000000000000000001)),
        {
          from: accounts[0]
        }
      );
    });
    
    assert.equal(
      (await knc.balanceOf.call(accounts[0])).toNumber(),
      226000000000000000000000000
    );
  });

  // APPROVALS
  it("approvals: msg.sender should approve 100 to accounts[1]", async () => {
    watcher = knc.Approval();
    await knc.approve(accounts[1], 100, { from: accounts[0] });
    let logs = watcher.get();
    assert.equal(logs[0].event, "Approval");
    assert.equal(logs[0].args._owner, accounts[0]);
    assert.equal(logs[0].args._spender, accounts[1]);
    assert.strictEqual(logs[0].args._value.toNumber(), 100);

    assert.strictEqual(
      (await knc.allowance.call(accounts[0], accounts[1])).toNumber(),
      100
    );
  });

  it("approvals: msg.sender approves accounts[1] of 100 & withdraws 20 once.", async () => {
    watcher = knc.Transfer();
    await knc.approve(accounts[1], 100, { from: accounts[0] });

    assert.strictEqual((await knc.balanceOf.call(accounts[2])).toNumber(), 0);
    await knc.transferFrom(accounts[0], accounts[2], 20, {
      from: accounts[1]
    });

    var logs = watcher.get();
    assert.equal(logs[0].event, "Transfer");
    assert.equal(logs[0].args._from, accounts[0]);
    assert.equal(logs[0].args._to, accounts[2]);
    assert.strictEqual(logs[0].args._value.toNumber(), 20);

    assert.strictEqual(
      (await knc.allowance.call(accounts[0], accounts[1])).toNumber(),
      80
    );

    assert.strictEqual((await knc.balanceOf.call(accounts[2])).toNumber(), 20);
    await knc.balanceOf.call(accounts[0]);
    assert.equal(
      (await knc.balanceOf.call(accounts[0])).toNumber(),
      226000000000000000000000000
    );
  });

  it("approvals: msg.sender approves accounts[1] of 100 & withdraws 20 twice.", async () => {
    await knc.approve(accounts[1], 100, { from: accounts[0] });
    await knc.transferFrom(accounts[0], accounts[2], 20, {
      from: accounts[1]
    });
    await knc.transferFrom(accounts[0], accounts[2], 20, {
      from: accounts[1]
    });
    await knc.allowance.call(accounts[0], accounts[1]);

    assert.strictEqual(
      (await knc.allowance.call(accounts[0], accounts[1])).toNumber(),
      60
    );

    assert.strictEqual((await knc.balanceOf.call(accounts[2])).toNumber(), 40);

    assert.equal(
      (await knc.balanceOf.call(accounts[0])).toNumber(),
      226000000000000000000000000
    );
  });

  //should approve 100 of msg.sender & withdraw 50 & 60 (should fail).
  it("approvals: msg.sender approves accounts[1] of 100 & withdraws 50 & 60 (2nd tx should fail)", async () => {
    await knc.approve(accounts[1], 100, { from: accounts[0] });
    await knc.transferFrom(accounts[0], accounts[2], 50, {
      from: accounts[1]
    });
    assert.strictEqual(
      (await knc.allowance.call(accounts[0], accounts[1])).toNumber(),
      50
    );

    assert.strictEqual((await knc.balanceOf.call(accounts[2])).toNumber(), 50);

    assert.equal(
      (await knc.balanceOf.call(accounts[0])).toNumber(),
      226000000000000000000000000
    );
    await assertFail(async () => {
      await knc.transferFrom.call(accounts[0], accounts[2], 60, {
        from: accounts[1]
      });
    });
    assert.strictEqual((await knc.balanceOf.call(accounts[2])).toNumber(), 50);
    assert.equal(
      (await knc.balanceOf.call(accounts[0])).toNumber(),
      226000000000000000000000000
    );
  });

  it("approvals: attempt withdrawal from account with no allowance (should fail)", async () => {
    await assertFail(async () => {
      await knc.transferFrom.call(accounts[0], accounts[2], 60, {
        from: accounts[1]
      });
    });

    assert.equal(
      (await knc.balanceOf.call(accounts[0])).toNumber(),
      226000000000000000000000000
    );
  });

  it("approvals: msg.sender approves accounts[1] of 100 & withdraws 50 & 60 (2nd tx should fail)", async () => {
    await knc.approve(accounts[1], 100, { from: accounts[0] });
    await knc.transferFrom(accounts[0], accounts[2], 50, {
      from: accounts[1]
    });
    assert.strictEqual(
      (await knc.allowance.call(accounts[0], accounts[1])).toNumber(),
      50
    );

    assert.strictEqual((await knc.balanceOf.call(accounts[2])).toNumber(), 50);

    assert.equal(
      (await knc.balanceOf.call(accounts[0])).toNumber(),
      226000000000000000000000000
    );
    await assertFail(async () => {
      await knc.transferFrom.call(accounts[0], accounts[2], 60, {
        from: accounts[1]
      });
    });
    assert.strictEqual((await knc.balanceOf.call(accounts[2])).toNumber(), 50);
    assert.equal(
      (await knc.balanceOf.call(accounts[0])).toNumber(),
      226000000000000000000000000
    );
  });

  it("approvals: allow accounts[1] 100 to withdraw from accounts[0]. Withdraw 60 and then approve 0 & attempt transfer.", async () => {
    await knc.approve(accounts[1], 100, { from: accounts[0] });
    await knc.transferFrom(accounts[0], accounts[2], 60, {
      from: accounts[1]
    });
    await knc.approve(accounts[1], 0, { from: accounts[0] });
    await assertFail(async () => {
      await knc.transferFrom.call(accounts[0], accounts[2], 10, {
        from: accounts[1]
      });
    });
    assert.equal(
      (await knc.balanceOf.call(accounts[0])).toNumber(),
      226000000000000000000000000
    );
  });
});
