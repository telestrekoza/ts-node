(function() {

var P = function() {
    this.cfg = {
        port: 80,
        headers: {
            "User-Agent": "NodeJS Pusher: telestrekoza node",
            "Content-Type": "application/x-www-form-urlencoded",
            "Connection": "close",
            "Keep-Alive": "",
            "Accept": "text/json",
            'Content-Type': 'text/json',
            "Accept-Charset": "UTF8",
            "Content-length": 0
        }
    };
    this.req = null;
};
    
var p = new P();
P.METHOD = 'POST';

P.init = function(userConfig) {
    var headers = Base.mix(p.cfg.headers, userConfig.headers, true),
        cfg = Base.mix(p.cfg, userConfig, true);
    
    cfg.headers = headers;
    p.cfg = cfg;
    
    if(!p.req || userConfig.headers || userConfig.port) {
        var http = require('http');
        if(p.req)
            delete p.req;
        p.req = new http.createClient( cfg.port, cfg.headers.host);
    }
};

P.get = function() {
    return p.cfg;
};

P.publish = function(req, callback, _scope) {
    if(!p.req)
        return false;
    var headers = p.cfg.headers,
        request,
        reqString = (typeof req === 'string') ? req : JSON.stringify(req);
    headers["Content-length"] = reqString.length;
    
    //var sys = require('util');
    //sys.log(sys.inspect(p.req));
    //sys.log(sys.inspect(reqString));
    
    request = p.req.request(P.METHOD, p.cfg.url, headers);
    request.write(reqString);
    request.end();
    if(callback) {
        request.on('response', Base.bind(callback, _scope ? _scope : null));
    }
    return true;
};

exports.Publisher = P;
})();