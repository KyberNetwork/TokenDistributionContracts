var BigNumber = require('bignumber.js');

module.exports.getRandomInt = function (min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
};

////////////////////////////////////////////////////////////////////////////////

module.exports.getRandomBigInt = function() {
    var string = "0x";
    for( var i = 0 ; i < 28 ; i++ ) {
        var rand = module.exports.getRandomInt(0,256);
        string += Number(rand).toString(16);
    }
    
    return (new BigNumber(string)).absoluteValue();
};

////////////////////////////////////////////////////////////////////////////////

module.exports.getRandomBigIntCapped = function( cap ) {
    var num = module.exports.getRandomBigInt();
    if( num.greaterThanOrEqualTo( cap ) ) {
        return (cap.minus(num)).absoluteValue();
    }
    else return num.absoluteValue();
};



////////////////////////////////////////////////////////////////////////////////

module.exports.getRandomAccount = function(accounts) {
    var numAccounts = accounts.length;
    return accounts[module.exports.getRandomInt(0,numAccounts)];
};

////////////////////////////////////////////////////////////////////////////////

module.exports.getRandomDifferentAccount = function(accounts, currentAccount ) {
    if( accounts.length <= 1 ) return null;
    var result;
    do {
        result = module.exports.getRandomAccount(accounts);
    } while( result == currentAccount );
    
    return result;
};

////////////////////////////////////////////////////////////////////////////////

module.exports.sendPromise = function(method, params) {
    return new Promise(function(fulfill, reject){
        web3.currentProvider.sendAsync({
          jsonrpc: '2.0',
          method,
          params: params || [],
          id: new Date().getTime()
        }, function(err,result) {
          if (err) {
            reject(err);
          }
          else {
            fulfill(result);
          }
        });
    });
};