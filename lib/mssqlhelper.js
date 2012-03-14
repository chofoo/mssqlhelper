/*
@name:mssqlhelper                                                                                                           
@description:Microsoft SQL Server 数据库助手类
@author:yoyo@play175.com
TODO:
	1:连接池
	2:同时返回多个table
*/
var tds = require('./tds/tds');

var Helper = module.exports = exports = {
	options : {
		host: 'localhost'
		,port: 1433
		,userName: 'sa'
		,password: 'sapass'
		,database:'master'
		,poolSize:10
	}
	,conn : null
	,connected : -1
	,peddings:[]
	,config : function(options){
		var self = this;
		Object.keys(options).forEach(function(key) {
			self.options[key] && (self.options[key] = options[key]);
		});
		if(self.conn){
			try{self.conn.end();}catch(er){}
			self.connected = -1;
			self.flush(false);
		}
		self.conn = new tds.Connection(self.options);
		self.conn.on('error', function(error) {
		  console.error('Received error', error);
		  connected = 2;
		});
		self.conn.on('message', function(message) {
		  //console.info('Received info', message);
		});
		return self;
	}
	,flush : function(succ){
		var self = this;
		if(self.peddings.length>0)
		{
			var ped = self.peddings.shift();
			if(!succ){
				ped[0] = null;//数据库没有准备好，则一定返回错误
			}
			self.doExcute.apply(self,ped);
		}
	}
	,doExcute : function(sql,params,callback){
		var self = this;
		var tables = [];
		if(sql==null){
			callback({err:{code:1,msg:'connect database error'},tables:tables});
			return;
		}
		var stmt = self.conn.createStatement(sql, params);
		stmt.on('row', function(row) {
			if(tables.length==0){
				tables.push({rows:[]});
			}
			tables[0].rows.push(row);
		});
		var err;
		stmt.on('done', function(row) {
		  if(!err)callback({succ:true,tables:tables});
		  self.flush(true);
		});
		stmt.on('error', function(er) {
		  err = er;
		  callback({err:{code:1,msg:'execute sql '+sql+' error:'+er},tables:tables});
		});
		var paramsVals = {};
		params && Object.keys(params).forEach(function(key) {
			if(params[key].hasOwnProperty('value'))paramsVals[key] = params[key].value;
		});
		stmt.execute(paramsVals);
	}
	,excute : function(sql,params,callback){
		var self = this;
		self.peddings.push(arguments);
		if(self.connected==1) {
			//connect succ
		}else {
			if(self.connected==-1)//no connected
			{
				self.connected = 0;//connecting...
				self.conn.connect(function(error) {
					if (error != null) {
						self.connected = 2;//connect error
						console.error('mssqlhelper received error', error);
						self.flush(false);
					} else {
						self.connected = 1;
						//console.log('Now connected, can start using');
						if(self.options.database) {
							var stmt = self.conn.createStatement('use ' + self.options.database);
							stmt.on('done', function(row) {
							  self.flush(true);
							});
							stmt.execute({});
						}else{
							self.flush(true);
						}
					}
				});
			}
		}
	}
	,query : function(sql,params,callback){
		this.excute.apply(this,arguments);
	}
	,exec : function(sp,params,callback){
		//var declar = '';
		var sets = '';
		var pars = '';
		var sels = '';
		var outs = [];
		for (var pn in params) {
			var p = params[pn];
			p.name = pn;
			if(p.direction == Direction.OUT) {
				outs.push(p);
				//declar += 'declare @' + pn.replace('@','') + ' '+ p.type + '\n'; //sp的执行原理是把sp内的sql当作批次处理sql拿出来执行,所以不需要重复定义外部参数了
				sets += 'set @' + pn.replace('@','') + ' = \'' + p.value +'\'\n';
				if(sels.length==0){
					sels += 'select ';
				}else {
					sels += ',';
				}
				sels += '@' + pn.replace('@','') + ' ' + pn.replace('@','') + '';
				if(pars.length>0)pars+=',';
				pars += '@' + pn + ' = @' + pn.replace('@','') + ' output';
			}else{
				if(pars.length>0)pars+=',';
				pars += '@' + pn + ' = \'' + p.value+'\'';
			}
		}
		var sql = sets + 'exec ' + sp + ' ' + pars + '\n' + sels;
		//console.log(sql);
		this.excute(sql,params,function(res){
			if(res.err) {
				callback(res);
				return;
			}
			//console.log('execute ' + sp + ' succ');
			if(outs.length>0){
				var prow = res.tables[0].rows.pop();
				for (var i = 0; i < outs.length; i++) {
					var p = outs[i];
					p.value = prow.getValue(p.name);
				}
			}
			res.params = params;
//			for (var i = 0,len = res.tables[0].rows.length; i < len; i++) {
//				console.log(res.tables[0].rows[i].values.length);
//			}
			callback(res);
		});
	}
};

//Object.defineProperty(Helper.prototype, 'connection', {
//    get: function () {
//        return this.getLength();
//    }
//});


var Direction = module.exports.Direction = exports.Direction = {
	IN:'in'
	,OUT:'out'
	,INOUT:'inout'
	,RETURN:'return'
};