/*
 * API call wrapper
 */

(function() {
var sys = require('util');

var T = function() {
    T.superclass.constructor.apply(this, arguments);
    this.controller  = null;
    
};

T.BASE_API_PATH = "./api-latest/";
T.API_FILE_EXT = ".js";
T.FORMAT_JSON = ".json";
T.DOMAIN = "node.kliopa.net";
T.MSG_BOOTSTRAP = "Telestrekoza API bootstrap";
T.MSG_AUTH_NEEDED = "Authorization is needed to use this service";
T.DEBUG = true;

Base.extend( T, Base.HtmlController );

T.prototype.doHeaders = function() {
    var DB = Base.loadFile('./util/db.js').DB,
	    db = new DB(null, null, 'prod'),
	    callback = {
	    	success: this._hasDB,
			failure: this._noDB,
			scope: this
	    };
    db.open(callback);
};

T.prototype._hasDB = function( err, db ) {
    var headers = this.req.headers,
    	auth = (headers || headers.authorization) ? headers.authorization : false;
	this.db = db;
	this._checkAuth(auth, this.getAuth, this);
};

T.prototype.getAuth = function(oauth) {
    //TODO:check too fast usage
    if(oauth) {
	    this._auth = oauth;
	    this._parseQuery( this.query );
		controllerType = (this._format == T.FORMAT_JSON) ? Base.JsonController : Base.HtmlController;
		this.controller = new controllerType(this.server, this.req, this.res, this.query);
		this.controller.doHeaders.call(this);
	} else {
	    var sys = require('util');
		sys.log("auth needed");
	    T.superclass.doHeaders.call(this);
	}
};

T.prototype.doBody = function() {
    var buf = T.MSG_BOOTSTRAP;
    if(this.query) {
    	//check auth
    	if(this._auth) {
    		//execute api request
    		buf = this.executeQuery(this._fileName, this._method, this.POST ? this.POST : this.GET);
    	} else
    		buf = T.MSG_AUTH_NEEDED;
    }
    this.res.write( this._formatResult( buf, this._format ));
    if(this.controller)
    	this.controller.doBody.call(this);
    else
    	T.superclass.doBody.call(this);
};

T.prototype._parseQuery = function( query ) {
	var url = require('url'),
		path = require('path'),
		_urlObj = url.parse(query, true),
		pathName = _urlObj.pathname;

	this._format = path.extname(pathName);
	this._fileName = path.dirname(pathName);
	this._method = path.basename(pathName,this._format);
	this._params = _urlObj.query;
};

T.prototype.executeQuery = function(  fileName, method, params) {
	var result,
	    API_Interface = Base.loadFile(T.BASE_API_PATH + 'api_interface.js'),
		API = Base.loadFile(T.BASE_API_PATH + fileName + T.API_FILE_EXT, API_Interface).API,
		ApiObject = API ? new API(this._auth) : null;
	
	if(ApiObject && ApiObject[method])
		try{
			result = ApiObject[method].apply(ApiObject, [params]);
			return result;
		} catch(e) { 
			if(T.DEBUG)
				return e;
			else
				return new Error("We catched error our side, sorry for that, please contact us and write a bug report.");
		}
	return new Error("Method not found");
};

T.prototype._parseAuthentification = function( data ) {
	var querystring = require('querystring'),
		oaData = data ? data.split('OAuth ')[1] : "",
		oaObject = oaData ? querystring.parse(oaData, ',') : null,
		key;
	for(key in oaObject) {
		oaObject[key] = oaObject[key].replace(/^\"(.*)\"$/, "$1");
	}
	return oaObject;
};

T.prototype._checkAuth = function(oauthString, callback, scope) {
	//TODO: use something like cookie, or sessions to cache this step
	var self = this,
        oauth = this._parseAuthentification(oauthString),
        ApiKeys = Base.loadFile('./models/apikeys.js').DBO,
        apiKey = new ApiKeys(this.db);
	
	apiKey.get( oauth.oauth_consumer_key, function( key ) {
	    if(!key) {
	        callback.call(scope ? scope : self, null);
	    }
	    
		var sign_org = oauth.oauth_signature,
		   method = oauth.oauth_signature_method;
		
		var signBase = Util.createSignBase(oauth, self.req, self.POST),
            sign = Util.createSignature( method, signBase, key.access_token_secret, key.secret);
		if(sign_org != sign) {
		   sys.log(sys.inspect(signBase));
		   sys.puts(sys.inspect(sign_org)+"\n"+sys.inspect(sign));
		} else {
		    oauth = Base.mix(oauth, key);
		}
		callback.call(scope ? scope : self, (sign_org == sign ) ? oauth : null);
	});
};

T.prototype._formatResult = function(result, format) {
	switch( format) {
		case T.FORMAT_JSON: result = JSON.stringify(result);
				break;
		default: break;
	}
	return result;
};

/*
 util static class
 copied from node-auth module
*/

var Util = {};

Util.createSignBase = function(_oauth, req, post) {
    var urlUtil = require('url'),
        oauth = _oauth;
        method = req.method,
        proto = 'http://',
        host = req.headers.host ? req.headers.host : T.DOMAIN,
        urlObject = urlUtil.parse(req.url, true),
        url = Util.encodeData(proto + host  + urlObject.pathname);
    
    delete oauth.oauth_signature;
    if(method == "GET" && urlObject.query) {
        oauth = Base.mix(oauth, urlObject.query);
    } else {
        oauth = Base.mix(oauth, post);
    }
    return [ method, url, Util.encodeData( Util.normaliseRequestParams(oauth) )].join('&');
};

Util.createSignature= function(method, signatureBase, tokenSecret, consumerSecret) {
    if( tokenSecret === undefined ) var tokenSecret= "";
    else tokenSecret= Util.encodeData( tokenSecret );
    // consumerSecret is already encoded
    var key= consumerSecret + "&" + tokenSecret,
        hash= ""
    if( method == "PLAINTEXT" ) {
        hash= Util.encodeData(key);
    } else {
        var sha1 = require('node-oauth/lib/sha1');
        hash= sha1.HMACSHA1(key, signatureBase);
    }
    
    return hash;
};

Util.encodeData= function(toEncode){
	if( !toEncode || toEncode == "" ) return "";
	else {
        var result= encodeURIComponent(toEncode);
		// Fix the mismatch between OAuth's  RFC3986's and Javascript's beliefs in what is right and wrong ;)
		return result.replace(/\!/g, "%21")
		          .replace(/\'/g, "%27")
		          .replace(/\(/g, "%28")
		          .replace(/\)/g, "%29")
		          .replace(/\*/g, "%2A");
		}
};

// Takes a literal in, then returns a sorted array
Util.sortRequestParams = function(argumentsHash) {
    var argument_pairs = [],
        key;
    for(key in argumentsHash ) {
        argument_pairs[argument_pairs.length]= [key, argumentsHash[key]];
    }
    // Sort by name, then value.
    argument_pairs.sort(function(a,b) {
        if ( a[0]== b[0] )  {
            return a[1] < b[1] ? -1 : 1;
        }
        else return a[0] < b[0] ? -1 : 1;
    });

    return argument_pairs;
};

Util.normaliseRequestParams = function(arguments) {
    var argument_pairs= Util.sortRequestParams( arguments ),
        args= [],
        length = argument_pairs.length,
        i;
   for(i=0;i<length;i++) {
       args[i] =  Util.encodeData( argument_pairs[i][0] ) + "=" + Util.encodeData( argument_pairs[i][1] );
   }
   return args.join('&');
};

export = T;

})();