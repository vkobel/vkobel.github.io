function Contract(contractABI, contractAddress, web3, wallet){
    this.web3 = web3;
    this.contract = this.web3.eth.contract(contractABI).at(contractAddress);
    this._contractAddress = contractAddress;
    this._gasLimit = 90000;
    
    if(wallet != undefined){
        this.myAddress = wallet.getAddressString();
        this.wallet = wallet;
    }else{
        this.myAddress = this.web3.eth.coinbase;
        console.log(this.myAddress)
    }
}

Contract.prototype._createTransaction = function(value, fnName, paramsArray, callback){
    var txData = "0x";
    var self = this;

    if(fnName != undefined)
        txData = this.contract[fnName].getData.apply(this, paramsArray);
    
    var txCount = new Promise(function(ok, ko){
        self.web3.eth.getTransactionCount(self.myAddress, function(err, txCount){
            if(err) ko(err);
            ok(txCount);
        });
    });

    var gasPrice = new Promise(function(ok, ko){
        self.web3.eth.getGasPrice(function(err, gasPrice){
            if(err) ko(err);
            ok(self.web3.toHex(gasPrice));
        });
    });

    Promise.all([txCount, gasPrice]).then(function(out){
        var txParams = {
            nonce: out[0],
            gasPrice: out[1],
            gasLimit: self._gasLimit,
            to: self._contractAddress,
            value: value,
            data: txData,
            chainId: self.web3.version.network
        };
        console.log(txParams)
        callback(new EthJS.Tx(txParams)); 
    });
}

Contract.prototype.sendTransaction = function(value, fnName=null, callback, ...params){
    var self = this;

    if(this.wallet != undefined){
        this._createTransaction(value, fnName, params, function(tx){
            tx.sign(self.wallet.getPrivateKey());
            var serializedTx = "0x" + tx.serialize().toString("hex");
            self.web3.eth.sendRawTransaction(serializedTx, callback);
        });
    
    }else{
        params.push({value: value});
        params.push(callback);
        this.contract[fnName].apply(this, params);
    }
}

Contract.prototype.callOffchain = function(fnName, callback, ...params){
    params.push(callback);
    this.contract[fnName].apply(this, params);
}

